#!/usr/bin/env node
import { execSync } from 'node:child_process'
/**
 * 死代码基线门禁。
 *
 * <p>背景：`tsc`、`biome`、`antd lint`、`locale-keys.spec.ts` 都发现不了「没人引用」——
 * 前者管类型与未使用局部变量，后者只保证 **用到的** i18n key 存在。于是删功能时留下的
 * 整页组件、整段 API 包装、整棵文案 namespace 会一直躺在仓库里，只能靠人定期扫。
 * 实测一次全仓扫描（2026-11-12）扫出 5 个零 import 的死文件、41 个死导出、334 个死文案。</p>
 *
 * <p>本脚本把「当前还剩多少」冻结成基线：**新增**死代码就失败，把历史存量留在基线里。
 * 存量逐轮递减，新增一律拦下。</p>
 *
 * <p>三项检查：</p>
 * <ol>
 *   <li><b>零 import 的文件</b>（孤儿文件）：基线必须为空 —— 这类最危险，
 *       整个页面/模块死了也照常编译通过；</li>
 *   <li><b>零引用的 i18n key</b>：允许存量和基线完全一致，多一个就失败；</li>
 *   <li>扫描器自检：语料规模必须合理，防止正则失效后空跑全绿。</li>
 * </ol>
 *
 * <p>更新基线：`node scripts/dead-code-check.mjs --update`（会重写
 * `scripts/dead-code-baseline.json`）。**只有确实清理完才更新**，不要用它掩盖新增死代码。</p>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = resolve(ROOT, 'scripts/dead-code-baseline.json')

const sh = (cmd) =>
  execSync(cmd, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
/*
 * 必须把**未跟踪**文件一起纳入：本地新建但还没 `git add` 的文件同样是源码，
 * 只用 `git ls-files`（仅已跟踪）会让「刚加的孤儿文件」逃过检查 —— 本地反馈循环
 * 恰恰要在提交前就拦住它。`--exclude-standard` 会排除 .gitignore 内的产物目录。
 */
const listFiles = (pattern) =>
  sh(`git ls-files --cached --others --exclude-standard ${pattern}`)
    .trim()
    .split('\n')
    .filter(Boolean)

const isSpec = (f) => /\.(spec|test)\.(ts|tsx)$/.test(f)
const isDecl = (f) => /\.d\.ts$/.test(f)

/** 入口与工具文件：本来就没被 import，不算孤儿。 */
const ENTRY_FILES = new Set([
  'src/main.tsx',
  'src/test-setup.ts',
  'src/env.d.ts',
  'src/vite-env.d.ts',
])
const isExempt = (f) =>
  ENTRY_FILES.has(f) ||
  isSpec(f) ||
  isDecl(f) ||
  f.includes('/__mocks__/') ||
  f.includes('/test-utils') ||
  f.endsWith('.config.ts')

/* ------------------------------------------------------------------ */
/* 1) 孤儿文件：零 import 的源码文件                                    */
/* ------------------------------------------------------------------ */

const IMPORT_RE =
  /(?:from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"])/gm

function findOrphanFiles(sourceFiles) {
  const set = new Set(sourceFiles)
  const imported = new Set()

  const resolveSpec = (spec, from) => {
    if (!spec.startsWith('.') && !spec.startsWith('@/')) return null
    const base = spec.startsWith('@/')
      ? `src/${spec.slice(2)}`
      : normalize(`${dirname(from)}/${spec}`)
    return (
      [
        base,
        `${base}.ts`,
        `${base}.tsx`,
        `${base}/index.ts`,
        `${base}/index.tsx`,
      ].find((candidate) => set.has(candidate)) ?? null
    )
  }

  for (const file of sourceFiles) {
    const text = readFileSync(resolve(ROOT, file), 'utf8')
    for (const match of text.matchAll(IMPORT_RE)) {
      const spec = match[1] ?? match[2] ?? match[3]
      if (!spec) continue
      const target = resolveSpec(spec, file)
      if (target && target !== file) imported.add(target)
    }
  }

  return sourceFiles.filter((f) => !imported.has(f) && !isExempt(f))
}

/* ------------------------------------------------------------------ */
/* 2) 死 i18n key：静态引用为零且不被动态前缀覆盖                        */
/* ------------------------------------------------------------------ */

function loadLocaleTree(relPath) {
  const raw = readFileSync(resolve(ROOT, relPath), 'utf8')
  const body = raw.slice(
    raw.indexOf('{', raw.indexOf('export const')),
    raw.lastIndexOf('}') + 1,
  )
  // locale 是纯数据字面量（无 import、无调用），可安全求值
  return new Function(`return (${body})`)()
}

function flattenKeys(tree, prefix = '', out = []) {
  for (const [key, value] of Object.entries(tree)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value, full, out)
    } else {
      out.push(full)
    }
  }
  return out
}

