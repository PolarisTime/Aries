import type { AppIconKey } from '@/config/navigation-registry-types'

/**
 * 角色模板：把「配一个业务员要从 166 个权限码里手工勾选」变成「一键套用后再微调」。
 *
 * <p><b>为什么需要这一层</b>：系统里长期只有 `SUPER_ADMIN`（权限 `*`）和一个压测角色，
 * 没有任何业务角色。根因不是不想配，而是配一个业务员的成本太高——166 个权限码、53 个资源，
 * 手工勾选容易漏、也容易多给。结果是大家干脆都给超管，权限最小化彻底失效。</p>
 *
 * <p><b>设计约束（三条，改动前请先读）</b>：</p>
 * <ol>
 *   <li><b>模板是起点不是牢笼</b>：套用是**并集**语义，绝不清空用户已选的权限，
 *       套用后可以自由增删。{@link applyTemplate} 的注释里有为什么不做「替换」的理由。</li>
 *   <li><b>权限码必须真实存在</b>：模板里写错一个码不会报错，只会让用户静默少一项权限
 *       （后端校验未知码时通常忽略）。因此 {@link validateTemplate} 是必需件而非可选项，
 *       配套守卫测试见 `permission-templates.spec.ts`。</li>
 *   <li><b>本文件是纯数据 + 纯函数</b>：不 import React、不读 store、不碰 UI。
 *       UI 集成由 `RoleWizardModal` 负责。</li>
 * </ol>
 *
 * <p><b>权限码来源</b>：2026-10-19 实测 `lesys_permission` 表，共 166 个码 / 53 个资源。
 * 其中字段级（`resource:action:field`）共 3 个：`sales-orders:read:amount`、
 * `sales-orders:update:unit-price`、`inventory:read:cost`。新增后端权限后本文件不需要改，
 * 但模板想用新码时需要同步更新 spec 里的快照（见该文件顶部注释）。</p>
 */

/** 权限码。后端形如 `resource:action`，字段级为 `resource:action:field`。 */
export type PermissionCode = string

/** antd Tag 预设色，用于模板卡片/徽标。 */
export type PermissionTemplateColor =
  | 'blue'
  | 'cyan'
  | 'gold'
  | 'green'
  | 'purple'

export interface PermissionTemplate {
  /** 稳定标识（埋点、持久化最近使用的模板）。不要用来展示。 */
  code: string
  nameZh: string
  nameEn: string
  descriptionZh: string
  descriptionEn: string
  /** antd 图标；用 {@link AppIconKey} 保证 `resolveAppIcon` 一定认得。 */
  icon: AppIconKey
  color: PermissionTemplateColor
  /**
   * 该模板包含的权限码。**已排序、已去重**，因此可直接用于数组相等比较
   * （见 {@link matchTemplate} 的精确匹配判定）。
   */
  permissions: readonly PermissionCode[]
  /**
   * 数据范围说明。
   *
   * <p><b>为什么是文案而不是权限码</b>：后端目前没有「团队/全部」这类数据范围权限码
   * （166 个码里没有任何 `*:read:team` 形态），`sys_role` 也没有 dataScope 字段。
   * 所以「主管看团队数据」这件事当前**无法用权限码表达**，只能作为提示告知用户
   * 「套用后仍需另行配置数据范围」。不要为了凑字段而臆造一个码。</p>
   */
  dataScopeNoteZh?: string
  dataScopeNoteEn?: string
}

/**
 * 四个业务角色模板。
 *
 * <p>数组顺序 = UI 展示顺序，也是 {@link matchTemplate} 的最终 tie-break 依据。</p>
 */
