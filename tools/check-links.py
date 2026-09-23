#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
全站链接体检
------------
扫描工作区内所有 .html / .css 文件，抽出其中的本地 href / src / url() 引用，
逐个检查目标文件是否真的存在，把断链打印出来。

用法：
    python3 tools/check-links.py            # 检查整个工作区
    python3 tools/check-links.py index.html # 只检查指定文件

退出码：0 = 全部正常；1 = 存在断链。
"""

import os
import re
import sys
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {".git", "node_modules", "previews", ".DS_Store"}

# href="..." / src="..." / url(...)
REF_RE = re.compile(
    r"""(?:href|src)\s*=\s*(?:"([^"]*)"|'([^']*)')|url\(\s*['"]?([^'")]+)['"]?\s*\)""",
    re.IGNORECASE,
)

# 不算本地文件的协议 / 特殊值
SKIP_PREFIX = ("http://", "https://", "//", "data:", "mailto:", "tel:",
               "javascript:", "blob:", "about:", "#", "webrtc:")
SKIP_EXT = (".jsdelivr",)

# 已知缺失、且页面已做降级兜底的历史遗留资源（不算回归问题）。
# grand_canal_project/images/cc.jpg 从建项目起就不存在，
# world-heritage.html 已加 onerror 兜底，缺图时显示主题色占位块。
KNOWN_MISSING = {
    "grand_canal_project/images/cc.jpg",
}


def is_local(ref: str) -> bool:
    ref = ref.strip()
    if not ref:
        return False
    low = ref.lower()
    return not low.startswith(SKIP_PREFIX)


def refs_in(path: str):
    """产出 (引用原文, 行号)。"""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            text = fh.read()
    except OSError:
        return
    for lineno, line in enumerate(text.splitlines(), 1):
        for m in REF_RE.finditer(line):
            ref = m.group(1) or m.group(2) or m.group(3) or ""
            if is_local(ref):
                yield ref, lineno


def check_file(path: str):
    """返回该文件里的断链列表 [(引用, 行号, 解析后的绝对路径)]。"""
    broken = []
    base = os.path.dirname(path)
    for ref, lineno in refs_in(path):
        clean = ref.split("?")[0].split("#")[0].strip()
        if not clean or clean.endswith("/"):
            # 指向目录：只要目录存在就算通过
            target = os.path.normpath(os.path.join(base, unquote(clean or ".")))
            if not os.path.isdir(target):
                broken.append((ref, lineno, target))
            continue
        target = os.path.normpath(os.path.join(base, unquote(clean)))
        if os.path.relpath(target, ROOT) in KNOWN_MISSING:
            continue
        if not os.path.exists(target):
            broken.append((ref, lineno, target))
    return broken


def iter_sources():
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            p = arg if os.path.isabs(arg) else os.path.join(ROOT, arg)
            if os.path.isfile(p):
                yield p
        return
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.lower().endswith((".html", ".htm", ".css")):
                yield os.path.join(dirpath, name)


def main() -> int:
    total_files = 0
    total_refs = 0
    problems = 0

    for path in sorted(iter_sources()):
        total_files += 1
        broken = check_file(path)
        rel = os.path.relpath(path, ROOT)
        total_refs += sum(1 for _ in refs_in(path))
        if broken:
            print(f"\n✗ {rel}")
            for ref, lineno, target in broken:
                print(f"    第 {lineno} 行  {ref}")
                print(f"        → 找不到 {os.path.relpath(target, ROOT)}")
            problems += len(broken)
        else:
            print(f"✓ {rel}")

    print("\n" + "=" * 58)
    print(f"  扫描文件 {total_files} 个 · 本地引用 {total_refs} 处 · 断链 {problems} 处")
    print("=" * 58)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
