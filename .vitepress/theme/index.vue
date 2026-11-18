<script setup>
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Giscus from '@giscus/vue'

const { isDark } = useData()
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #doc-after>
      <div style="margin-top: 48px">
        <!--
          部署后激活评论：
          1. 仓库需公开，并开启 Settings → Discussions
          2. 到 https://giscus.app 生成你自己的参数，替换下面 repo / repoId / category / categoryId
          3. 生成参数需要先完成本仓库的首次推送
        -->
        <Giscus
          repo="your-username/my-blog"
          repo-id="REPLACE_WITH_YOUR_REPO_ID"
          category="Announcements"
          category-id="REPLACE_WITH_YOUR_CATEGORY_ID"
          mapping="pathname"
          strict="0"
          reactions-enabled="1"
          emit-metadata="0"
          input-position="top"
          :theme="isDark ? 'dark' : 'light'"
          lang="zh-CN"
          loading="lazy"
        />
      </div>
    </template>
  </Layout>
</template>
