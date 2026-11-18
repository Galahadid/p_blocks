---
title: 示例：Vite 打包后白屏问题排查
categories: 前端
date: 2026-03-12
tags: [vite, 构建打包, 白屏]
---

> 这是一篇示例文章，演示推荐的问题记录格式。以后写作照这个结构来即可：**问题现象 → 排查过程 → 根因 → 解决方案 → 举一反三**。

## 问题现象

项目用 Vite 构建后部署到测试环境，页面整体白屏，控制台报错：

```text
Uncaught TypeError: Failed to fetch dynamically imported module
```

本地 `npm run dev` 一切正常，只有打包后的产物有问题。

## 排查过程

1. 先看 Network 面板，发现某个异步 chunk 请求 404
2. 对比本地 `dist` 目录，发现文件名带了 hash，而线上请求的是旧 hash
3. 检查部署脚本，发现 Nginx 静态资源缓存配置了 `expires 30d`

## 根因

**index.html 被浏览器/CDN 强缓存了**。html 引用了带 hash 的新 js 文件，但浏览器拿到的还是缓存的旧 html，去请求已被清理的旧 chunk，于是白屏。

## 解决方案

Nginx 对 html 明确禁止缓存，对静态资源放开长缓存：

```nginx
# html 不缓存
location ~* \.html$ {
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# 带 hash 的静态资源长缓存
location ~* \.(js|css|png|jpg|svg|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}
```

## 举一反三

- 所有 SPA 项目（Vue/React）部署都适用这套缓存策略
- 发布后如果还出现白屏，优先怀疑 **CDN 缓存** 和 **Service Worker 旧版本**
- 可给入口 html 加版本号探测，帮助快速定位缓存问题
