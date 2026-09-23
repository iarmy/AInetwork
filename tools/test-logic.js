#!/usr/bin/env node
/**
 * 首页交互 + 数学题生成器 逻辑测试
 * ---------------------------------
 * 不需要浏览器：直接从真实 HTML 里抽出脚本和数据，用最小 DOM 桩执行。
 *
 *   node tools/test-logic.js
 *
 * 覆盖：
 *   A. index.html 的搜索 / 分类筛选 / 分组显隐 / 空状态
 *   B. math_game.html 的出题逻辑（非负、10 以内、题面与答案一致）
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.dirname(__dirname);
let passCount = 0, failCount = 0;

function ok(label, detail) {
  passCount++;
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? '  ' + detail : ''}`);
}
function bad(label, detail) {
  failCount++;
  console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? '  ' + detail : ''}`);
}

/* ============================================================
   A. index.html —— 搜索 / 分类筛选
   ============================================================ */
function stubClassList() {
  const s = new Set();
  return {
    _s: s,
    add: n => s.add(n),
    remove: n => s.delete(n),
    contains: n => s.has(n),
    toggle: (n, on) => {
      const v = on === undefined ? !s.has(n) : !!on;
      v ? s.add(n) : s.delete(n);
      return v;
    },
  };
}

function testPortalFilter() {
  console.log('\n\x1b[1mA. index.html 搜索 / 筛选\x1b[0m');
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // 从真实标记里抽卡片（data-cat / data-keywords / 可见文本）
  const blockRe = /<article class="card" data-cat="([^"]+)"[\s\S]*?<\/article>/g;
  const rawCards = [...html.matchAll(blockRe)];
  const cards = rawCards.map(m => {
    const kw = (m[0].match(/data-keywords="([^"]*)"/) || [, ''])[1];
    const card = {
      dataset: { cat: m[1], keywords: kw },
      textContent: m[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      hidden: false,
      classList: stubClassList(),
    };
    // 把 is-hidden 状态同步到 hidden 上，方便断言
    const orig = card.classList.toggle;
    card.classList.toggle = (n, on) => {
      const r = orig(n, on);
      if (n === 'is-hidden') card.hidden = !!on;
      return r;
    };
    return card;
  });

  const groupNames = [...html.matchAll(/data-group="([^"]+)"/g)].map(m => m[1]);
  const groups = groupNames.map((name, i) => {
    const g = { hidden: false, name, cards: cards.slice(i * 3, i * 3 + 3) };
    g.querySelectorAll = () => g.cards.filter(c => !c.hidden);
    return g;
  });

  const mkEl = () => ({
    style: {}, textContent: '', value: '', dataset: {},
    classList: stubClassList(),
    addEventListener() {}, setAttribute() {}, focus() {}, select() {}, blur() {},
  });

  const input = mkEl(), countEl = mkEl(), emptyEl = mkEl(), searchBox = mkEl();
  const chips = ['all', 'gesture', 'class', 'subject'].map(c => {
    const el = mkEl(); el.dataset.cat = c; return el;
  });
  const byId = { q: input, count: countEl, empty: emptyEl, searchBox };

  global.document = {
    querySelectorAll: sel => ({ '.card': cards, '.chip': chips, '.group': groups }[sel] || []),
    getElementById: id => byId[id],
    addEventListener() {},
  };
  input.addEventListener = (t, fn) => { if (t === 'input') input._input = fn; };
  chips.forEach(c => { c.addEventListener = (t, fn) => { if (t === 'click') c._click = fn; }; });

  // 执行页面里真正的那段脚本
  const script = html.match(/<script>[\s\S]*?<\/script>/g).pop()
    .replace(/^<script>/, '').replace(/<\/script>$/, '');
  eval(script);

  const visible = () => cards.filter(c => !c.hidden).length;
  const click = cat => chips.find(c => c.dataset.cat === cat)._click();
  const search = q => { input.value = q; input._input(); };

  const expect = (label, got, want) =>
    got === want ? ok(label, `得到 ${got}`) : bad(label, `期望 ${want}，实际 ${got}`);

  expect('初始显示全部 9 张卡片', visible(), 9);
  expect('初始计数文案', countEl.textContent, '共 9 个站点');

  click('gesture'); expect('筛选「手势互动」', visible(), 3);
  click('class');   expect('筛选「课堂工具」', visible(), 3);
  click('subject'); expect('筛选「学科演示」', visible(), 3);
  click('all');     expect('回到「全部」', visible(), 9);

  search('数独');   expect('搜索「数独」', visible(), 1);
  search('量水');   expect('搜索「量水」', visible(), 1);
  search('摄像头'); expect('搜索「摄像头」命中标签', visible(), 3);
  search('zzz不存在'); expect('搜索无结果', visible(), 0);
  expect('无结果时显示空状态', emptyEl.classList.contains('show'), true);

  search('手势'); click('class');   expect('「课堂工具」+「手势」交集', visible(), 0);
  click('gesture'); expect('「手势互动」+「手势」交集', visible(), 3);
  expect('仅保留命中的分组标题', groups.filter(g => !g.hidden).length, 1);

  search(''); click('all');
  expect('清空后恢复全部', visible(), 9);
}

