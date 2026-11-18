import { defineConfig } from 'vitepress'
import { readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 站点基础信息：部署上线后把 domain 换成你的 Vercel 域名（如 https://my-blog.vercel.app）
const SITE = 'https://my-blog.vercel.app'

export default defineConfig({
  lang: 'zh-CN',
  srcDir: 'docs', // Markdown 内容放在 docs/ 下，URL 映射为站点根路径
  title: 'My Dev Blog',
  description: '记录工作与学习中遇到的问题和解决方案',
  lastUpdated: true, // 显示 Git 最后提交时间（需 Git 仓库）

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  // 在 Vercel 上可直接用默认值；如部署到子路径才需要改 base
  cleanUrls: true,

  markdown: {
    lineNumbers: true, // 代码块显示行号
    theme: 'github-dark'
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '前端', link: '/frontend/' },
      { text: '后端', link: '/backend/' },
      { text: '数据库', link: '/database/' },
      { text: '工具链', link: '/toolchain/' },
      { text: '关于', link: '/guide/about' }
    ],

    sidebar: {
      '/frontend/': [
        {
          text: '前端问题记录',
          collapsed: false,
          items: sidebarFromDir('frontend')
        }
      ],
      '/backend/': [
        {
          text: '后端问题记录',
          collapsed: false,
          items: sidebarFromDir('backend')
        }
      ],
      '/database/': [
        {
          text: '数据库问题记录',
          collapsed: false,
          items: sidebarFromDir('database')
        }
      ],
      '/toolchain/': [
        {
          text: '工具链问题记录',
          collapsed: false,
          items: sidebarFromDir('toolchain')
        }
      ]
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/your-username' }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文章', buttonAriaLabel: '搜索文章' },
          box: {
            placeholder: '输入关键词，例如：报错、配置、跨域…',
            emptyText: '没有找到相关结果',
            footerText: '按 Enter 跳转'
          },
          modal: {
            displayDetails: '显示详细列表',
            resetButton: { title: '重置查询' },
            noResultsText: '没有找到相关结果',
            backButton: { title: '返回结果' }
          }
        }
      }
    },

    footer: {
      message: '用 Markdown 记录每一个踩过的坑',
      copyright: 'Copyright © 2026 My Dev Blog'
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },

    outline: {
      level: [2, 3],
      label: '本页目录'
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单'
  },

  sitemap: { hostname: SITE }
})

/**
 * 根据分类目录自动生成侧边栏条目。
 * 新增文章时只需在对应目录下创建 .md 文件，侧边栏自动更新，
 * 不再需要手动维护 sidebar 配置。
 */
function sidebarFromDir(dir) {
  const base = join(__dirname, '..', 'docs', dir)
  if (!existsSync(base)) return []
  return readdirSync(base)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({
      text: f.replace(/\.md$/, ''),
      link: `/${dir}/${f.replace(/\.md$/, '')}`
    }))
}