export const PERMISSION_TEMPLATES: readonly PermissionTemplate[] = [
  {
    code: 'salesperson',
    nameZh: '业务员',
    nameEn: 'Salesperson',
    descriptionZh: '开销售单、查项目与客户、报价单开单',
    descriptionEn:
      'Create sales orders, view projects/customers, create quotes',
    icon: 'UserOutlined',
    color: 'blue',
    permissions: [
      'customers:read',
      'projects:read',
      'quote-sheets:create',
      'quote-sheets:read',
      'quote-sheets:update',
      'sales-orders:create',
      'sales-orders:delete',
      'sales-orders:export',
      'sales-orders:read',
      'sales-orders:update',
      'sales-outbounds:read',
      'sales-returns:read',
    ],
  },
  {
    code: 'supervisor',
    nameZh: '主管',
    nameEn: 'Supervisor',
    descriptionZh: '业务员全部权限，另加金额可见、销售合同与出库/退货全量',
    descriptionEn:
      'Everything a salesperson has, plus amount visibility and full sales contract/outbound/return access',
    icon: 'TeamOutlined',
    color: 'purple',
    permissions: [
      'customers:read',
      'projects:read',
      'quote-sheets:create',
      'quote-sheets:read',
      'quote-sheets:update',
      'sales-contracts:create',
      'sales-contracts:delete',
      'sales-contracts:read',
      'sales-contracts:update',
      'sales-orders:create',
      'sales-orders:delete',
      'sales-orders:export',
      'sales-orders:read',
      'sales-orders:read:amount',
      'sales-orders:update',
      'sales-outbounds:audit',
      'sales-outbounds:create',
      'sales-outbounds:delete',
      'sales-outbounds:read',
      'sales-outbounds:unaudit',
      'sales-outbounds:update',
      'sales-returns:audit',
      'sales-returns:create',
      'sales-returns:delete',
      'sales-returns:read',
      'sales-returns:unaudit',
      'sales-returns:update',
    ],
    dataScopeNoteZh: '数据范围（本人/团队/全部）需在角色数据权限里另行配置',
    dataScopeNoteEn:
      'Data scope (own/team/all) must be configured separately in role data permissions',
  },
  {
    code: 'dispatcher',
    nameZh: '调度',
    nameEn: 'Dispatcher',
    descriptionZh: '物流单全流程，查承运商、仓库与入库/出库单',
    descriptionEn:
      'Full freight bill access, read carriers, warehouses, inbound and outbound orders',
    icon: 'CarOutlined',
    color: 'cyan',
    permissions: [
      'carriers:read',
      'freight-bills:audit',
      'freight-bills:create',
      'freight-bills:delete',
      'freight-bills:read',
      'freight-bills:update',
      'purchase-inbounds:read',
      'sales-outbounds:read',
      'warehouses:read',
    ],
  },
  {
    code: 'finance',
    nameZh: '财务',
    nameEn: 'Finance',
    descriptionZh: '收付款与对账全流程，台账调整，可见金额与成本',
    descriptionEn:
      'Full receipts/payments and statements, ledger adjustments, amount and cost visibility',
    icon: 'AccountBookOutlined',
    color: 'gold',
    permissions: [
      'cash-ledger:export',
      'cash-ledger:read',
      'customer-statements:confirm',
      'customer-statements:create',
      'customer-statements:delete',
      'customer-statements:read',
      'customer-statements:update',
      'freight-statements:audit',
      'freight-statements:create',
      'freight-statements:delete',
      'freight-statements:read',
      'freight-statements:update',
      'inventory:read:cost',
      'ledger-adjustments:audit',
      'ledger-adjustments:create',
      'ledger-adjustments:delete',
      'ledger-adjustments:read',
      'ledger-adjustments:update',
      'payments:audit',
      'payments:create',
      'payments:delete',
      'payments:read',
      'payments:update',
      'receipts:audit',
      'receipts:create',
      'receipts:delete',
      'receipts:read',
      'receipts:update',
      'sales-orders:read:amount',
    ],
  },
]

/** 按 code 取模板；不存在返回 undefined（不抛错，便于 UI 容错）。 */
export function getPermissionTemplate(
  code: string,
): PermissionTemplate | undefined {
  return PERMISSION_TEMPLATES.find((template) => template.code === code)
}

/** 单个模板的校验结果。 */
export interface TemplateValidation {
  templateCode: string
  /** 模板里写了、但真实权限清单里没有的码。非空即「静默丢权限」风险。 */
  unknownCodes: PermissionCode[]
  /** 同一模板内重复出现的码（会让「模板共 N 项」的计数虚高）。 */
  duplicateCodes: PermissionCode[]
  /** 模板权限码是否按字典序排列（{@link matchTemplate} 依赖此不变量做快速相等判断）。 */
  sorted: boolean
  /** 三项全过才为 true。 */
  ok: boolean
}

