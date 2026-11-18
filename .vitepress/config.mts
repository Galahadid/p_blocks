import { defineConfig } from 'vitepress'
import { defineTeekConfig } from 'vitepress-theme-teek/config'

// 站点基础信息：部署上线后把 domain 换成你的 Vercel 域名
const SITE = 'https://p-blocks-isah.vercel.app'

// Teek 主题配置：博客形态（banner 首页 + 文章列表 + 归档/分类/标签页）
const teekConfig = defineTeekConfig({
  // 首页 Banner
  banner: {
    name: 'Galahadid 的技术博客',
    bgStyle: 'partImg',
    description: ['记录踩过的每一个坑，让下次排查不再从零开始']
  },

  // 首页文章列表风格：list（列表）/ card（卡片）
  post: {
    postStyle: 'list',
    showCapture: true,
    splitSeparator: true
  },
  // 首页每页文章数
  page: {
    pageSize: 8
  },

  // 博主信息卡片
  blogger: {
    name: 'Galahadid',
    slogan: '记录工作与学习中遇到的问题',
    avatar: '/avatar.svg',
    shape: 'circle'
  },

  // 分类页 / 标签页地址
  category: { path: '/categories' },
  tag: { path: '/tags' },

  // 评论：默认关闭（provider 为空则不渲染评论区）
  // 开启步骤见 README「开启 Giscus 评论」：仓库开 Discussions → 安装 giscus App → giscus.app 取 categoryId
  comment: {
    provider: ''
  },
  // 参数齐备后，把上面 comment 替换为下面这段即可
  // comment: {
  //   provider: 'giscus',
  //   options: {
  //     repo: 'Galahadid/p_blocks',
  //     repoId: 'R_kgDOVy5Bmg',
  //     category: 'Announcements',
  //     categoryId: '请替换为 giscus.app 生成的 categoryId',
  //     mapping: 'pathname',
  //     strict: '0',
  //     reactionsEnabled: '1',
  //     inputPosition: 'top',
  //     lang: 'zh-CN',
  //     loading: 'lazy',
  //     useOnline: true
  //   }
  // },

  // 页脚
  footerGroup: [
    {
      title: '站点',
      links: [
        { name: '首页', link: '/' },
        { name: '归档', link: '/archives' },
        { name: '分类', link: '/categories' },
        { name: '标签', link: '/tags' }
      ]
    },
    {
      title: '关于',
      links: [
        { name: '关于本站', link: '/guide/about' },
        { name: 'GitHub', link: 'https://github.com/Galahadid' }
      ]
    }
  ],
  footerInfo: {
    copyright: {
      createYear: 2026,
      suffix: 'Galahadid'
    }
  },

  // 侧边栏：自动扫描 docs 下各目录生成，分组标题用目录中文名
  vitePlugins: {
    sidebarOption: {
      initItems: true,
      initItemsText: true,
      titleFormMd: true,
      collapsed: true,
      sort: true,
      // 根目录的 archives/categories/tags/index 是聚合页，不作为侧边栏
      scannerRootMd: false,
      // 把目录名映射成中文分组标题
      sidebarResolved: (data) => {
        const DIR_LABEL = {
          crossplatform: '跨平台开发',
          frontend: '前端问题记录',
          backend: '后端问题记录',
          database: '数据库问题记录',
          toolchain: '工具链问题记录',
          guide: '关于本站'
        }
        for (const key of Object.keys(data)) {
          const dir = key.replace(/\//g, '')
          const label = DIR_LABEL[dir]
          if (!label) continue
          for (const item of data[key] || []) {
            if (item.text === dir) item.text = label
          }
        }
        return data
      }
    }
  }
})

export default defineConfig({
  extends: teekConfig,

  lang: 'zh-CN',
  srcDir: 'docs', // Markdown 内容放在 docs/ 下，URL 映射为站点根路径
  title: 'Galahadid 的技术博客',
  description: 'Galahadid 的个人博客：记录工作与学习中遇到的问题和解决方案',
  lastUpdated: true, // 显示 Git 最后提交时间

  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],

  cleanUrls: true,

  markdown: {
    lineNumbers: true,
    theme: 'github-dark'
  },

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '跨平台开发', link: '/crossplatform/' },
      { text: '归档', link: '/archives' },
      { text: '分类', link: '/categories' },
      { text: '标签', link: '/tags' },
      { text: '关于', link: '/guide/about' }
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/Galahadid' }],

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
    }
  },

  sitemap: { hostname: SITE }
})
