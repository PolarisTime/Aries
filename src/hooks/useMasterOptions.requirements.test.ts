import { describe, expect, it } from 'vitest'
import '@/i18n'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import { resolveMasterOptionRequirements } from '@/hooks/useMasterOptions'
import {
  readMasterOptionRequirements,
  tagMasterOptionRequirements,
} from '@/module-system/core/master-option-requirement-tag'
import {
  getCustomerOptions,
  getCustomerProjectOptions,
  getSettlementAccountOptions,
} from '@/module-system/core/module-option-resolvers'
import { getCarrierEntityOptions } from '@/queries/master/carrier-options'
import type { ModulePageConfig } from '@/types/module-page'

/**
 * 主数据需求判定的回归测试。
 *
 * <p>背景：字段 `options` 与解析器的**函数引用相等**判定在打包产物里会失效——同一模块被拆进多个
 * chunk、或浏览器在发版窗口内混用新旧 chunk 时会产生两个函数对象，判定静默为 false，
 * 结果是「项目下拉永远为空，且前后端都不报错」。因此改为读取函数上的全局 Symbol 标记，
 * 引用相等仅作兜底。</p>
 */

const optionDefinition = (options: unknown) =>
  ({ key: 'projectId', label: '', type: 'select', options }) as never

/** 全部业务页面配置（不含 test），用于「所有被引用的主数据解析器都必须带标记」的遍历守卫。 */
const businessPageModules = import.meta.glob(
  [
    '../config/business-pages/**/*.ts',
    '!../config/business-pages/**/*.test.ts',
  ],
  { eager: true },
)

/**
 * 主数据解析器的来源模块：这几个模块里的解析器读的是主数据查询缓存，
 * 只要被页面配置当 `options` 引用，就必须带打包安全标记。
 */
const masterResolverModules = import.meta.glob(
  [
    '../queries/master/*.ts',
    '../queries/system/company-settings.ts',
    '../module-system/core/module-option-resolvers.ts',
  ],
  { eager: true },
)

/**
 * 明确「不需要主数据」的解析器——本守卫唯一的放行口，新增一项必须写明理由。
 */
const RESOLVERS_WITHOUT_MASTER_DATA = new Map<unknown, string>([
  [
    getSettlementAccountOptions,
    '资金账户选项由编辑器按结算主体注入，不读主数据缓存',
  ],
])

function isPageConfig(value: unknown): value is ModulePageConfig {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ModulePageConfig).key === 'string' &&
    Array.isArray((value as ModulePageConfig).filters)
  )
}

/** 业务页面配置多半以 `Record<ModuleKey, ModulePageConfig>` 导出，因此要下沉一层再识别。 */
function collectPageConfigs(
  value: unknown,
  where: string,
  found: Array<{ where: string; config: ModulePageConfig }>,
  depth = 0,
): void {
  if (isPageConfig(value)) {
    found.push({ where, config: value })
    return
  }
  if (depth >= 2 || typeof value !== 'object' || value === null) {
    return
  }
  if (Array.isArray(value)) {
    return
  }
  for (const [key, nested] of Object.entries(value)) {
    collectPageConfigs(nested, `${where}.${key}`, found, depth + 1)
  }
}

function pageConfigs(): Array<{ where: string; config: ModulePageConfig }> {
  const found: Array<{ where: string; config: ModulePageConfig }> = []
  for (const [path, moduleExports] of Object.entries(businessPageModules)) {
    if (typeof moduleExports !== 'object' || moduleExports === null) {
      continue
    }
    for (const [exportName, value] of Object.entries(moduleExports)) {
      collectPageConfigs(value, `${path}#${exportName}`, found)
    }
  }
  // 同一配置可能被多个模块记录复用（如运费相关模块共享 statement 配置），按 key 去重。
  const byKey = new Map<string, { where: string; config: ModulePageConfig }>()
  for (const entry of found) {
    if (!byKey.has(entry.config.key)) {
      byKey.set(entry.config.key, entry)
    }
  }
  return [...byKey.values()]
}

/** 主数据来源模块导出的解析器函数 → 出处。 */
function masterDataResolvers(): Map<unknown, string> {
  const found = new Map<unknown, string>()
  for (const [path, moduleExports] of Object.entries(masterResolverModules)) {
    if (typeof moduleExports !== 'object' || moduleExports === null) {
      continue
    }
    for (const [exportName, value] of Object.entries(moduleExports)) {
      if (typeof value === 'function') {
        found.set(value, `${path}#${exportName}`)
      }
    }
  }
  return found
}

/** 页面配置里作为 `options` 被引用的解析器函数（筛选栏 + 表单字段）。 */
function referencedOptionResolvers(): Array<{
  where: string
  resolver: (...args: never[]) => unknown
}> {
  const found: Array<{
    where: string
    resolver: (...args: never[]) => unknown
  }> = []
  for (const { where, config } of pageConfigs()) {
    const fields = [
      ...(config.filters ?? []),
      ...(config.formFields ?? []),
    ] as Array<{ key?: string; options?: unknown }>
    for (const field of fields) {
      if (typeof field.options === 'function') {
        found.push({
          where: `${where}.${field.key ?? '?'}`,
          resolver: field.options as (...args: never[]) => unknown,
        })
      }
    }
  }
  return found
}

