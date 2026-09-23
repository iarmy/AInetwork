#!/usr/bin/env bash
# 为首页卡片生成各子站点的预览图（previews/*.png）
#
# 依赖：本机安装了 Playwright 缓存的 chromium-headless-shell
#   ~/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell
# 若路径不同，用 CHROME=... 环境变量覆盖。
#
# 用法：先启动 server.py，再执行本脚本
#   python3 server.py 8080 --no-open &
#   bash tools/make-previews.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORT:-8080}"
BASE="http://127.0.0.1:${PORT}"
OUT="$ROOT/previews"

CHROME="${CHROME:-$(ls -d "$HOME"/Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell 2>/dev/null | tail -1)}"
if [[ -z "${CHROME:-}" || ! -x "$CHROME" ]]; then
  echo "找不到 chrome-headless-shell，请设置 CHROME=/path/to/chrome-headless-shell" >&2
  exit 1
fi

# 页面路径 -> 输出文件名（普通整页截图就能搞定的站点）
PAGES=(
  "dianming/index.html:dianming"
  "gesture/gesture-demo/index.html:gesture-demo"
  "grand_canal_project/index.html:grand-canal"
  "long-march/long-march.html:long-march"
  "math_game/math_game.html:math-game"
  "solar-system-3d/index.html:solar-system"
  "water-measure-game/index.html:water-measure"
)

# --use-fake-device-for-media-stream：给手势类页面喂一路合成视频，
#   否则摄像头被拒后页面只剩"启动失败"提示，预览图很难看。
# --enable-unsafe-swiftshader：无头环境默认拿不到 WebGL 上下文，
#   太阳系 / 全息碎片这类 Three.js 页面会截成一片空白，
#   改用软件渲染（SwiftShader）才能截到真实画面。
FLAGS=(
  --headless --no-sandbox --hide-scrollbars
  --window-size=1280,800 --force-device-scale-factor=1
  --use-fake-ui-for-media-stream
  --use-fake-device-for-media-stream
  --autoplay-policy=no-user-gesture-required
  --enable-unsafe-swiftshader --use-gl=angle --use-angle=swiftshader
  --virtual-time-budget=15000 --timeout=25000
)

mkdir -p "$OUT"
ok=0; fail=0
for entry in "${PAGES[@]}"; do
  path="${entry%%:*}"; name="${entry##*:}"

  # 可只重跑指定站点：bash tools/make-previews.sh dianming solar-system
  if [[ $# -gt 0 ]]; then
    wanted=0
    for want in "$@"; do [[ "$want" == "$name" ]] && wanted=1; done
    [[ $wanted -eq 1 ]] || continue
  fi
  profile="$(mktemp -d)"
  ok_shot=0
  # 个别页面（依赖 CDN 的 three.js / mediapipe）首屏较慢，允许重试一次
  for attempt in 1 2; do
    if timeout 120 "$CHROME" "${FLAGS[@]}" \
         --user-data-dir="$profile" \
         --screenshot="$OUT/$name.png" \
         "$BASE/$path" >/dev/null 2>&1 && [[ -s "$OUT/$name.png" ]]; then
      ok_shot=1; break
    fi
    sleep 1
  done
  if [[ $ok_shot -eq 1 ]]; then
    printf '  ✓ %-24s %s\n' "$name" "$(du -h "$OUT/$name.png" | cut -f1)"
    ok=$((ok+1))
  else
    printf '  ✗ %-24s 失败\n' "$name"
    fail=$((fail+1))
  fi
  rm -rf "$profile"
done

# 下面两张普通整页截图拍不到想要的画面，改用 CDP 控制浏览器后再截：
#   shudu        棋盘要等模型加载完才画出来，普通截图只有"正在加载 AI 模型…"黑屏；
#   gesture-edu  票数要靠真实时间累积，普通截图一加载完就拍，柱状图还是 0。
#                （?demo=1 是页面自带的彩排模式：不开摄像头，用模拟手势跑界面）
if command -v node >/dev/null 2>&1; then
  SHOOT() {
    local name="$1" url="$2" wait="$3" js="${4:-}"
    if CHROME="$CHROME" node "$ROOT/tools/make-cdp-cover.js" "$OUT/$name.png" "$url" "$wait" "" "$js" \
       >"/tmp/ainetwork-cover-$name.log" 2>&1 && [[ -s "$OUT/$name.png" ]]; then
      printf '  ✓ %-24s %s\n' "$name" "$(du -h "$OUT/$name.png" | cut -f1)"
      ok=$((ok+1))
    else
      printf '  ✗ %-24s 失败（见 /tmp/ainetwork-cover-%s.log）\n' "$name" "$name"
      fail=$((fail+1))
    fi
  }

  SHOOT shudu "$BASE/gesture/gesture-shudu/shudu.html" 3000 \
    "(function(){document.getElementById('loading').style.display='none';document.querySelector('.ui-guide').style.display='none';drawGrid();drawNumbers();drawHighlights();drawNumpad();return '棋盘已绘制';})()"

  SHOOT gesture-edu "$BASE/gesture/gesture-edu/index.html?demo=1" 5000
else
  printf '  · %-24s 跳过（需要 node）\n' "shudu / gesture-edu"
fi

echo "预览图生成完成：成功 ${ok} 张，失败 ${fail} 张，输出目录 $OUT"
