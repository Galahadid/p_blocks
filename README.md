# My Dev Blog

基于 VitePress 的个人博客，用于记录工作与学习中遇到的问题。

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
│   ├── config.mts        # 站点配置（导航/侧边栏/搜索）
│   └── theme/
│       ├── index.ts      # 主题入口
│       ├── index.vue     # 布局扩展（Giscus 评论挂载点）
│       └── custom.css    # 自定义样式
├── docs/                 # Markdown 内容（URL 映射为站点根路径）
│   ├── index.md          # 首页
│   ├── guide/about.md    # 关于页
│   ├── frontend/         # 前端问题
│   ├── backend/          # 后端问题
│   ├── database/         # 数据库问题
│   └── toolchain/        # 工具链问题
└── package.json
```

## 如何新增文章

在对应分类目录（如 `docs/frontend/`）下新建 `.md` 文件即可，侧边栏自动收录。

Front Matter 模板：

```yaml
---
title: 文章标题
date: 2026-03-20
tags: [标签1, 标签2]
---
```

正文推荐结构：**问题现象 → 排查过程 → 根因 → 解决方案 → 举一反三**。

## 部署到 Vercel

1. 在 GitHub 创建新仓库 `my-blog`，然后推送：

   ```bash
   cd my-blog
   git init
   git add .
   git commit -m "init: VitePress blog"
   git remote add origin git@github.com:Galahadid/p_blocks.git
   git push -u origin main
   ```

2. 打开 [vercel.com](https://vercel.com)，用 GitHub 账号登录，点击 **Add New → Project**，导入 `my-blog` 仓库
3. 构建设置 Vercel 会自动识别 VitePress：
   - Framework Preset: **VitePress**
   - Build Command: `npm run build`
   - Output Directory: `.vitepress/dist`
   - 若未自动识别，按上面手动填写
4. 点击 Deploy，几十秒后即可通过 `https://my-blog-<你的用户名>.vercel.app` 访问

## 上线后的个性化清单

- [x] 全局替换 `your-username` 为你的 GitHub 用户名（`config.mts` 的 socialLinks、README、about 页）
- [ ] 修改 `config.mts` 中的 `title`、`description`、`footer`、`sitemap.hostname`
- [ ] 到 [giscus.app](https://giscus.app) 用仓库生成参数，替换 `.vitepress/theme/index.vue` 中的 `repo` / `repoId` / `category` / `categoryId`，激活评论
- [ ] 更新首页 `docs/index.md` 的 hero 文案与功能介绍

## 新增分类

1. 在 `docs/` 下新建目录（如 `docs/devops/`）
2. 在 `config.mts` 的 `nav` 和 `sidebar` 中各加一条，sidebar 使用 `sidebarFromDir('devops')` 自动收录文章
