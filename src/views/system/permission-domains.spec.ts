import { describe, expect, it } from 'vitest'
import {
  DOMAIN_DEFINITIONS,
  FALLBACK_DOMAIN,
  getDomainDefinition,
  groupResourcesByDomain,
  isResourceRegistered,
  PERMISSION_DOMAINS,
  registeredResources,
  resolveDomain,
} from './permission-domains'

/**
 * 后端 `sys_permission` 表里实际出现的资源码快照（`split_part(code, ':', 1)`）。
 *
 * <p><b>这是一份快照，不是数据源</b>：界面渲染用的资源清单来自后端 `listPermissions()`。
 * 这份快照的作用是**在 CI 阶段发现「后端加了资源、归类表忘了登记」** —— 那种情况下
 * 资源会静默落进兜底域「系统」，用户在新界面里找不到它，而没有任何报错。</p>
 *
 * <p>维护方式：后端新增资源时，同步把资源码加到这个数组，再在 {@link DOMAIN_DEFINITIONS}
 * 里归到合适的业务域。守卫测试会指出漏了哪个。</p>
 */
const BACKEND_RESOURCE_SNAPSHOT = [
  'sales-orders',
  'sales-contracts',
  'sales-returns',
  'sales-outbounds',
  'quote-sheets',
  'quote-regions',
  'supplier-price-lists',
  'material-price-matches',
  'steel-quotes',
  'steel-quote-backfills',
  'steel-quote-calendars',
  'steel-quote-syncs',
  'purchase-orders',
  'purchase-inbounds',
  'inventory',
  'warehouses',
  'material-imports',
  'material-exports',
  'import-batches',
  'receipts',
  'payments',
  'cash-ledger',
  'ledger-adjustments',
  'finance',
  'code-issuances',
  'freight-bills',
  'carriers',
  'customer-statements',
  'freight-statements',
  'customers',
  'suppliers',
  'materials',
  'material-categories',
  'projects',
  'length-premiums',
  'value-aliases',
  'dashboard',
  'global-search',
  'meta',
  'module-exports',
  'operation-logs',
  'permissions',
  'roles',
  'system',
  'user-accounts',
  'company-settings',
  'print-templates',
  'print-exports',
  'print-previews',
  'attachments',
  'attachment-manifest-exports',
  'attachment-upload-sessions',
] as const

describe('permission-domains', () => {
  it('每个后端资源都必须显式归类，不能落到兜底域', () => {
    // 必须用 isResourceRegistered 而不是 resolveDomain() === FALLBACK_DOMAIN：
    // 兜底域本身就是 'system'，用后者会把「已正确归到系统域」的资源全判成漏登记。
    const unmapped = BACKEND_RESOURCE_SNAPSHOT.filter(
      (resource) => !isResourceRegistered(resource),
    )

    expect(
      unmapped,
      `以下资源未在 DOMAIN_DEFINITIONS 中登记，会静默落入「系统」域，用户找不到：\n` +
        unmapped.map((resource) => `  - ${resource}`).join('\n'),
    ).toEqual([])
  })

  it('归类表里不能有后端不存在的资源（防止改名后留下悬空条目）', () => {
    const known = new Set<string>(BACKEND_RESOURCE_SNAPSHOT)
    const ghosts = registeredResources().filter(
      (resource) => !known.has(resource),
    )

    expect(
      ghosts,
      `以下资源已不在后端权限清单中，应删除归类：${ghosts.join(', ')}`,
    ).toEqual([])
  })

  it('同一资源不得被登记到两个业务域', () => {
    const all = registeredResources()
    const duplicates = all.filter(
      (resource, index) => all.indexOf(resource) !== index,
    )

    expect(duplicates).toEqual([])
  })

  it('八个业务域按声明顺序完整存在且有标签', () => {
    expect(DOMAIN_DEFINITIONS.map((definition) => definition.domain)).toEqual([
      ...PERMISSION_DOMAINS,
    ])
    for (const definition of DOMAIN_DEFINITIONS) {
      expect(definition.labelZh.length).toBeGreaterThan(0)
      expect(definition.labelEn.length).toBeGreaterThan(0)
    }
  })

  it('未知资源回退到兜底域而不是抛异常', () => {
    expect(resolveDomain('some-future-resource')).toBe(FALLBACK_DOMAIN)
  })

  it('getDomainDefinition 对未知域抛明确错误', () => {
    // @ts-expect-error 故意传非法域，验证运行时防御
    expect(() => getDomainDefinition('not-a-domain')).toThrow('未知业务域')
  })

  it('groupResourcesByDomain 保持域声明顺序并丢弃空域', () => {
    const groups = groupResourcesByDomain([
      'freight-bills',
      'sales-orders',
      'customers',
    ])

    // sales 在 purchase 之前、logistics 之前 —— 按 PERMISSION_DOMAINS 顺序
    expect(groups.map((group) => group.domain)).toEqual([
      'sales',
      'logistics',
      'masterdata',
    ])
    expect(groups.every((group) => group.resources.length > 0)).toBe(true)
  })

  it('groupResourcesByDomain 把未登记资源放进兜底域', () => {
    const groups = groupResourcesByDomain([
      'sales-orders',
      'brand-new-resource',
    ])
    const systemGroup = groups.find((group) => group.domain === FALLBACK_DOMAIN)

    expect(systemGroup?.resources).toContain('brand-new-resource')
  })
})
