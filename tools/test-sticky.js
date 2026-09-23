#!/usr/bin/env node
// 通过 CDP 真实滚动页面，验证首页搜索工具条是否被钉在顶部（sticky 是否真的生效）。
//
//   node tools/test-sticky.js                  # 默认 http://127.0.0.1:8080/
//   BASE=http://127.0.0.1:9000 node tools/test-sticky.js
//
// 依赖：Node 22+ 的内置 WebSocket 与 fetch，无需安装任何 npm 包；
//      需要先启动 server.py。CHROME=... 可指定浏览器路径。
const { spawn } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

const CHROME = process.env.CHROME || (() => {
  const base = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const dir = fs.readdirSync(base).filter(d => d.startsWith('chromium_headless_shell-')).sort().pop();
  return path.join(base, dir, 'chrome-headless-shell-mac-arm64/chrome-headless-shell');
})();

const PORT = 9333;
const URL_ = process.env.BASE ? process.env.BASE + '/' : 'http://127.0.0.1:8080/';

const chrome = spawn(CHROME, [
  '--headless', '--no-sandbox', '--disable-gpu',
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-'))}`,
  '--window-size=1280,900',
  URL_,
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getWsUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await res.json();
      const page = list.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch (_) { /* 还没起来 */ }
    await sleep(250);
  }
  throw new Error('CDP 未就绪');
}

function evaluate(ws, id, expression) {
  return new Promise((resolve, reject) => {
    const onMsg = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMsg);
      if (msg.result?.exceptionDetails) reject(new Error(JSON.stringify(msg.result.exceptionDetails)));
      else resolve(msg.result?.result?.value);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({
      id, method: 'Runtime.evaluate',
      params: { expression, awaitPromise: true, returnByValue: true },
    }));
    setTimeout(() => reject(new Error('evaluate 超时')), 10000);
  });
}

(async () => {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  await sleep(1200); // 等页面渲染

  const probe = `(async () => {
    const tb = document.querySelector('.toolbar');
    // 页面开了 scroll-behavior:smooth，测量时必须强制瞬时滚动
    document.documentElement.style.scrollBehavior = 'auto';
    const out = { parentHeight: Math.round(tb.parentElement.getBoundingClientRect().height),
                  docHeight: Math.round(document.documentElement.scrollHeight) };
    out.samples = [];
    for (const y of [0, 300, 800, 1600, 2400]) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      out.samples.push({ scrollY: Math.round(window.scrollY),
                         toolbarTop: Math.round(tb.getBoundingClientRect().top) });
    }
    out.stickySupported = getComputedStyle(tb).position === 'sticky';
    return JSON.stringify(out);
  })()`;

  const raw = await evaluate(ws, 1, probe);
  const r = JSON.parse(raw);

  console.log('position 计算值      :', r.stickySupported ? 'sticky' : '不是 sticky');
  console.log('文档高度             :', r.docHeight, 'px');
  console.log('工具条父容器高度     :', r.parentHeight, 'px');
  console.log('滚动后工具条距顶位置 :');
  // 正确的判定：工具条永远不会被推到视口上方（top >= 0），
  // 且一旦滚过它的自然位置（约 476px）就必须吸附在 top = 0。
  const naturalTop = r.samples[0].toolbarTop;
  let ok = r.stickySupported;
  for (const s of r.samples) {
    const neverAbove = s.toolbarTop >= -1;
    const engaged = s.scrollY >= naturalTop ? Math.abs(s.toolbarTop) <= 1 : true;
    const pass = neverAbove && engaged;
    if (!pass) ok = false;
    console.log(`    scrollY=${String(s.scrollY).padStart(4)}  →  top=${String(s.toolbarTop).padStart(4)}px  ` +
                (pass ? (s.scrollY >= naturalTop ? '✓ 已吸附在顶部' : '✓ 自然位置（尚未到顶）') : '✗ 已滚出视口'));
  }
  const reachedTop = r.samples.some(s => s.scrollY >= naturalTop && Math.abs(s.toolbarTop) <= 1);
  if (!reachedTop) ok = false;

  ws.close();
  chrome.kill();
  console.log('\n' + (ok ? 'PASS ✓ 工具条滚到顶后吸附，且全程不被推出视口' : 'FAIL ✗ 工具条未正确吸附'));
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error('ERR', e.message); chrome.kill(); process.exit(1); });