/**
 * 校验单个模板的权限码是否全部真实存在。
 *
 * <p><b>为什么必须有它</b>：模板里的错误码不会在类型层暴露（`permissions` 是
 * `readonly string[]`），也不会在运行时报错——后端对未知权限码通常只是忽略，
 * 表现是「用户套用了模板，但少了一项权限」这种**静默失效**。这类缺陷只能靠
 * 与真实清单比对来拦。</p>
 *
 * @param knownCodes 真实权限码集合。生产代码可从 `listPermissions()` 构造；
 *   测试里用快照构造（见 spec）。
 */
export function validateTemplate(
  template: PermissionTemplate,
  knownCodes: ReadonlySet<string>,
): TemplateValidation {
  const seen = new Set<PermissionCode>()
  const unknownCodes: PermissionCode[] = []
  const duplicateCodes: PermissionCode[] = []

  for (const code of template.permissions) {
    if (!knownCodes.has(code)) {
      unknownCodes.push(code)
    }
    if (seen.has(code)) {
      duplicateCodes.push(code)
    }
    seen.add(code)
  }

  const sorted = isSortedAscending(template.permissions)

  return {
    templateCode: template.code,
    unknownCodes,
    duplicateCodes,
    sorted,
    ok: unknownCodes.length === 0 && duplicateCodes.length === 0 && sorted,
  }
}

/** 一次校验全部模板，返回每个模板的结果（含通过项），便于测试断言「一个都不能错」。 */
export function validateAllTemplates(
  knownCodes: ReadonlySet<string>,
): TemplateValidation[] {
  return PERMISSION_TEMPLATES.map((template) =>
    validateTemplate(template, knownCodes),
  )
}

/**
 * 套用模板：返回「当前已选 ∪ 模板权限」。
 *
 * <p><b>为什么是并集而不是替换</b>：模板的定位是「一键套用后自由微调」，用户很可能
 * 先手工勾了几项、再套模板补全。若做成替换，用户先前的手工选择会被静默清空——
 * 对权限配置来说这是**丢授权**，比多授权更难排查（用户会以为权限突然没了）。
 * 另外替换语义下「套用」可能是降权操作，而按钮文案是「套用」，语义不符。</p>
 *
 * <p>返回**已排序、已去重**的新数组，不修改入参；相同输入永远得到相同输出，
 * 便于 UI 做脏检查与测试断言。</p>
 */
export function applyTemplate(
  template: PermissionTemplate,
  currentSelected: readonly PermissionCode[],
): PermissionCode[] {
  const merged = new Set<PermissionCode>(currentSelected)
  for (const code of template.permissions) {
    merged.add(code)
  }
  return [...merged].toSorted(compareCodes)
}

/** 模板与当前选择的差异。 */
export interface TemplateDiff {
  /** 套用后会**新增**的权限码（模板有、当前没有）。UI 文案「套用后会增加 N 项」取它。 */
  added: PermissionCode[]
  /**
   * 当前已选、但模板里没有的权限码。并集语义下套用后**仍然保留**，
   * 因此 UI 应提示「另有 N 项自定义权限会保留」，不要写成「将被移除」。
   */
  retained: PermissionCode[]
  /**
   * 恒为空数组。
   *
   * <p>保留这个字段有两个目的：（1）让调用方按 `{ added, removed }` 解构时不必改；
   * （2）把「{@link applyTemplate} 是并集、永不删除」这件事**显式表达在类型上**，
   * 而不是靠调用方记住注释。若将来真做了「替换」语义，这里才会非空，
   * 配套测试会立刻红（见 spec 的 `removed 恒为空` 用例）。</p>
   */
  removed: PermissionCode[]
}

/**
 * 计算套用模板的差异（供 UI 提示「会增加 N 项」）。
 *
 * <p>不改变任何状态，纯函数。`diff.retained.length` 可直接用于「另有 N 项保留」文案。</p>
 */
