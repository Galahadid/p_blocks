#!/usr/bin/env node
/**
 * 新增/导入一篇博客文章
 *
 * 用法：
 *   1) 从零新建
 *      npm run new -- --title "Nginx 反向代理 502 排查" --category 后端 --tags nginx,502 --slug nginx-502
 *
 *   2) 导入已经写好的 md 文件（会自动补全/合并 frontmatter）
 *      npm run new -- --file "D:/我的笔记/xxx.md" --category 数据库 --tags mysql
 *
 * 参数：
 *   --title     文章标题（导入文件时可省略，会读文件里的一级标题或文件名）
 *   --category  分类，可选：前端 / 后端 / 数据库 / 工具链 / 关于（也可传自定义分类）
 *   --tags      标签，英文逗号分隔
 *   --slug      文件名（建议英文短横线），省略时按日期生成
 *   --file      要导入的 md 文件路径
 *   --date      发布日期，默认今天
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsDir = join(root, 'docs')

// 中文分类 → 目录名，新增分类在这里加一行即可
const CATEGORY_DIRS = {
  前端: 'frontend',
  后端: 'backend',
  数据库: 'database',
  工具链: 'toolchain',
  关于: 'guide'
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const next = argv[i + 1]
    if (next && !next.startsWith('--')) {
      args[key] = next
      i++
    } else {
      args[key] = true
    }
  }
  return args
}

function today() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return { frontmatter: {}, body: text }
  const frontmatter = {}
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!kv) continue
    let v = kv[2].trim()
    if (/^\[.*\]$/.test(v)) {
      v = v
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    } else {
      v = v.replace(/^['"]|['"]$/g, '')
    }
    frontmatter[kv[1]] = v
  }
  return { frontmatter, body: text.slice(m[0].length) }
}

function firstH1(body) {
  const m = body.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : ''
}

function slugify(input) {
  const s = String(input)
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return s || ''
}

const args = parseArgs(process.argv.slice(2))

if (!args.category) {
  console.error('缺少 --category，可选：' + Object.keys(CATEGORY_DIRS).join(' / ') + '，或自定义分类名')
  process.exit(1)
}

const category = String(args.category)
const dirName = CATEGORY_DIRS[category] || slugify(category) || 'misc'
const targetDir = join(docsDir, dirName)

let body = ''
let title = args.title ? String(args.title) : ''
let tags = []

if (args.file) {
  const filePath = resolve(String(args.file))
  if (!existsSync(filePath)) {
    console.error('文件不存在：' + filePath)
    process.exit(1)
  }
  const raw = readFileSync(filePath, 'utf8')
  const parsed = splitFrontmatter(raw)
  body = parsed.body.replace(/^\s+/, '')
  if (!title) title = parsed.frontmatter.title || firstH1(body) || basename(filePath, extname(filePath))
  // 正文开头的一级标题与 frontmatter title 重复时去掉，避免页面出现两个大标题
  const h1 = firstH1(body)
  if (h1 && h1 === title) body = body.replace(/^#\s+.*\r?\n+/, '')
  if (Array.isArray(parsed.frontmatter.tags)) tags = parsed.frontmatter.tags
  else if (typeof parsed.frontmatter.tags === 'string') tags = [parsed.frontmatter.tags]
} else {
  if (!title) {
    console.error('缺少 --title（或改用 --file 导入已有文件）')
    process.exit(1)
  }
  body = `## 问题现象\n\n\n\n## 排查过程\n\n\n\n## 根因\n\n\n\n## 解决方案\n\n\n\n## 举一反三\n`
}

if (args.tags) {
  tags = String(args.tags)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// 生成 URL 友好的文件名：标题含中文时用「日期-序号」，纯英文标题直接用标题
function makeSlug(title, date) {
  const ascii = slugify(title)
  const isAscii = /^[\x20-\x7e]+$/.test(title) && ascii.length > 0
  if (isAscii) return `${date}-${ascii.slice(0, 60)}`
  // 中文标题：日期 + 时间戳后 4 位，避免同一天重名
  const suffix = String(Date.now()).slice(-4)
  return `${date}-post-${suffix}`
}

const date = String(args.date || today())
const slug = args.slug ? slugify(String(args.slug)) : makeSlug(title, date)

if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

const targetFile = join(targetDir, `${slug}.md`)
if (existsSync(targetFile)) {
  console.error('目标文件已存在，未覆盖：' + targetFile)
  process.exit(1)
}

const lines = ['---', `title: ${title}`, `categories: ${category}`, `date: ${args.date || today()}`]
if (tags.length) lines.push(`tags: [${tags.join(', ')}]`)
lines.push('---', '')

writeFileSync(targetFile, lines.join('\n') + '\n' + body, 'utf8')

console.log('已创建：' + targetFile)
console.log('分类：' + category + '（目录 docs/' + dirName + '/）')
if (tags.length) console.log('标签：' + tags.join('、'))
console.log('\n下一步：npm run dev 本地预览 → git add -A && git commit -m "post: ' + title + '" && git push')