/* ============================================================
   B. math_game.html —— 出题逻辑
   ============================================================ */
function testMathGame() {
  console.log('\n\x1b[1mB. math_game.html 出题逻辑\x1b[0m');
  const html = fs.readFileSync(path.join(ROOT, 'math_game', 'math_game.html'), 'utf8');
  const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

  // --- 带容器的 DOM 桩：需要能读到按钮，所以 appendChild / innerHTML 要真的生效 ---
  const mkEl = (tag) => {
    const el = {
      tag: tag || 'div', style: {}, textContent: '', value: '', onclick: null,
      children: [],
      classList: { _s: new Set(), add(n) { this._s.add(n); },
                   remove(n) { this._s.delete(n); }, contains(n) { return this._s.has(n); } },
      appendChild(c) { el.children.push(c); return c; },
    };
    Object.defineProperty(el, 'innerHTML', {
      get: () => '', set: () => { el.children.length = 0; },
    });
    return el;
  };

  const els = {};
  const byId = id => els[id] || (els[id] = mkEl());
  let createdButtons = [];
  let nextIntervalId = 1;
  const liveIntervals = new Set();
  const clearedIds = [];

  global.document = {
    getElementById: byId,
    createElement: tag => {
      const el = mkEl(tag);
      if (tag === 'button') createdButtons.push(el);
      return el;
    },
  };
  global.setInterval = () => { const id = nextIntervalId++; liveIntervals.add(id); return id; };
  global.clearInterval = id => { clearedIds.push(id); liveIntervals.delete(id); };
  global.setTimeout = () => 0;

  // let 在 eval 里自成作用域，所以把探测代码拼进同一段源码
  eval(js + `
globalThis.__probe = function () {
  var n = 200000, neg = 0, over = 0, mismatch = 0;
  var optOver = 0, optNeg = 0, optDup = 0, optMiss = 0, optCount = 0;
  for (var i = 0; i < n; i++) {
    generateQuestion();
    if (currentAnswer < 0) neg++;
    if (currentAnswer > 10) over++;

    var q = document.getElementById('question').textContent;
    var m = q.match(/^(\\d+) ([+-]) (\\d+) = \\?$/);
    if (!m) { mismatch++; }
    else {
      var expect = m[2] === '+' ? (+m[1]) + (+m[3]) : (+m[1]) - (+m[3]);
      if (expect !== currentAnswer) mismatch++;
    }

    // 选项校验：3 个、含正确答案、全部在 0~10、不重复
    var btns = document.getElementById('options').children;
    if (btns.length !== 3) optCount++;
    var vals = btns.map(function (b) { return parseInt(String(b.textContent), 10); });
    if (vals.indexOf(currentAnswer) === -1) optMiss++;
    if (new Set(vals).size !== vals.length) optDup++;
    for (var k = 0; k < vals.length; k++) {
      if (vals[k] > 10) optOver++;
      if (vals[k] < 0) optNeg++;
    }
  }
  return { n: n, neg: neg, over: over, mismatch: mismatch,
           optOver: optOver, optNeg: optNeg, optDup: optDup,
           optMiss: optMiss, optCount: optCount };
};

// 反馈文本必须随新题目一起清空，否则上一题的"✓ 正确 / 时间到"会残留
globalThis.__probeFeedback = function () {
  var result = document.getElementById('result');
  result.textContent = '✓ 正确!';
  generateQuestion();
  var afterCorrect = result.textContent;
  result.textContent = '时间到! 正确答案是: 7';
  generateQuestion();
  return { afterCorrect: afterCorrect, afterTimeout: result.textContent };
};

// 答对时必须停表并上锁，否则最后一秒答对会被"时间到"覆盖、题目连跳两题
globalThis.__probeRace = function () {
  generateQuestion();
  startTimer();
  var active = timerId;
  var btns = document.getElementById('options').children;
  var correct = null;
  for (var i = 0; i < btns.length; i++) {
    if (parseInt(String(btns[i].textContent), 10) === currentAnswer) correct = btns[i];
  }
  correct.onclick.call(correct);
  var state = {
    active: active,
    timerCleared: timerId === null,
    locked: locked,
    result: document.getElementById('result').textContent,
    correctClass: correct.classList.contains('correct'),
  };
  // 再点一次（含正确答案）应当被 locked 挡掉，不产生任何状态变化
  var before = document.getElementById('result').textContent;
  correct.onclick.call(correct);
  state.secondClickIgnored = document.getElementById('result').textContent === before;
  return state;
};`);

  const r = globalThis.__probe();
  const N = r.n.toLocaleString();
  r.neg === 0 ? ok(`${N} 次出题无负数结果`) : bad('出现负数结果', `${r.neg} 次`);
  r.over === 0 ? ok(`${N} 次出题结果均不超过 10`) : bad('结果超过 10', `${r.over} 次`);
  r.mismatch === 0 ? ok('题面与正确答案始终一致') : bad('题面与答案不一致', `${r.mismatch} 次`);
  r.optCount === 0 ? ok('每题恒为 3 个选项') : bad('选项个数异常', `${r.optCount} 次`);
  r.optMiss === 0 ? ok('选项必含正确答案') : bad('选项缺少正确答案', `${r.optMiss} 次`);
  r.optDup === 0 ? ok('选项无重复') : bad('选项重复', `${r.optDup} 次`);
  r.optOver === 0 ? ok('干扰项也不超过 10（"10 以内"不破功）')
                  : bad('干扰项超过 10', `${r.optOver} 个`);
  r.optNeg === 0 ? ok('干扰项无负数') : bad('干扰项为负', `${r.optNeg} 个`);

  const f = globalThis.__probeFeedback();
  f.afterCorrect === '' ? ok('新题目会清空上一题的"✓ 正确"反馈')
                        : bad('"✓ 正确"残留到下一题', JSON.stringify(f.afterCorrect));
  f.afterTimeout === '' ? ok('新题目会清空"时间到"反馈')
                        : bad('"时间到"残留到下一题', JSON.stringify(f.afterTimeout));

  const race = globalThis.__probeRace();
  race.timerCleared ? ok('答对后计时器立即停止', `原计时器 #${race.active}`)
                    : bad('答对后计时器未停止', `timerId=${race.active}`);
  race.locked ? ok('答对后锁住答题，防止连跳两题')
              : bad('答对后未上锁，1 秒内可重复点击');
  race.secondClickIgnored ? ok('锁定期间重复点击被忽略')
                          : bad('锁定期间重复点击改变了状态');
  race.result === '✓ 正确!' ? ok('答对反馈文案正确')
                            : bad('答对反馈异常', JSON.stringify(race.result));
  clearedIds.length >= 1 ? ok('clearInterval 确实被调用')
                         : bad('未调用 clearInterval');
  liveIntervals.size <= 1 ? ok('任何时刻最多只有一个计时器在跑', `当前 ${liveIntervals.size} 个`)
                          : bad('存在多个并发计时器', `${liveIntervals.size} 个`);
}

