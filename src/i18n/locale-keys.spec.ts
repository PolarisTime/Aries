/// <reference types="node" />
// biome-ignore-all lint/suspicious/noTemplateCurlyInString: 白名单里的 `${}` 是"动态 i18n key 占位符"的标记本身，不是待插值的模板串
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { enUS } from '@/locales/en-US'
import { zhCN } from '@/locales/zh-CN'

/**
 * i18n key 存在性门禁。
 *
 * <p>背景：`tsc` / `biome` / `eslint` / `contract:check` 四道门禁全绿也发现不了
 * 「源码调用了不存在的 i18n key」——中文界面会把 key 原样显示给用户（例如错误态按钮
 * `common.retry`），读屏用户听到的也是 key 本身（aria-label / 表格可访问名，属 WCAG 4.1.2）。
 * 2026-10 的评估里实测到 9 个 key 中英两侧都不存在、13 处仅 en-US 缺失，其中 5 处是
 * 命名空间写错（`modules.toolbarActions.*` 实际是 `hooks.toolbarActions.*`）。</p>
 *
 * <p>门禁口径（与 `.local/quality-2026-10-31/i18n-audit.mjs` 同一套 flatten + 扫描逻辑）：</p>
 * <ol>
 *   <li>源码里 `t('字面量')` / `i18n.t('字面量')` / `i18next.t('字面量')` 用到的每个 key，
 *       必须同时存在于 zh-CN 与 en-US 的 flatten 键集合中（差集必须为空）；</li>
 *   <li>zh-CN 与 en-US 的键集合必须完全相同（单侧漂移＝改名只改了一边）；</li>
 *   <li>模板串动态 key（``t(`a.${x}`)``）无法静态展开，逐个登记在这份白名单里，
 *       并要求它的静态前缀在两侧 locale 中至少命中一个 key（防止前缀本身写错）。</li>
 * </ol>
 */
const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url))

type LocaleTree = { [key: string]: unknown }

function flattenKeys(
  tree: LocaleTree,
  prefix = '',
  out = new Map<string, unknown>(),
): Map<string, unknown> {
  for (const [key, value] of Object.entries(tree)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenKeys(value as LocaleTree, fullKey, out)
    } else {
      out.set(fullKey, value)
    }
  }
  return out
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) collectSourceFiles(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}

