#!/bin/bash
# 双击本文件即可启动「AI 教学应用导航」本地服务器并自动打开首页。
# 关闭：在这个终端窗口里按 Control + C，或直接关掉窗口。

cd "$(dirname "$0")" || exit 1

if ! command -v python3 >/dev/null 2>&1; then
  echo "没有找到 python3，请先安装 Python 3（macOS 可用：brew install python）。"
  echo "按回车键关闭…"
  read -r _
  exit 1
fi

echo "正在启动本地服务器…"
exec python3 server.py 8080