describe('主数据需求判定（打包安全）', () => {
  it('销售订单表单判定为需要客户与项目主数据', () => {
    const requirements = resolveMasterOptionRequirements(
      salesOrdersPageConfig.formFields,
    )

    expect(requirements.customers).toBe(true)
    expect(requirements.projects).toBe(true)
  })

  it('解析器带打包安全标记', () => {
    expect(readMasterOptionRequirements(getCustomerProjectOptions)).toEqual([
      'customers',
      'projects',
    ])
    expect(readMasterOptionRequirements(getCustomerOptions)).toEqual([
      'customers',
    ])
  })

  it('解析器被复制成另一个函数对象时仍能判定需求（不再依赖引用相等）', () => {
    // 模拟打包分块复制：函数体不同、对象不同，只保留同一个全局 Symbol 标记。
    const duplicatedResolver = tagMasterOptionRequirements(
      function duplicatedCustomerProjectOptions() {
        return []
      },
      ['customers', 'projects'],
    )
    expect(duplicatedResolver).not.toBe(getCustomerProjectOptions)

    const requirements = resolveMasterOptionRequirements([
      optionDefinition(duplicatedResolver),
    ])

    expect(requirements.customers).toBe(true)
    expect(requirements.projects).toBe(true)
  })

  it('未打标记的普通解析器不会误判需求', () => {
    const requirements = resolveMasterOptionRequirements([
      optionDefinition(() => []),
    ])

    expect(requirements.customers).toBe(false)
    expect(requirements.projects).toBe(false)
  })

  it('字段上的显式声明仍生效（不依赖解析器标记）', () => {
    const requirements = resolveMasterOptionRequirements([
      {
        key: 'projectId',
        label: '',
        type: 'select',
        options: () => [],
        masterOptionRequirements: { customers: true, projects: true },
      } as never,
    ])

    expect(requirements.customers).toBe(true)
    expect(requirements.projects).toBe(true)
  })
})

describe('主数据解析器标记的遍历守卫', () => {
  it('被页面配置引用为主数据下拉的解析器全部带标记（漏打会让下拉静默为空）', () => {
    const configs = pageConfigs()
    const referenced = referencedOptionResolvers()
    const masterResolvers = masterDataResolvers()

    // 守卫自身有效：扫不到页面配置/解析器说明 glob 或形状判定失效，用例会假绿。
    expect(configs.length).toBeGreaterThan(15)
    expect(referenced.length).toBeGreaterThan(10)

    const masterResolversInUse = referenced.filter(({ resolver }) =>
      masterResolvers.has(resolver),
    )
    expect(masterResolversInUse.length).toBeGreaterThan(5)

    const untagged = masterResolversInUse
      .filter(({ resolver }) => !readMasterOptionRequirements(resolver))
      .filter(({ resolver }) => !RESOLVERS_WITHOUT_MASTER_DATA.has(resolver))
      .map(
        ({ where, resolver }) =>
          `${where} 引用了未打标记的解析器 ${masterResolvers.get(resolver)}`,
      )

    expect(untagged).toEqual([])
  })

  it('放行口里的解析器确实不读主数据（避免放行口被当成垃圾桶）', () => {
    for (const [resolver, reason] of RESOLVERS_WITHOUT_MASTER_DATA) {
      expect(readMasterOptionRequirements(resolver)).toBeUndefined()
      expect(reason.length).toBeGreaterThan(0)
    }
  })

  it('承运商实体下拉解析器带标记（不再依赖函数引用相等）', () => {
    expect(readMasterOptionRequirements(getCarrierEntityOptions)).toEqual([
      'carriers',
    ])
  })

  it('物流单/运费对账单的承运商字段判定为需要承运商主数据', () => {
    const freightConfigs = pageConfigs().filter(({ config }) =>
      ['freight-bill', 'freight-statement'].includes(config.key),
    )

    expect(freightConfigs.map(({ config }) => config.key).sort()).toEqual([
      'freight-bill',
      'freight-statement',
    ])
    for (const { where, config } of freightConfigs) {
      const requirements = resolveMasterOptionRequirements(config.formFields)
      expect(requirements.carriers, `${where} 应需要承运商主数据`).toBe(true)
    }
  })

  it('承运商解析器被复制成另一个函数对象时需求判定仍成立', () => {
    // 打包分块会产生第二个函数对象；标记随函数对象复制，判定不再依赖引用相等。
    const duplicatedCarrierEntityOptions = tagMasterOptionRequirements(
      function duplicatedCarrierEntityOptions() {
        return []
      },
      ['carriers'],
    )
    expect(duplicatedCarrierEntityOptions).not.toBe(getCarrierEntityOptions)

    const requirements = resolveMasterOptionRequirements([
      optionDefinition(duplicatedCarrierEntityOptions),
    ])

    expect(requirements.carriers).toBe(true)
  })

  it('空标记数组视为未打标记，回退引用相等兜底（不被空数组吞掉）', () => {
    // 模拟打包分块把标记复制成空数组：调用方看到「有标记」就跳过兜底，
    // 需求会全部为 false，承运商下拉静默为空。
    tagMasterOptionRequirements(getCarrierEntityOptions, [])
    try {
      expect(
        readMasterOptionRequirements(getCarrierEntityOptions),
      ).toBeUndefined()
      expect(
        resolveMasterOptionRequirements([
          optionDefinition(getCarrierEntityOptions),
        ]).carriers,
      ).toBe(true)
    } finally {
      tagMasterOptionRequirements(getCarrierEntityOptions, ['carriers'])
    }
  })
})