export function diffTemplate(
  template: PermissionTemplate,
  currentSelected: readonly PermissionCode[],
): TemplateDiff {
  const current = new Set<PermissionCode>(currentSelected)
  const templateCodes = new Set<PermissionCode>(template.permissions)

  const added: PermissionCode[] = []
  for (const code of templateCodes) {
    if (!current.has(code)) {
      added.push(code)
    }
  }

  const retained: PermissionCode[] = []
  for (const code of current) {
    if (!templateCodes.has(code)) {
      retained.push(code)
    }
  }

  return {
    added: added.toSorted(compareCodes),
    retained: retained.toSorted(compareCodes),
    removed: [],
  }
}

/** 匹配程度：完全匹配 / 部分匹配 / 不匹配。 */
export type TemplateMatchKind = 'exact' | 'partial' | 'none'

export interface TemplateMatch {
  kind: TemplateMatchKind
  /** 命中的模板；`kind === 'none'` 时为 null。 */
  template: PermissionTemplate | null
  /**
   * 当前选择与模板的 Jaccard 相似度（0..1），`kind === 'none'` 时为 0。
   * 等于 `|交集| / |并集|`，因此「套用了模板又加了很多额外权限」会被如实降分。
   */
  similarity: number
  /** 模板中尚未勾选的权限码（UI 可提示「还差 N 项」）。 */
  missing: PermissionCode[]
  /** 当前已选但不在该模板内的权限码（UI 可提示「另有 N 项自定义」）。 */
  extra: PermissionCode[]
}

/**
 * 判定「部分匹配」的相似度下限。
 *
 * <p>取 0.6 的理由：模板定位是「套用后微调」，常见情况是加/减几项——
 * 以最小的模板（调度 9 项）为例，加 3 项仍可识别（9/12 = 0.75），
 * 加 6 项刚好到边界（9/15 = 0.6）；以主管 27 项为例，删 10 项仍可识别（17/27 = 0.63）。
 * 低于这个比例说明用户已经基本重写了一套权限，继续声称「已套用某模板」会误导。</p>
 */
const PARTIAL_MATCH_MIN_SIMILARITY = 0.6

/** 模板与当前选择的比对明细。**唯一计算处**：matchTemplate / matchTemplates 共用。 */
interface TemplateScore {
  template: PermissionTemplate
  intersection: number
  missing: PermissionCode[]
  extra: PermissionCode[]
  /** `|交集| / |并集|`；两边都为空时为 0（不会命中阈值，故不影响结论）。 */
  similarity: number
}

/**
 * 计算「模板 vs 当前选择」的相似度明细。
 *
 * <p>抽成单一出口的原因：`matchTemplate`（取最佳）与 `matchTemplates`（取候选列表）
 * 必须用**同一套**评分口径，否则两个 UI 出口会对同一份选择给出矛盾结论
 * （一个说「已套用财务」、另一个不给财务候选）。</p>
 */
function scoreTemplate(
  template: PermissionTemplate,
  current: ReadonlySet<PermissionCode>,
  currentList: readonly PermissionCode[],
): TemplateScore {
  const templateCodes = new Set<PermissionCode>(template.permissions)
  const missing: PermissionCode[] = []
  let intersection = 0

  for (const code of templateCodes) {
    if (current.has(code)) {
      intersection += 1
    } else {
      missing.push(code)
    }
  }

  const extra = currentList.filter((code) => !templateCodes.has(code))
  const union = intersection + missing.length + extra.length

  return {
    template,
    intersection,
    missing: missing.toSorted(compareCodes),
    extra: extra.toSorted(compareCodes),
    similarity: union === 0 ? 0 : intersection / union,
  }
}

/** 当前选择是否与模板**集合完全相等**（用于 exact 判定；不依赖数组顺序）。 */
function isExactMatch(
  template: PermissionTemplate,
  current: ReadonlySet<PermissionCode>,
): boolean {
  return (
    template.permissions.length === current.size &&
    template.permissions.every((code) => current.has(code))
  )
}

