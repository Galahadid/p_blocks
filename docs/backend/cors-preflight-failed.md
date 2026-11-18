---
title: 示例：跨域请求预检失败（CORS）
date: 2026-03-15
tags: [http, cors, 前后端联调]
---

## 问题现象

前端本地联调后端接口时，浏览器控制台报错：

```text
Access to XMLHttpRequest at 'http://api.example.com/users'
from origin 'http://localhost:5173' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check
```

带 `Authorization` 头的请求全部失败，不带自定义头的请求正常。

## 排查过程

1. Network 里能看到一个 `OPTIONS` 请求，状态 405
2. 后端只在响应里加了 `Access-Control-Allow-Origin`，没有处理 `OPTIONS` 预检
3. 用 `curl -X OPTIONS` 复现，确认服务端直接把 OPTIONS 当业务请求处理了

## 根因

带自定义头的请求会先发 **预检请求（OPTIONS）**。后端框架没有响应预检请求，也没有放行 `Authorization` 头，预检失败后正式请求根本不会发出。

## 解决方案

后端网关统一处理（以 Express 为例）：

```js
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204) // 预检直接返回
  next()
})
```

## 举一反三

- 联调期更省事的方案是前端配 Vite 代理，让请求"同源"，从根上绕开 CORS
- 允许携带 Cookie 时，`Allow-Origin` 不能是 `*`，且必须加 `Allow-Credentials: true`
- 生产环境跨域优先在网关（Nginx/SLB）层解决，不要散落在各业务服务里
