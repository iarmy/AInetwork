#!/usr/bin/env node
/**
 * 用 CDP 打开页面、等一会儿（或先执行一段 JS），再截图 —— 生成首页卡片封面。
 * ---------------------------------------------------------------------------
 * 为什么需要它：有些页面用普通 `--screenshot` 拍不到想要的画面。
 *   ① 手势数独：棋盘要等模型加载完才画出来，普通截图只有加载黑屏；
 *   ② 手势课堂反馈：票数要靠真实时间累积（普通截图一加载完就拍，柱状图还是 0，
 *      而 `--virtual-time-budget` 会把动画时钟一起加速，反而永远攒不满防抖帧）。
 *
 *   node tools/make-cdp-cover.js <输出.png> <页面URL> [等待毫秒] [点击的选择器] [要执行的JS]
 *
 * 例：
 *   # 数独：隐去加载层，调用页面自身的绘制函数画出棋盘
 *   node tools/make-cdp-cover.js previews/shudu.png \
 *     http://127.0.0.1:8080/gesture/gesture-shudu/shudu.html 3000 "" \
 *     "document.getElementById('loading').style.display='none';drawGrid();drawNumbers();drawHighlights();drawNumpad();"
 *
 *   # 课堂反馈：彩排模式自动开始，等 4 秒让票数攒起来
 *   node tools/make-cdp-cover.js previews/gesture-edu.png \
 *     "http://127.0.0.1:8080/gesture/gesture-edu/index.html?demo=1" 4000
 *
 * 依赖：Node 22+ 内置的 WebSocket / fetch（无需 npm 包），且必须先启动 server.py。
 * CHROME=... 可指定浏览器可执行文件；CDP_PORT=... 可换调试端口。
 */
'use strict';

const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const [out, url, waitMsArg, clickSel, inlineJs] = process.argv.slice(2);
if (!out || !url) {
  console.error('用法：node tools/make-cdp-cover.js <输出.png> <页面URL> [等待毫秒] [点击选择器] [要执行的JS]');
  process.exit(2);
}
const waitMs = Number(waitMsArg || 3000);

const CHROME = process.env.CHROME || (() => {
  const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const dir = fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell-')).sort().pop();
  return path.join(base, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
})();
const PORT = Number(process.env.CDP_PORT || 9444);

const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--hide-scrollbars',
  '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
  '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-cover-'))}`,
  '--window-size=1280,800',
  url,
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function rpc(ws, id, method, params) {
  return new Promise((resolve, reject) => {
    const on = ev => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      ws.removeEventListener('message', on);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
    };
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => reject(new Error('RPC 超时: ' + method)), 30000);
  });
}

(async () => {
  let wsUrl = null;
  for (let i = 0; i < 80; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) { wsUrl = page.webSocketDebuggerUrl; break; }
    } catch (_) { /* 还没起来 */ }
    await sleep(250);
  }
  if (!wsUrl) throw new Error('CDP 未就绪');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  await sleep(2500);   // 等首屏（有些页面要等自己的初始化跑完才能调用其内部函数）

  /* Runtime.evaluate 里页面抛错不会 reject，错误藏在 exceptionDetails 里，
     显式报出来，免得"准备脚本没生效"却看不出原因。 */
  const evalJs = async (id, expression, label) => {
    const r = await rpc(ws, id, 'Runtime.evaluate', { expression, returnByValue: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error(`${label} 抛错：${(d.exception && d.exception.description) || d.text}`);
    }
    return r.result && r.result.value;
  };

  if (clickSel) {
    const v = await evalJs(1,
      `(() => { const el = document.querySelector(${JSON.stringify(clickSel)});
        if (!el) return '找不到 ' + ${JSON.stringify(clickSel)};
        el.click(); return '已点击'; })()`, '点击');
    console.log('点击 ' + clickSel + ' → ' + v);
  }

  if (inlineJs) {
    const v = await evalJs(2, inlineJs, '准备脚本');
    console.log('执行准备脚本 ✓' + (v ? ' → ' + v : ''));
  }

  await sleep(waitMs);   // 真实时间等待：让动画/统计跑到稳定状态

  const shot = await rpc(ws, 3, 'Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`已保存 ${out}（${(fs.statSync(out).size / 1024).toFixed(0)}K）`);

  ws.close();
  chrome.kill();
})().catch(e => { console.error('ERR', e.message); chrome.kill(); process.exit(1); });
