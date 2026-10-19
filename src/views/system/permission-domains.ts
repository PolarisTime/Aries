/**
 * 权限配置界面用的「业务域」归类表。
 *
 * <p><b>为什么需要这张表</b>：后端把权限码按 `resource:action` 组织，共 53 个 resource。
 * 直接按字典序列出来就是现在这个界面 ——</p>
 *
 * <pre>
 * Manifest Exports / Upload Sessions / Attachments / Carriers / Cash Ledger / ...
 * </pre>
 *
 * <p>「附件清单导出」排第一、「销售订单」埋在中间，配置角色的用户根本找不到北。
 * 这张表把 53 个资源重新归到 8 个业务域，让左侧导航变成业务视角。</p>
 *
 * <p><b>维护约束</b>：新增后端资源时必须在这里登记，否则会落到「其他」域。
 * 有守卫测试断言「所有资源都被显式归类」——见 `permission-domains.spec.ts`。</p>
 */

/** 业务域标识。顺序即界面左侧导航的展示顺序。 */
export const PERMISSION_DOMAINS = [
  'sales',
  'purchase',
  'inventory',
  'finance',
  'logistics',
  'statement',
  'masterdata',
  'system',
] as const

export type PermissionDomain = (typeof PERMISSION_DOMAINS)[number]

/**
 * 未在表中登记的资源落到的兜底域。
 *
 * <p>之所以复用 `'system'` 而不是单开一个「其他」域：8 个域是产品确认过的导航结构，
 * 为一个**正常情况下不该出现**的情况多挂一个常空的分组，是噪声。真正要保证的是
 * 「有没有漏登记」——那由 {@link isResourceRegistered} + 守卫测试负责，不靠界面兜底。</p>
 */
export const FALLBACK_DOMAIN: PermissionDomain = 'system'

interface DomainDefinition {
  /** 域标识 */
  domain: PermissionDomain
  /** 中文标签（与 locales 里的 key 对应，见 getDomainLabel） */
  labelZh: string
  labelEn: string
  /** 该域下的资源码（后端 `split_part(code, ':', 1)` 的结果） */
  resources: readonly string[]
}

/**
 * 资源 → 业务域映射。**唯一来源**：界面分组、左侧导航计数、右侧汇总都读这里。
 *
 * <p>归类原则是「用户心理模型」而非技术实现：报价单/价格匹配属于销售（业务员在销售场景里用），
 * 商品导入/导入批次属于库存（仓管在维护库存数据时用），而不是按后端包名归类。</p>
 */
export const DOMAIN_DEFINITIONS: readonly DomainDefinition[] = [
  {
    domain: 'sales',
    labelZh: '销售',
    labelEn: 'Sales',
    resources: [
      'sales-orders',
      'sales-contracts',
      'sales-outbounds',
      'sales-returns',
      'quote-sheets',
      'quote-regions',
      'supplier-price-lists',
      'material-price-matches',
      'steel-quotes',
      'steel-quote-backfills',
      'steel-quote-calendars',
      'steel-quote-syncs',
    ],
  },
  {
    domain: 'purchase',
    labelZh: '采购',
    labelEn: 'Purchase',
    resources: ['purchase-orders', 'purchase-inbounds'],
  },
  {
    domain: 'inventory',
    labelZh: '库存',
    labelEn: 'Inventory',
    resources: [
      'inventory',
      'warehouses',
      'material-imports',
      'material-exports',
      'import-batches',
    ],
  },
  {
    domain: 'finance',
    labelZh: '财务',
    labelEn: 'Finance',
    resources: [
      'receipts',
      'payments',
      'cash-ledger',
      'ledger-adjustments',
      'finance',
      'code-issuances',
    ],
  },
  {
    domain: 'logistics',
    labelZh: '物流',
    labelEn: 'Logistics',
    resources: ['freight-bills', 'carriers'],
  },
  {
    domain: 'statement',
    labelZh: '对账',
    labelEn: 'Statements',
    resources: ['customer-statements', 'freight-statements'],
  },
  {
    domain: 'masterdata',
    labelZh: '主数据',
    labelEn: 'Master Data',
    resources: [
      'customers',
      'suppliers',
      'materials',
      'material-categories',
      'projects',
      'length-premiums',
      'value-aliases',
    ],
  },
  {
    domain: 'system',
    labelZh: '系统',
    labelEn: 'System',
    resources: [
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
    ],
  },
]

const RESOURCE_TO_DOMAIN: ReadonlyMap<string, PermissionDomain> = new Map(
  DOMAIN_DEFINITIONS.flatMap((definition) =>
    definition.resources.map(
      (resource) => [resource, definition.domain] as const,
    ),
  ),
)

/**
 * 解析资源所属业务域；未登记的资源归入 {@link FALLBACK_DOMAIN}。
 *
 * <p>不做 promise 式报错，是因为渲染期不能抛；「有没有漏登记」由守卫测试保证。</p>
 */
export function resolveDomain(resource: string): PermissionDomain {
  return RESOURCE_TO_DOMAIN.get(resource) ?? FALLBACK_DOMAIN
}

/**
 * 该资源是否已在归类表中**显式**登记。
 *
 * <p>与 {@link resolveDomain} 的区别：后者为了让界面永远能渲染，对未登记资源回退到兜底域，
 * 于是「登记到系统域」和「压根没登记」返回值相同。守卫测试与运行期校验必须用本函数，
 * 否则漏登记会被兜底掩盖。</p>
 */
export function isResourceRegistered(resource: string): boolean {
  return RESOURCE_TO_DOMAIN.has(resource)
}

/** 取业务域定义（标签、顺序）。 */
export function getDomainDefinition(
  domain: PermissionDomain,
): DomainDefinition {
  const found = DOMAIN_DEFINITIONS.find(
    (definition) => definition.domain === domain,
  )
  if (!found) {
    throw new Error(`未知业务域: ${domain}`)
  }
  return found
}

/** 按业务域分组资源，保持 {@link PERMISSION_DOMAINS} 的声明顺序。 */
export function groupResourcesByDomain(
  resources: readonly string[],
): Array<{ domain: PermissionDomain; resources: string[] }> {
  const buckets = new Map<PermissionDomain, string[]>()
  for (const domain of PERMISSION_DOMAINS) {
    buckets.set(domain, [])
  }
  for (const resource of resources) {
    buckets.get(resolveDomain(resource))?.push(resource)
  }
  return PERMISSION_DOMAINS.map((domain) => ({
    domain,
    resources: buckets.get(domain) ?? [],
  })).filter((group) => group.resources.length > 0)
}

/** 全部已登记的资源码（供守卫测试比对后端清单）。 */
export function registeredResources(): string[] {
  return DOMAIN_DEFINITIONS.flatMap((definition) => [...definition.resources])
}
