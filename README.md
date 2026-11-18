# Galahadid 的技术博客

基于 VitePress + [Teek 主题](https://github.com/teekhub/vitepress-theme-teek) 的个人博客，用于记录工作与学习中遇到的问题。

线上地址：https://p-blocks-isah.vercel.app

## 本地开发

```bash
npm install     # 首次安装依赖
npm run dev     # 本地开发，http://localhost:5173
npm run build   # 构建产物到 .vitepress/dist
npm run preview # 本地预览构建产物
```

## 目录结构

```text
my-blog/
├── .vitepress/
│   ├── config.mts        # 站点配置（Teek 主题、导航、搜索、页脚）
│   └── theme/
│       ├── index.ts      # 主题入口（extends Teek）
│       └── custom.css    # 自定义样式
├── docs/                 # Markdown 内容（URL 映射为站点根路径）
│   ├── index.md          # 首页（Teek banner + 文章列表）
│   ├── archives.md       # 归档页
│   ├── categories.md     # 分类页
│   ├── tags.md           # 标签页
│   ├── guide/about.md    # 关于页
│   ├── frontend/         # 前端问题
│   ├── backend/          # 后端问题
│   ├── database/         # 数据库问题
│   ├── toolchain/        # 工具链问题
│   └── public/           # 静态资源（logo.svg、avatar.svg）
└── vercel.json
```

## 如何新增文章

在对应分类目录（如 `docs/frontend/`）下新建 `.md` 文件即可，归档/分类/标签页与首页列表自动收录。

Front Matter 模板（`categories` 决定归属的分类，`tags` 用于标签页）：

```yaml
---
title: 文章标题
categories: 前端
date: 2026-03-20
tags: [标签1, 标签2]
---
```

正文推荐结构：**问题现象 → 排查过程 → 根因 → 解决方案 → 举一反三**。

首页列表会读取 `<!-- more -->` 之前的内容作为摘要；没有该标记时自动截取前 300 字。

## 开启 Giscus 评论

当前 `config.mts` 中 `comment.provider` 为空，评论区不渲染。开启步骤：

1. 仓库 **Settings → General → Features** 勾选 **Discussions**
2. 到 [github.com/apps/giscus](https://github.com/apps/giscus) 安装并授权 `Galahadid/p_blocks`
3. 打开 [giscus.app](https://giscus.app/zh-CN)，填入仓库 `Galahadid/p_blocks`，选择 Discussion 分类（如 `Announcements`），页面会生成 `data-repo-id` 与 `data-category-id`
4. 把 `config.mts` 里注释掉的 `comment` 配置启用，替换 `repoId` / `categoryId` 两个值，重新构建部署

## 新增分类

1. 在 `docs/` 下新建目录（如 `docs/devops/`）
2. 在 `config.mts` 的 `nav` 里加一条导航
3. 新文章的 Front Matter 写 `categories: DevOps` 即可自动进入分类页

## 部署到 Vercel

仓库已关联 Vercel，推送 `main` 分支自动部署。

手动部署：`vercel --prod`（需先 `npm i -g vercel` 并登录）。

Vercel 构建设置：

- Framework Preset: **VitePress**
- Build Command: `npm run build`
- Output Directory: `.vitepress/dist`

## 上线后的个性化清单

- [x] 全局替换 `your-username` 为 GitHub 用户名 `Galahadid`
- [x] 站点标题、描述、footer、sitemap.hostname 换成实际值
- [x] 归档 / 分类 / 标签页已建好并接入导航
- [ ] 开启 Giscus 评论（见上文「开启 Giscus 评论」）
- [ ] 按需替换 `docs/public/logo.svg`、`docs/public/avatar.svg` 为自己的图标与头像
