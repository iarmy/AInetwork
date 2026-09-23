#!/usr/bin/env bash
# ============================================================
# 「AI 教学应用导航」一键自检
#   1. 静态扫描：所有 html/css 里的本地引用是否都存在
#   2. 首页链接：index.html 里每个 href/src 走一遍 HTTP，必须 200
#   3. 预览图  ：previews/*.png 是否齐全且非空
#   4. 运行时  ：用无头浏览器逐个打开子站点，抓 JS 报错
#
# 用法：
#   bash tools/verify.sh              # 端口 8080
#   PORT=9000 bash tools/verify.sh
# ============================================================

set -o pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"
BASE="http://127.0.0.1:${PORT}"
CHROME="${CHROME:-$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | tail -1)}"

pass=0; fail=0
step() { printf '\n\033[1m── %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; pass=$((pass+1)); }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; fail=$((fail+1)); }

# ---------- 0. 确保服务器在跑 ----------
step "0 / 5  本地服务器"
if curl -fsS -o /dev/null --max-time 3 "$BASE/"; then
  ok "服务器已在 $BASE 运行"
  SERVER_PID=""
else
  ( cd "$ROOT" && python3 server.py "$PORT" --no-open >/tmp/ainetwork-server.log 2>&1 & echo $! >/tmp/ainetwork-server.pid )
  SERVER_PID="$(cat /tmp/ainetwork-server.pid 2>/dev/null)"
  for _ in $(seq 1 20); do
    curl -fsS -o /dev/null --max-time 2 "$BASE/" && break
    sleep 0.3
  done
  if curl -fsS -o /dev/null --max-time 3 "$BASE/"; then
    ok "已临时启动服务器（pid ${SERVER_PID}）"
  else
    bad "服务器启动失败，请看 /tmp/ainetwork-server.log"
    exit 1
  fi
fi

# ---------- 1. 逻辑测试（不需要浏览器） ----------
step "1 / 5  逻辑测试（首页筛选 + 出题算法）"
if command -v node >/dev/null 2>&1; then
  if node "$ROOT/tools/test-logic.js" > /tmp/ainetwork-logic.log 2>&1; then
    ok "$(grep -E '通过 [0-9]+ 项' /tmp/ainetwork-logic.log | tail -1 | sed 's/^ *//')"
  else
    bad "逻辑测试失败，详见 /tmp/ainetwork-logic.log"
    grep '✗' /tmp/ainetwork-logic.log | head -10
  fi
else
  printf '  \033[33m·\033[0m 未安装 node，跳过\n'
fi

# ---------- 2. 静态断链扫描 ----------
step "2 / 5  静态引用扫描"
if python3 "$ROOT/tools/check-links.py" > /tmp/ainetwork-links.log 2>&1; then
  ok "$(tail -2 /tmp/ainetwork-links.log | head -1 | sed 's/^ *//')"
else
  bad "存在断链，详见 /tmp/ainetwork-links.log"
  grep '✗' -A3 /tmp/ainetwork-links.log | head -20
fi

# ---------- 2. 首页链接 HTTP 检查 ----------
step "3 / 5  首页链接（index.html）"
# bash 3.2（macOS 自带）没有 mapfile，用临时文件 + while read 代替
REFS_FILE="$(mktemp)"
python3 - "$ROOT/index.html" > "$REFS_FILE" <<'PY'
import re, sys
from urllib.parse import unquote
html = open(sys.argv[1], encoding='utf-8').read()
refs = []
for m in re.finditer(r'(?:href|src)\s*=\s*"([^"]+)"', html):
    r = m.group(1)
    if r.startswith(('http://','https://','//','#','data:','mailto:','javascript:')):
        continue
    refs.append(unquote(r.split('?')[0].split('#')[0]))
for r in dict.fromkeys(refs):
    print(r)
PY
while IFS= read -r ref; do
  [[ -n "$ref" ]] || continue
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 "$BASE/$ref")"
  if [[ "$code" == "200" ]]; then
    ok "$ref"
  else
    bad "$ref  → HTTP $code"
  fi
done < "$REFS_FILE"
rm -f "$REFS_FILE"

# ---------- 3. 预览图 ----------
step "4 / 5  卡片预览图"
shopt -s nullglob
for img in "$ROOT"/previews/*.png; do
  size=$(stat -f%z "$img" 2>/dev/null || echo 0)
  name=$(basename "$img")
  if [[ "$size" -gt 3000 ]]; then
    ok "$name ($((size/1024))K)"
  else
    bad "$name 体积异常（${size} 字节）"
  fi
done
shopt -u nullglob

# ---------- 4. 无头浏览器运行时报错 ----------
step "5 / 5  运行时（JS 报错 + 工具条吸附）"
if [[ -z "$CHROME" || ! -x "$CHROME" ]]; then
  printf '  \033[33m·\033[0m 未找到 chrome-headless-shell，跳过\n'
else
  PAGES=(
    "首页:/"
    "点名:/dianming/index.html"
    "空中画函数:/gesture/gesture-demo/index.html"
    "课堂反馈:/gesture/gesture-edu/index.html"
    "手势数独:/gesture/gesture-shudu/shudu.html"
    "AI 巨型全息:/gesture/gesture-shudu/index.html"
    "大运河:/grand_canal_project/index.html"
    "长征:/long-march/long-march.html"
    "加减法:/math_game/math_game.html"
    "太阳系:/solar-system-3d/index.html"
    "量水:/water-measure-game/index.html"
  )
  for entry in "${PAGES[@]}"; do
    name="${entry%%:*}"; path="${entry#*:}"
    profile="$(mktemp -d)"
    log="$(mktemp)"
    timeout 40 "$CHROME" --headless --disable-gpu --no-sandbox \
      --use-fake-ui-for-media-stream --use-fake-device-for-media-stream \
      --autoplay-policy=no-user-gesture-required \
      --virtual-time-budget=8000 --timeout=12000 \
      --user-data-dir="$profile" --enable-logging=stderr --v=0 \
      --dump-dom "$BASE$path" >/dev/null 2>"$log"
    # 忽略无头环境必然出现的 WebGL/GPU 噪声
    errs="$(grep -E 'CONSOLE' "$log" \
            | grep -viE 'WebGL|GPU|swiftshader|GroupMarkerNotSet|Automatic fallback to software' \
            | grep -iE 'uncaught|error|failed|不能|失败' || true)"
    if [[ -z "$errs" ]]; then
      ok "$name"
    else
      bad "$name"
      echo "$errs" | head -4 | sed 's/^/      /'
    fi
    rm -rf "$profile" "$log"
  done
fi

# ---------- 5b. 首页工具条吸附（真实滚动测量） ----------
if command -v node >/dev/null 2>&1 && [[ -n "$CHROME" && -x "$CHROME" ]]; then
  if CHROME="$CHROME" BASE="$BASE" node "$ROOT/tools/test-sticky.js" > /tmp/ainetwork-sticky.log 2>&1; then
    ok "首页工具条滚到顶后吸附"
  else
    bad "工具条吸附异常，详见 /tmp/ainetwork-sticky.log"
    tail -6 /tmp/ainetwork-sticky.log | sed 's/^/      /'
  fi
fi

# ---------- 收尾 ----------
if [[ -n "$SERVER_PID" ]]; then
  kill "$SERVER_PID" 2>/dev/null
  rm -f /tmp/ainetwork-server.pid
fi

printf '\n%s\n' "=========================================================="
printf '  自检结束：通过 %d 项，失败 %d 项\n' "$pass" "$fail"
printf '%s\n' "=========================================================="
[[ "$fail" -eq 0 ]]
