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

## 写文章：三种方式，任选一种

### 方式一：命令行一键新建（推荐）

```bash
# 从零新建（会生成带 frontmatter 的骨架）
npm run new -- --title "Nginx 反向代理 502 排查" --category 后端 --tags nginx,502 --slug nginx-502

# 导入已经写好的 md 文件（自动补 frontmatter、去掉重复的一级标题）
npm run new -- --file "D:/我的笔记/redis-slow.md" --category 数据库 --tags redis,性能 --slug redis-slow
```

`--category` 可选：`前端` / `后端` / `数据库` / `工具链` / `关于`，也可以传自定义分类名（会新建对应目录）。
`--slug` 建议用英文短横线，它决定网址（如 `/backend/nginx-502`）；省略时按日期自动生成。

### 方式二：手动新建文件

在对应分类目录下新建 `.md` 文件即可，例如 `docs/backend/nginx-502.md`：

```yaml
---
title: Nginx 反向代理 502 排查
categories: 后端
date: 2026-11-20
tags: [nginx, 502]
---

## 问题现象
...
```

**归类靠两个字段**：

| 字段 | 作用 | 举例 |
| --- | --- | --- |
| `categories` | 决定文章归属的分类，分类页按它分组 | `categories: 后端` |
| `tags` | 标签，标签页按它聚合，可多个 | `tags: [nginx, 502]` |

### 方式三：在小艺里直接说

把写好的文档发给我，说「加到博客，归类到数据库，标签 redis」即可，我按上面规则落盘、构建、推送。

## 上传后怎么发布

```bash
npm run dev                      # 本地预览 http://localhost:5173
git add -A
git commit -m "post: 文章标题"
git push                         # 推送后 Vercel 自动部署
```

## 目录结构与归类关系

```text
docs/
├── index.md            # 首页
├── archives.md         # 归档（按年月自动聚合全部文章）
├── categories.md       # 分类（按 categories 字段分组）
├── tags.md             # 标签（按 tags 字段聚合）
├── frontend/           # 前端问题记录
├── backend/            # 后端问题记录
├── database/           # 数据库问题记录
├── toolchain/          # 工具链问题记录
└── guide/about.md      # 关于
```

文章放在哪个目录，决定了它的网址前缀和左侧边栏分组；`categories` 字段决定分类页里的归属；`tags` 决定标签页聚合。三者可以不一致（比如文章放在 `backend/`，但 `categories: 架构`），一般保持一致更直观。

## 新增分类

```bash
mkdir docs/devops
```

1. 新建 `docs/devops/index.md` 作为分类首页（`title` 会显示为侧边栏分组名）
2. 在 `config.mts` 的 `nav` 里加导航
3. 在 `config.mts` 的 `sidebarResolved` 里给 `devops` 配一个中文分组名
4. 新文章写 `categories: DevOps` 即可自动进入分类页

## 开启 Giscus 评论

当前 `config.mts` 中 `comment.provider` 为空，评论区不渲染。开启步骤：

1. 仓库 **Settings → General → Features** 勾选 **Discussions**
2. 到 [github.com/apps/giscus](https://github.com/apps/giscus) 安装并授权 `Galahadid/p_blocks`
3. 打开 [giscus.app](https://giscus.app/zh-CN)，填入仓库 `Galahadid/p_blocks`，选择 Discussion 分类（如 `Announcements`），页面会生成 `data-repo-id` 与 `data-category-id`
4. 把 `config.mts` 里注释掉的 `comment` 配置启用，替换 `repoId` / `categoryId` 两个值，重新构建部署

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
