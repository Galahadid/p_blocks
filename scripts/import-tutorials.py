#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""导入教程目录下的 md 到博客 docs/crossplatform/，并生成规范 frontmatter。"""
import io
import os
import re
import shutil

SRC = r"D:\workspace\教程"
DST = r"C:\Users\moe\Documents\小艺Work工作空间\Bloks\my-blog\docs\crossplatform"

# 源文件 -> (输出文件名, 标题, 标签, 简介)
PLAN = [
    (
        "快速入门.md",
        "kmp-cmp-quickstart.md",
        "快速入门：把第一个 KMP 应用跑到鸿蒙上",
        ["KMP", "CMP", "鸿蒙", "环境搭建"],
        "从零理解 CPF-KMP-CMP 是什么、环境怎么装，15 分钟内把第一个应用跑到鸿蒙设备上。",
    ),
    (
        "如何构建UI.md",
        "kmp-cmp-build-ui.md",
        "如何构建 UI：一份代码跑三个平台",
        ["KMP", "CMP", "Compose", "UI"],
        "Compose Multiplatform 的 UI 心智模型、工程配置、六大组件库、布局三件套与渲染模式选型。",
    ),
    (
        "网络请求、异步编程、事务处理.md",
        "kmp-cmp-async-network-db.md",
        "网络请求、异步编程、事务处理",
        ["KMP", "协程", "Ktor", "跨平台桥接"],
        "在 commonMain 中用 expect/actual 桥接平台能力，用协程组织异步、用 Ktor 发请求、用本地库处理事务。",
    ),
    (
        "性能优化.md",
        "kmp-cmp-performance.md",
        "性能优化：从渲染模式到内存与构建效率",
        ["KMP", "CMP", "性能优化", "鸿蒙"],
        "性能优化的四个层面：渲染模式选型、图片优化、运行时调度与 QoS、内存 GC 与构建效率。",
    ),
]

FM_RE = re.compile(r"\A---\r?\n(.*?)\r?\n---\r?\n?", re.S)

# 指向原文档库的相对链接：目标本站不存在，转成纯文本保留可读性
REL_LINK_RE = re.compile(r"\[([^\]]+)\]\(\.\./[^)]*\)")


def strip_leading_h1(body: str, title: str) -> str:
    """去掉正文开头的一级标题（标题已由 frontmatter 提供，避免页面出现两个大标题）。"""
    m = re.match(r"\s*#\s+(.+?)\s*\r?\n", body)
    if m:
        return body[m.end():].lstrip("\n")
    return body


def process(src_name: str, out_name: str, title: str, tags, desc: str) -> str:
    path = os.path.join(SRC, src_name)
    raw = io.open(path, encoding="utf-8").read()

    aigc_block = ""
    m = FM_RE.match(raw)
    if m:
        fm = m.group(1)
        # 原样保留源文件的 AIGC 标识块
        if "AIGC:" in fm:
            aigc_block = fm.strip()
        body = raw[m.end():]
    else:
        body = raw

    body = strip_leading_h1(body, title)
    body = REL_LINK_RE.sub(r"\1", body)

    lines = ["---", f"title: {title}", "categories: 跨平台开发", "date: 2026-11-08",
             f"tags: [{', '.join(tags)}]", f"description: {desc}"]
    if aigc_block:
        lines.append(aigc_block)
    lines += ["---", ""]

    out = os.path.join(DST, out_name)
    io.open(out, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n" + body.lstrip("\n"))
    return out


if __name__ == "__main__":
    for src, out, title, tags, desc in PLAN:
        p = process(src, out, title, tags, desc)
        print("created:", os.path.basename(p), os.path.getsize(p), "bytes")
