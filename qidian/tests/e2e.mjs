#!/usr/bin/env node
/**
 * 启点 · 真实浏览器端到端联调（E2E）
 * -------------------------------------
 * 用无头 Chrome + CDP 走一遍真实用户路径：首屏状态 → 文字提问 → 多轮追问 →
 * 拍照识题 → 核对确认 → 带图辅导 → 新问题重置 → 本地一元一次方程/错题本 →
 * 停止按钮与输入守卫 → 运行时错误汇总。
 *
 * 与 tests/api.test.mjs 的分工：
 *   - api.test.mjs     ：模拟上游，跑得快，覆盖接口契约与异常分支，不需要 Key。
 *   - 本文件（e2e.mjs）：真浏览器 + 真 DeepSeek，会消耗少量 API 额度，需先配好 Key。
 *
 * 前置：
 *   1. 另开一个终端在项目根目录运行 `npm run dev`（默认 http://127.0.0.1:5188）
 *   2. `npm run setup` 或访问 /setup 配好 DeepSeek API Key
 *
 * 用法：
 *   npm run e2e
 *   BASE=http://127.0.0.1:5199 npm run e2e
 *   CHROME=/path/to/chrome-headless-shell npm run e2e
 *
 * 依赖：Node 22+ 内置 WebSocket 与 fetch，无需安装任何 npm 包。
 * 题目照片在运行时用浏览器现场渲染生成，不依赖本地字体文件或图形库。
 */

import { spawn } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const BASE = (process.env.BASE || 'http://127.0.0.1:5188').replace(/\/$/, '');
const DEBUG_PORT = Number(process.env.CDP_PORT || 9339);

function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  try {
    const dir = fs.readdirSync(base)
      .filter(d => d.startsWith('chromium_headless_shell-')).sort().pop();
    if (dir) {
      const p = path.join(base, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* 没装 playwright 缓存 */ }
  for (const p of ['/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('找不到 Chrome：请用 CHROME=/path/to/chrome-headless-shell 指定');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = m => { pass++; console.log('  \x1b[32m✓\x1b[0m ' + m); };
const bad = m => { fail++; console.log('  \x1b[31m✗\x1b[0m ' + m); };
const step = t => console.log(`\n\x1b[1m── ${t}\x1b[0m`);

/* ---------- 前置检查：服务在跑、Key 已配 ---------- */
try {
  const r = await fetch(`${BASE}/api/status`, { signal: AbortSignal.timeout(5000) });
  const s = await r.json();
  if (!s.configured) {
    console.error(`\n✗ ${BASE} 上的服务还没配置 DeepSeek API Key。`);
    console.error(`  请先启动 npm run dev，再打开 ${BASE}/setup 完成配置。\n`);
    process.exit(1);
  }
} catch (e) {
  console.error(`\n✗ 连不上 ${BASE}（${e.message}）。`);
  console.error('  请先在项目根目录另开一个终端运行 npm run dev。\n');
  process.exit(1);
}

/* ---------- 启动浏览器并连上 CDP ---------- */
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qidian-e2e-'));
const questionImage = path.join(profileDir, 'question.png');
const chrome = spawn(findChrome(), [
  '--headless', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
  '--window-size=1280,1000', 'about:blank',
], { stdio: 'ignore' });

async function cdpUrl() {
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

const ws = new WebSocket(await cdpUrl());
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

let seq = 0;
const pending = new Map();
const consoleErrors = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Runtime.exceptionThrown') {
    consoleErrors.push('exception: ' + (m.params.exceptionDetails?.exception?.description || ''));
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push('console.error: ' + m.params.args.map(a => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    consoleErrors.push('log: ' + m.params.entry.text);
  }
});

function cmd(method, params = {}, timeoutMs = 90000) {
  const id = ++seq;
  return new Promise((res, rej) => {
    pending.set(id, m => m.error ? rej(new Error(`${method}: ${JSON.stringify(m.error)}`)) : res(m.result));
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) { pending.delete(id); rej(new Error(`${method} 超时`)); }
    }, timeoutMs);
  });
}

async function ev(expression) {
  const r = await cmd('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) {
    throw new Error('页面异常: ' + (r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails)));
  }
  return r.result.value;
}

/** 轮询直到表达式为真；超时记一次失败并返回 false */
async function until(expression, label, timeout = 60000, interval = 500) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (await ev(expression)) return true;
    await sleep(interval);
  }
  bad(`${label}（${timeout}ms 超时）`);
  return false;
}

