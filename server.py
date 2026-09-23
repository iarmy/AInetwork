#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AInetwork 本地静态服务器
------------------------
用途：以 http:// 方式伺服本站点及所有子站点。

为什么必须用 http 而不是双击打开文件：
  1. 手势类页面使用 ES Module + WebAssembly，file:// 协议下会被浏览器拦截；
  2. 摄像头（getUserMedia）只在 secure context（https 或 localhost）下可用；
  3. 子站点之间是相对路径链接，http 下才能正确解析。

用法：
    python3 server.py                 # 默认 8080 端口
    python3 server.py 9000            # 指定端口
    python3 server.py 9000 --no-open  # 不自动打开浏览器
"""

import argparse
import functools
import http.server
import os
import socket
import socketserver
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))

# 显式补上浏览器需要的 MIME 类型（Python 默认表里 .wasm / .task 等缺失，
# 会给出手势引擎加载失败这种"莫名其妙"的报错）
EXTRA_TYPES = {
    ".wasm": "application/wasm",
    ".task": "application/octet-stream",
    ".tflite": "application/octet-stream",
    ".data": "application/octet-stream",
    ".binarypb": "application/octet-stream",
    ".mjs": "text/javascript",
    ".js": "text/javascript",
    ".json": "application/json",
    ".css": "text/css",
    ".svg": "image/svg+xml",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".woff2": "font/woff2",
    ".csv": "text/csv; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    """静态文件处理器：补 MIME、禁缓存、静默日志。"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        ext = os.path.splitext(str(path))[1].lower()
        if ext in EXTRA_TYPES:
            return EXTRA_TYPES[ext]
        return super().guess_type(path)

    def end_headers(self):
        # 开发调试期禁用缓存，改完刷新即生效
        self.send_header("Cache-Control", "no-store, must-revalidate")
        # 允许子站点在本地调试时读取摄像头/麦克风
        self.send_header("Permissions-Policy", "camera=(self), microphone=(self)")
        super().end_headers()

    def log_message(self, fmt, *args):
        # 只打印错误，保持控制台干净；需要完整日志时改成 print(fmt % args)
        status = args[1] if len(args) > 1 else ""
        if isinstance(status, str) and status.startswith(("4", "5")):
            sys.stderr.write("  [%s] %s\n" % (status, args[0] if args else ""))

    def log_error(self, fmt, *args):
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def free_port(preferred: int) -> int:
    """端口被占用时自动向后找一个可用端口。"""
    for port in range(preferred, preferred + 20):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    raise SystemExit("找不到可用端口，请手动指定：python3 server.py 9000")


def main() -> None:
    parser = argparse.ArgumentParser(description="AInetwork 本地静态服务器")
    parser.add_argument("port", nargs="?", type=int, default=8080)
    parser.add_argument("--no-open", action="store_true", help="不自动打开浏览器")
    args = parser.parse_args()

    port = free_port(args.port)
    url = f"http://127.0.0.1:{port}/"

    print("=" * 58)
    print("  AI 教学应用导航 · 本地服务器已启动")
    print("=" * 58)
    print(f"  站点根目录 : {ROOT}")
    print(f"  首页地址   : {url}")
    print("  停止服务   : 在本窗口按 Control + C")
    print("=" * 58)

    if not args.no_open:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    try:
        with Server(("127.0.0.1", port), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止。")


if __name__ == "__main__":
    main()