/** `t('key')`：前面不能是标识符/`.`/`$`，排除 `set(` / `it(` / `.t(` 这类误命中。 */
const LITERAL_PATTERNS = [
  /(?<![\w$.])t\(\s*(['"])([A-Za-z0-9_.-]+)\1/g,
  /(?<![\w$.])(?:i18next|i18n)\.t\(\s*(['"])([A-Za-z0-9_.-]+)\1/g,
]

/** ``t(`prefix.${x}`)``：只用于发现"有动态 key"，逐项与白名单比对。 */
const DYNAMIC_PATTERN = /(?<![\w$.])(?:(?:i18next|i18n)\.t|t)\(\s*`([^`]*)`/g

/**
 * 动态 key 白名单（规范化的模板串，`${...}` 统一写成 `${}`）。
 *
 * <p>新增动态 key 必须在这里登记并确认对应键在两侧 locale 都存在；白名单里过期项
 * 也会让门禁用例失败，避免"登记过就没人再管"。</p>
 */
const DYNAMIC_KEY_WHITELIST = [
  // src/utils/api-messages.ts
  'api.${}',
  // src/views/system/OperationLogPage.tsx（common.relativeTime.{second,minute,hour,day}）
  'common.relativeTime.${}',
  // src/components/DocumentFlowModal.tsx（documentFlow.types.*）
  'documentFlow.types.${}',
  // src/views/inventory/InventoryView.tsx（inventory.transactionType.*）
  'inventory.transactionType.${}',
  // src/layouts/PersonalSettingsContextMenuTab.tsx（layouts.settings.contextMenuItem.*）
  'layouts.settings.${}',
  // src/config/business-pages/operations/purchase-order-rules.ts
  'modules.pages.purchaseOrder.${}',
  // src/views/price-compare/SupplierQuotePage.tsx 与同目录 spec
  'priceCompare.supplierPrice.${}',
  // src/views/price-compare/SpotSyncActions.tsx
  'priceCompare.spotSync.scope.${}.desc',
  'priceCompare.spotSync.scope.${}.title',
] as const

interface UsedKeys {
  literal: Map<string, string[]>
  dynamic: Map<string, string[]>
}

/**
 * 扫描源码。跳过注释里举例的 `t('...')`：逐行沿用 i18n 审计脚本的注释判定
 * （行首 `//` / `*`、块注释区间），这些示例不是真实调用点。
 */
function scanSource(files: string[]): UsedKeys {
  const literal = new Map<string, string[]>()
  const dynamic = new Map<string, string[]>()
  const add = (map: Map<string, string[]>, key: string, at: string) => {
    const list = map.get(key)
    if (list) list.push(at)
    else map.set(key, [at])
  }

  for (const file of files) {
    const relativePath = file.slice(SRC_ROOT.length)
    const lines = readFileSync(file, 'utf8').split('\n')
    let inBlockComment = false
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (inBlockComment) {
        if (trimmed.includes('*/')) inBlockComment = false
        return
      }
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inBlockComment = true
        return
      }
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return

      const at = `${relativePath}:${index + 1}`
      for (const pattern of LITERAL_PATTERNS) {
        for (const match of line.matchAll(pattern)) {
          const key = match[2]
          if (key && /^[a-z]/.test(key)) add(literal, key, at)
        }
      }
      for (const match of line.matchAll(DYNAMIC_PATTERN)) {
        const template = match[1]
        if (template === undefined) continue
        const normalized = template.replace(/\$\{[^}]*\}/g, '${}')
        add(dynamic, normalized, at)
      }
    })
  }
  return { literal, dynamic }
}

const zhKeys = flattenKeys(zhCN)
const enKeys = flattenKeys(enUS)
const { literal: literalKeys, dynamic: dynamicKeys } = scanSource(
  collectSourceFiles(SRC_ROOT),
)

/** 把缺失清单渲染成可读的多行消息（含调用点，便于直接改代码）。 */
function describeMissing(
  locale: string,
  entries: [string, string[]][],
): string {
  return [
    `${entries.length} 个 key 在 ${locale} 中不存在：`,
    ...entries
      .slice(0, 20)
      .map(([key, where]) => `  ${key}  @ ${where.join(' , ')}`),
    ...(entries.length > 20 ? [`  …另有 ${entries.length - 20} 个`] : []),
  ].join('\n')
}

describe('i18n key 存在性门禁', () => {
  it('扫描器本身有效（键集合规模合理，避免正则失效后空跑全绿）', () => {
    expect(zhKeys.size).toBeGreaterThan(1500)
    expect(enKeys.size).toBeGreaterThan(1500)
    expect(literalKeys.size).toBeGreaterThan(1500)
  })

  it("源码 t('字面量') 用到的 key 在 zh-CN 与 en-US 两侧都存在", () => {
    const missingZh = [...literalKeys].filter(([key]) => !zhKeys.has(key))
    const missingEn = [...literalKeys].filter(([key]) => !enKeys.has(key))

    expect(
      missingZh.map(([key]) => key),
      describeMissing('zh-CN', missingZh),
    ).toEqual([])
    expect(
      missingEn.map(([key]) => key),
      describeMissing('en-US', missingEn),
    ).toEqual([])
  })

  it('zh-CN 与 en-US 的 key 集合完全相同（不允许单侧漂移）', () => {
    const onlyZh = [...zhKeys.keys()].filter((key) => !enKeys.has(key))
    const onlyEn = [...enKeys.keys()].filter((key) => !zhKeys.has(key))

    expect(
      onlyZh,
      `仅 zh-CN 有的 key（en-US 漏补）：${onlyZh.join(', ')}`,
    ).toEqual([])
    expect(
      onlyEn,
      `仅 en-US 有的 key（改名后另一侧残留）：${onlyEn.join(', ')}`,
    ).toEqual([])
  })

  it('模板串动态 key 全部登记在白名单里', () => {
    const whitelist = new Set<string>(DYNAMIC_KEY_WHITELIST)
    const unregistered = [...dynamicKeys].filter(
      ([template]) => !whitelist.has(template),
    )
    expect(
      unregistered.map(([template]) => template),
      `未登记的动态 key（请确认两侧 locale 存在后加入 DYNAMIC_KEY_WHITELIST）：\n${unregistered
        .map(([template, where]) => `  ${template}  @ ${where.join(' , ')}`)
        .join('\n')}`,
    ).toEqual([])
  })

  it('白名单没有过期项，且每个动态前缀在两侧 locale 中都能命中', () => {
    for (const template of DYNAMIC_KEY_WHITELIST) {
      expect(
        dynamicKeys.has(template),
        `白名单项已不再被使用，请删除：${template}`,
      ).toBe(true)

      const prefix = template.slice(0, template.indexOf('${'))
      expect(
        prefix.length,
        `动态 key 缺少静态前缀：${template}`,
      ).toBeGreaterThan(0)
      for (const [locale, keys] of [
        ['zh-CN', zhKeys],
        ['en-US', enKeys],
      ] as const) {
        expect(
          [...keys.keys()].some((key) => key.startsWith(prefix)),
          `${locale} 中没有任何 key 以 ${prefix} 开头（动态 key 前缀写错？）：${template}`,
        ).toBe(true)
      }
    }
  })
})