/**
 * 识别当前选择最接近哪个模板。
 *
 * <p>判定顺序（先命中先返回）：</p>
 * <ol>
 *   <li><b>exact</b>：权限集合与某模板完全相同 → UI 显示「已套用：业务员」；</li>
 *   <li><b>partial</b>：相似度最高且 ≥ {@link PARTIAL_MATCH_MIN_SIMILARITY}
 *       → UI 显示「已套用：业务员（另有 N 项自定义）」；</li>
 *   <li><b>none</b>：都达不到阈值（含当前为空）→ UI 显示「未套用模板」。</li>
 * </ol>
 *
 * <p>多模板同分时的 tie-break，按顺序：相似度更高 → `extra` 更少（更贴合的模板）→
 * 模板更小（更具体）→ 声明顺序。这样「同时套了调度和财务的并集」会归到财务
 * （29/38 = 0.76 优于 9/38 = 0.24），而不是随机落到数组里靠前的那个。</p>
 *
 * <p>当前选择为空时返回 `none`——空角色不应该被说成「已套用业务员」。</p>
 */
export function matchTemplate(
  currentSelected: readonly PermissionCode[],
): TemplateMatch {
  const current = new Set<PermissionCode>(currentSelected)

  if (current.size === 0) {
    return {
      kind: 'none',
      template: null,
      similarity: 0,
      missing: [],
      extra: [],
    }
  }

  // 1) 精确匹配优先：集合相等即「就是套了这个模板」，不受相似度阈值影响
  for (const template of PERMISSION_TEMPLATES) {
    if (isExactMatch(template, current)) {
      return {
        kind: 'exact',
        template,
        similarity: 1,
        missing: [],
        extra: [],
      }
    }
  }

  // 2) 部分匹配：按 Jaccard 相似度取最高
  let best: TemplateScore | null = null

  for (const template of PERMISSION_TEMPLATES) {
    const score = scoreTemplate(template, current, currentSelected)
    if (score.similarity < PARTIAL_MATCH_MIN_SIMILARITY) {
      continue
    }

    const better =
      best === null ||
      score.similarity > best.similarity ||
      (score.similarity === best.similarity &&
        score.extra.length < best.extra.length) ||
      (score.similarity === best.similarity &&
        score.extra.length === best.extra.length &&
        score.template.permissions.length < best.template.permissions.length)

    if (better) {
      best = score
    }
  }

  if (!best) {
    return {
      kind: 'none',
      template: null,
      similarity: 0,
      missing: [],
      extra: [],
    }
  }

  return {
    kind: 'partial',
    template: best.template,
    similarity: best.similarity,
    missing: best.missing,
    extra: best.extra,
  }
}

/**
 * 返回相似度达标的全部模板，供 UI 做「你可能想用…」的候选列表。
 *
 * <p>与 {@link matchTemplate} 共用 {@link scoreTemplate} 的评分口径，因此两者
 * 对同一份选择给出的模板集合不会矛盾。</p>
 */
export function matchTemplates(
  currentSelected: readonly PermissionCode[],
): TemplateMatch[] {
  const current = new Set<PermissionCode>(currentSelected)
  if (current.size === 0) {
    return []
  }

  return PERMISSION_TEMPLATES.map((template) =>
    scoreTemplate(template, current, currentSelected),
  )
    .filter((score) => score.similarity >= PARTIAL_MATCH_MIN_SIMILARITY)
    .sort((left, right) => right.similarity - left.similarity)
    .map((score) => ({
      kind:
        score.missing.length === 0 && score.extra.length === 0
          ? ('exact' as const)
          : ('partial' as const),
      template: score.template,
      similarity: score.similarity,
      missing: score.missing,
      extra: score.extra,
    }))
}

/** 权限码是否按 {@link compareCodes} 的字典序升序排列（{@link matchTemplate} 依赖此不变量）。 */
function isSortedAscending(codes: readonly PermissionCode[]): boolean {
  for (let index = 1; index < codes.length; index += 1) {
    if (compareCodes(codes[index - 1], codes[index]) > 0) {
      return false
    }
  }
  return true
}

/**
 * 权限码排序：按 code point 升序。
 *
 * <p>刻意不用 `localeCompare`：`localeCompare` 的结果依赖运行环境的 locale，
 * 同一份数据在不同机器/语言设置下可能排出不同顺序，从而破坏
 * {@link isSortedAscending} 与「相同输入相同输出」的稳定性。</p>
 */
function compareCodes(left: PermissionCode, right: PermissionCode): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}