/** 源码里以字面量形式出现、可当作 i18n key 的命名空间首段。 */
const KEY_NAMESPACES =
  /^(?:modules|pages|common|layouts|api|errors?|auth|table|attachment|system|hooks|dashboard|validation|priceCompare|priceRule|toolbar|moduleFilters|marketSync|valueAlias|documentFlow|inventory|quoteRegion|lengthPremium|receiptReconcile|moduleSelector|errorBoundary)\./u

function findDeadI18nKeys(sourceFiles) {
  const keyChars = '[\\p{L}\\p{N}_.\\-]+'
  const tCall = new RegExp(
    `(?<![\\w$.])(?:i18next|i18n)?\\.?t\\(\\s*['"\`](${keyChars})['"\`]`,
    'gu',
  )
  const anyLiteral = new RegExp(`['"\`](${keyChars})['"\`]`, 'gu')
  // 动态拼接：`modules.pages.${x}` / 'modules.pages.' + x
  const dynamicTemplate = /\x60([\p{L}][\p{L}\p{N}_.]*?)\$\{/gu
  const dynamicConcat = /'([\p{L}][\p{L}\p{N}_.]*?\.)'\s*\+/gu

  const used = new Set()
  const dynamicPrefixes = new Set()

  for (const file of sourceFiles) {
    if (file.startsWith('src/locales/')) continue
    const text = readFileSync(resolve(ROOT, file), 'utf8')
    for (const m of text.matchAll(tCall)) used.add(m[1])
    for (const m of text.matchAll(anyLiteral)) {
      if (KEY_NAMESPACES.test(m[1])) used.add(m[1])
    }
    for (const m of text.matchAll(dynamicTemplate)) dynamicPrefixes.add(m[1])
    for (const m of text.matchAll(dynamicConcat)) dynamicPrefixes.add(m[1])
  }

  const prefixes = [...dynamicPrefixes]
  const allKeys = flattenKeys(loadLocaleTree('src/locales/zh-CN.ts'))
  return {
    allKeys,
    dead: allKeys
      .filter((key) => !used.has(key))
      .filter((key) => !prefixes.some((prefix) => key.startsWith(prefix)))
      .sort(),
  }
}

/* ------------------------------------------------------------------ */
/* 主流程                                                              */
/* ------------------------------------------------------------------ */

const sourceFiles = listFiles('src').filter((f) => /\.(ts|tsx)$/.test(f))
if (sourceFiles.length < 800) {
  console.error(
    `扫描器异常：只找到 ${sourceFiles.length} 个源文件（预期 800+），拒绝在语料不完整时给结论`,
  )
  process.exit(2)
}

const orphanFiles = findOrphanFiles(sourceFiles).sort()
const { allKeys, dead: deadI18nKeys } = findDeadI18nKeys(sourceFiles)

if (allKeys.length < 1500) {
  console.error(`扫描器异常：i18n key 只有 ${allKeys.length} 个（预期 1500+）`)
  process.exit(2)
}

if (process.argv.includes('--update')) {
  writeFileSync(
    BASELINE_PATH,
    `${JSON.stringify({ orphanFiles, deadI18nKeys }, null, 2)}\n`,
  )
  console.log(
    `已写入基线：孤儿文件 ${orphanFiles.length} 个、死文案 ${deadI18nKeys.length} 个`,
  )
  process.exit(0)
}

if (!existsSync(BASELINE_PATH)) {
  console.error(`缺少基线文件 ${BASELINE_PATH}，先运行 --update 生成`)
  process.exit(2)
}
const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
const baselineOrphans = new Set(baseline.orphanFiles ?? [])
const baselineDeadI18n = new Set(baseline.deadI18nKeys ?? [])

const newOrphans = orphanFiles.filter((f) => !baselineOrphans.has(f))
const newDeadI18n = deadI18nKeys.filter((k) => !baselineDeadI18n.has(k))
const fixedOrphans = [...baselineOrphans].filter(
  (f) => !orphanFiles.includes(f),
)
const fixedDeadI18n = [...baselineDeadI18n].filter(
  (k) => !deadI18nKeys.includes(k),
)

console.log(
  `孤儿文件 ${orphanFiles.length}（基线 ${baselineOrphans.size}）｜死文案 ${deadI18nKeys.length}（基线 ${baselineDeadI18n.size}）`,
)

if (newOrphans.length) {
  console.error(
    `\n新增零 import 的文件 ${newOrphans.length} 个（整个文件没人用，删掉或接进引用链）：`,
  )
  for (const f of newOrphans) console.error(`  ${f}`)
}
if (newDeadI18n.length) {
  console.error(
    `\n新增零引用 i18n key ${newDeadI18n.length} 个（文案没有消费方）：`,
  )
  for (const k of newDeadI18n) console.error(`  ${k}`)
}
if (fixedOrphans.length || fixedDeadI18n.length) {
  console.log(
    `\n存量已减少：孤儿文件 -${fixedOrphans.length}、死文案 -${fixedDeadI18n.length}。` +
      ' 运行 `node scripts/dead-code-check.mjs --update` 收紧基线。',
  )
}
if (newOrphans.length || newDeadI18n.length) process.exit(1)
console.log('死代码基线通过：没有新增孤儿文件，也没有新增死文案。')