/* ============================================================
   C. gesture-edu —— 手指数判定 + 投票防抖
   ------------------------------------------------------------
   直接把页面里的函数源码抽出来跑，测的是真实实现，不是复制品。
   ============================================================ */
function testGestureEdu() {
  console.log('\n\x1b[1mC. gesture-edu 手势课堂反馈\x1b[0m');
  const html = fs.readFileSync(path.join(ROOT, 'gesture', 'gesture-edu', 'index.html'), 'utf8');

  const grab = (re, label) => {
    const m = html.match(re);
    if (!m) throw new Error(`从 index.html 里抽不到：${label}`);
    return m[0];
  };

  const src = {
    WRIST:  grab(/const WRIST = \d+;/, 'WRIST'),
    FINGERS: grab(/const FINGERS = \[\[[\s\S]*?\];/, 'FINGERS'),
    CONFIG: grab(/const CONFIG = \{[\s\S]*?\n\};/, 'CONFIG'),
    QUESTIONS: grab(/const QUESTIONS = \[[\s\S]*?\n\];/, 'QUESTIONS'),
    dist: grab(/function dist\(a, b\) \{[\s\S]*?\n\}/, 'dist'),
    fingerExtended: grab(/function fingerExtended\(lm, tip, pip\) \{[\s\S]*?\n\}/, 'fingerExtended'),
    countFingers: grab(/function countFingers\(lm\) \{[\s\S]*?\n\}/, 'countFingers'),
    handKey: grab(/function handKey\(lm, label\) \{[\s\S]*?\n\}/, 'handKey'),
    updateTally: grab(/function updateTally\(hands\) \{[\s\S]*?\n\}/, 'updateTally'),
  };

  const factory = new Function(`
    ${src.WRIST}
    ${src.FINGERS}
    ${src.CONFIG}
    ${src.QUESTIONS}
    ${src.dist}
    ${src.fingerExtended}
    ${src.countFingers}
    ${src.handKey}

    let state = { tally: [0, 0, 0, 0], frozen: false, tracks: new Map() };
    let renderCalls = 0;
    function renderTally() { renderCalls++; }

    ${src.updateTally}

    return {
      CONFIG, QUESTIONS,
      countFingers, handKey, updateTally,
      reset() { state = { tally: [0, 0, 0, 0], frozen: false, tracks: new Map() }; },
      freeze(v) { state.frozen = v; },
      tally: () => state.tally.slice(),
      trackCount: () => state.tracks.size,
      renderCalls: () => renderCalls,
    };
  `);
  const api = factory();

  /* ---- 造一只合成的手：fingers = [食指, 中指, 无名指, 小指] 是否伸直 ---- */
  const makeLm = fingers => {
    const wrist = { x: 0.5, y: 0.9, z: 0 };
    const lm = Array.from({ length: 21 }, () => ({ ...wrist }));
    lm[0] = wrist;
    [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]].forEach(([mcp, pip, tip], i) => {
      const k = 0.18 + i * 0.06;
      const at = v => ({ x: wrist.x + v * k, y: wrist.y - v, z: 0 });
      lm[mcp] = at(0.10);
      lm[pip] = at(0.16);
      lm[tip] = at(fingers[i] ? 0.27 : 0.09);   // 弯曲时指尖比第二关节更靠近手腕
    });
    return lm;
  };
  const hand = (count, x, label) => ({
    lm: (() => { const l = makeLm([0, 1, 2, 3].map(k => k < count)); l[0].x = x; return l; })(),
    label,
    count,
  });

  // 1) 手指数判定
  let countOk = true, badCase = '';
  for (let n = 0; n <= 4; n++) {
    const lm = makeLm([0, 1, 2, 3].map(k => k < n));
    const got = api.countFingers(lm);
    if (got !== n) { countOk = false; badCase = `伸 ${n} 指被判成 ${got} 指`; break; }
  }
  countOk ? ok('0~4 根手指都能数对')
          : bad('手指数判定错误', badCase);

  // 2) 防抖：不足稳定帧数时不计票，正好达到才计票
  api.reset();
  const stable = api.CONFIG.STABLE_FRAMES;
  for (let i = 0; i < stable - 1; i++) api.updateTally([hand(2, 0.3, 'Right')]);
  const beforeStable = api.tally().reduce((a, b) => a + b, 0);
  api.updateTally([hand(2, 0.3, 'Right')]);
  const atStable = api.tally();
  (beforeStable === 0 && atStable[1] === 1)
    ? ok(`${stable} 帧防抖生效：不足不计票，够了才计入 B`)
    : bad('防抖未按预期工作', `第 ${stable - 1} 帧 ${beforeStable} 票，第 ${stable} 帧 ${JSON.stringify(atStable)}`);

  // 3) 手指数来回变化（识别抖动）不应计票
  api.reset();
  for (let i = 0; i < 60; i++) api.updateTally([hand(i % 2 ? 2 : 3, 0.3, 'Right')]);
  (api.tally().reduce((a, b) => a + b, 0) === 0)
    ? ok('手指数抖动时不误计票')
    : bad('抖动被计入', JSON.stringify(api.tally()));

  // 4) 手离开画面若干帧后自动移除
  api.reset();
  for (let i = 0; i <= stable; i++) api.updateTally([hand(3, 0.3, 'Right')]);
  const tracked = api.tally()[2];
  for (let i = 0; i < api.CONFIG.MISS_FRAMES; i++) api.updateTally([]);
  (tracked === 1 && api.tally().reduce((a, b) => a + b, 0) === 0)
    ? ok(`手离开 ${api.CONFIG.MISS_FRAMES} 帧后自动移除`)
    : bad('手离开后未清理', `手在时 ${tracked} 票，离开后 ${JSON.stringify(api.tally())}`);

  // 5) 最多 4 只手，key 必须互不冲突
  api.reset();
  const four = [hand(1, 0.24, 'Right'), hand(2, 0.41, 'Left'), hand(3, 0.59, 'Right'), hand(4, 0.76, 'Left')];
  const keys = new Set(four.map(h => api.handKey(h.lm, h.label)));
  for (let i = 0; i <= stable; i++) api.updateTally(four);
  const t4 = api.tally();
  (keys.size === 4 && t4[0] === 1 && t4[1] === 1 && t4[2] === 1 && t4[3] === 1)
    ? ok('4 只手同时投票各自计票', JSON.stringify(t4))
    : bad('多手投票统计错误', `key 去重后 ${keys.size} 个，票数 ${JSON.stringify(t4)}`);

  // 6) 定格后票数不再变化
  api.freeze(true);
  const frozenTally = JSON.stringify(api.tally());
  for (let i = 0; i < 30; i++) api.updateTally([hand(4, 0.2, 'Right')]);
  (JSON.stringify(api.tally()) === frozenTally)
    ? ok('定格后票数保持不变')
    : bad('定格后仍被改写', `${frozenTally} → ${JSON.stringify(api.tally())}`);
  api.freeze(false);

  // 7) 题库完整性
  const q = api.QUESTIONS;
  const badQ = q.filter(item =>
    typeof item.q !== 'string' || !item.q.trim() ||
    !Array.isArray(item.options) || item.options.length !== 4 ||
    !Number.isInteger(item.answer) || item.answer < 0 || item.answer > 3);
  (q.length >= 4 && badQ.length === 0)
    ? ok(`题库完整：${q.length} 道题，每题 4 个选项且答案下标合法`)
    : bad('题库有问题', `${badQ.length} 道题不合格`);

  // 8) 选项文字不重复（同一题里出现重复选项会让学生没法选）
  const dupQ = q.filter(item => new Set(item.options).size !== item.options.length);
  dupQ.length === 0 ? ok('同一题内选项不重复')
                    : bad('存在重复选项的题目', `${dupQ.length} 道`);
}

/* ============================================================ */
console.log('='.repeat(58));
console.log('  逻辑测试：首页筛选 + 数学题生成器 + 手势课堂反馈');
console.log('='.repeat(58));
testPortalFilter();
testMathGame();
testGestureEdu();
console.log('\n' + '='.repeat(58));
console.log(`  通过 ${passCount} 项，失败 ${failCount} 项`);
console.log('='.repeat(58));
process.exit(failCount === 0 ? 0 : 1);