try {
  await cmd('Runtime.enable'); await cmd('Log.enable');
  await cmd('Page.enable'); await cmd('DOM.enable');

  /* ---------- 用浏览器现场渲染一道题目，当作上传的照片 ---------- */
  await cmd('Emulation.setDeviceMetricsOverride', { width: 900, height: 240, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url: 'about:blank' });
  await sleep(300);
  await ev(`(() => {
    document.body.style.cssText = 'margin:0;background:#fff';
    document.body.innerHTML = '<div style="font:38px/1.6 -apple-system,\\'PingFang SC\\',\\'Hiragino Sans GB\\',Helvetica,sans-serif;color:#000;padding:26px 34px">'
      + '<div>1. 解方程：2x + 6 = 14</div>'
      + '<div>2. 小明有 3 个苹果，又买了 5 个，一共几个？</div></div>';
  })()`);
  await sleep(400);
  const fixture = await cmd('Page.captureScreenshot', {
    format: 'png', captureBeyondViewport: false,
    clip: { x: 0, y: 0, width: 900, height: 240, scale: 1 },
  });
  fs.writeFileSync(questionImage, Buffer.from(fixture.data, 'base64'));
  if (fs.statSync(questionImage).size < 3000) throw new Error('题目测试图生成失败');

  await cmd('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await cmd('Page.navigate', { url: `${BASE}/` });
  await sleep(1500);

  step('1 / 8  首屏与状态');
  const title = await ev('document.title');
  title.includes('启点') ? ok(`标题：${title}`) : bad(`标题异常：${title}`);
  (await until(`document.getElementById('modelStatus').textContent.includes('已配置')`, '状态显示已配置', 10000))
    ? ok(`服务状态：${await ev(`document.getElementById('modelStatus').textContent`)}`) : 0;
  (await ev(`document.getElementById('setupLink').hidden === false`))
    ? ok('本机配置入口 /setup 可见') : bad('本机配置入口被隐藏');
  (await ev('document.documentElement.scrollWidth <= window.innerWidth + 1'))
    ? ok('无横向溢出') : bad('页面出现横向滚动');

  step('2 / 8  文字提问（真实 DeepSeek 往返）');
  await ev(`document.querySelector('[data-prompt]').click()`);
  (await ev(`document.getElementById('aiQuestion').value.length > 5`))
    ? ok('提示词卡片可填入问题') : bad('提示词卡片未填入问题');
  await ev(`document.getElementById('aiQuestion').value = '请用一句话说明什么是等式，并给一个例子。'`);
  await ev(`document.getElementById('askAI').click()`);
  (await until(`document.querySelectorAll('.chat-message.assistant').length >= 1`, '收到 AI 回答')) ? ok('AI 回答已渲染') : 0;
  const answer = await ev(`document.querySelector('.chat-message.assistant .message-text')?.textContent || ''`);
  answer.length > 10 ? ok(`回答 ${answer.length} 字：${answer.slice(0, 40)}…`) : bad('回答内容为空');
  (await ev(`document.getElementById('busyStatus').hidden`)) ? ok('思考态已复位') : bad('忙碌状态未复位');
  (await ev(`!document.getElementById('sendFollowup').disabled`)) ? ok('追问输入框已启用') : bad('追问输入框未启用');

  step('3 / 8  多轮追问（上下文延续）');
  await ev(`document.getElementById('followupText').value = '再帮我举一个生活中的例子。';
            document.getElementById('chatForm').requestSubmit()`);
  (await until(`document.querySelectorAll('.chat-message.assistant').length >= 2`, '收到第二轮回答')) ? ok('第二轮回答已渲染') : 0;
  (await ev(`document.querySelectorAll('.chat-message.user').length === 2`))
    ? ok('用户消息保留 2 条') : bad('用户消息数量异常');

  step('4 / 8  照片上传 → 识题 → 核对 → 带图辅导');
  await ev(`document.getElementById('aiQuestion').value = ''`); // 清空上一步残留
  const doc = await cmd('DOM.getDocument');
  const fileNode = await cmd('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#photoFile' });
  await cmd('DOM.setFileInputFiles', { nodeId: fileNode.nodeId, files: [questionImage] });
  (await until(`document.getElementById('photoBox').hidden === false`, '照片预览出现', 15000))
    ? ok(`照片已本机压缩并预览（${await ev(`document.getElementById('photoSize').textContent`)}）`) : 0;
  await ev(`document.getElementById('recognize').click()`);
  (await until(`document.getElementById('aiQuestion').value.length > 5 && document.getElementById('confirmPhotoLabel').hidden === false`,
    '识题结果填入题干', 90000)) ? ok('识题结果已填入题干') : 0;
  const recognized = (await ev(`document.getElementById('aiQuestion').value`)).replace(/\s+/g, '');
  (recognized.includes('2x') && recognized.includes('14'))
    ? ok(`题干识别正确：${recognized.slice(0, 46)}…`)
    : bad(`题干识别异常：${recognized}`);
  (await ev(`document.getElementById('confirmPhotoLabel').hidden === false`))
    ? ok('要求用户核对并确认题干') : bad('未出现核对确认项');
  await ev(`document.getElementById('confirmPhoto').checked = true`);
  await ev(`document.getElementById('askAI').click()`);
  // 新问题会先清空消息区，所以等第 1 条助手消息即可
  (await until(`document.querySelectorAll('.chat-message.assistant').length >= 1`, '带图辅导回答')) ? ok('携带原图的辅导回答已渲染') : 0;
  const withPhoto = await ev(`document.querySelector('.chat-message.assistant .message-text')?.textContent || ''`);
  withPhoto.length > 10 ? ok(`带图回答 ${withPhoto.length} 字`) : bad('带图回答为空');
  (await ev(`document.getElementById('confirmPhoto').disabled === false`))
    ? ok('答完后交互控件已恢复可用') : bad('控件仍处于禁用态');

  step('5 / 8  新问题重置');
  await ev(`document.getElementById('newChat').click()`);
  await sleep(400);
  (await ev(`document.getElementById('aiQuestion').value === ''`)) ? ok('「新问题」清空输入') : bad('「新问题」未清空');
  (await ev(`document.getElementById('photoBox').hidden === true`)) ? ok('「新问题」移除照片') : bad('照片未移除');
  (await ev(`document.getElementById('messages').textContent.includes('先把「不懂」说出来')`))
    ? ok('欢迎区已恢复') : bad('欢迎区未恢复');
  (await ev(`document.getElementById('followupText').disabled && document.getElementById('sendFollowup').disabled`))
    ? ok('新会话下追问框按预期禁用') : bad('追问框状态异常');

  step('6 / 8  停止按钮与输入守卫');
  await ev(`document.getElementById('aiQuestion').value = '请详细讲解一元二次方程求根公式的推导过程，至少 300 字。'`);
  await ev(`document.getElementById('askAI').click()`);
  await sleep(600);
  (await ev(`document.getElementById('stopAI').hidden === false`)) ? ok('请求中「停止」按钮可见') : bad('「停止」按钮未出现');
  await ev(`document.getElementById('stopAI').click()`);
  await sleep(1200);
  const stopMsg = await ev(`document.getElementById('aiInputError').textContent`);
  /停止|超时/.test(stopMsg) ? ok(`取消提示：${stopMsg}`) : bad(`取消提示异常：${JSON.stringify(stopMsg)}`);
  (await ev(`document.getElementById('busyStatus').hidden === true`)) ? ok('取消后思考态复位') : bad('取消后仍处于忙碌态');
  (await ev(`document.querySelectorAll('.chat-message').length === 0`)) ? ok('取消后清除了未完成的占位消息') : bad('残留占位消息');
  await ev(`document.getElementById('aiQuestion').value = 'x'.repeat(6001); document.getElementById('askAI').click()`);
  await sleep(400);
  const longMsg = await ev(`document.getElementById('aiInputError').textContent`);
  longMsg.includes('过长') ? ok(`超长输入被拦截：${longMsg}`) : bad(`超长未拦截：${JSON.stringify(longMsg)}`);

  step('7 / 8  本地一元一次方程练习（不调用大模型）');
  await ev(`document.getElementById('localTab').click()`);
  (await ev(`document.getElementById('localWorkspace').hidden === false`)) ? ok('切换到本地练习工作台') : bad('本地工作台未显示');
  await ev(`document.getElementById('question').value = '3(x + 2) = 18';
            document.getElementById('answer').value = '4';
            document.getElementById('start').click()`);
  (await until(`document.getElementById('panel').textContent.trim().length > 20`, '诊断面板出结果', 8000))
    ? ok(`本地诊断已出结果：${(await ev(`document.getElementById('panel').textContent.replace(/\\s+/g, ' ').slice(0, 60)`))}…`) : 0;
  await ev(`document.getElementById('notebookBtn').click()`);
  (await ev(`document.getElementById('localWorkspace').hidden === false && document.getElementById('notebook').open === true`))
    ? ok('错题本弹窗可打开') : bad('错题本入口异常');

  step('8 / 8  运行时错误');
  // 无头环境必然出现的 WebGL/GPU 噪声与 favicon 缺失不算问题
  const real = consoleErrors.filter(e => !/favicon|WebGL|GPU|swiftshader/i.test(e));
  real.length === 0 ? ok('无 JS 运行时错误') : real.forEach(e => bad(e));
} finally {
  ws.close();
  chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* 清理失败不影响结论 */ }
}

console.log(`\n${fail === 0 ? '\x1b[32m' : '\x1b[31m'}结果：${pass} 通过 / ${fail} 失败\x1b[0m`);
console.log('说明：本文件会真实调用 DeepSeek，消耗少量额度；接口契约与异常分支请跑 npm test。\n');
process.exit(fail ? 1 : 0);
