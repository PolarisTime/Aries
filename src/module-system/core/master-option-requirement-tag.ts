/**
 * 主数据下拉需求的**打包安全标记**。
 *
 * <p>「某个表单字段需要哪些主数据下拉」原先只靠字段 `options` 与解析器的**函数引用相等**
 * 来判定（见 {@link resolveMasterOptionRequirements}）。引用相等在打包产物里很脆弱：同一模块
 * 被拆进多个 chunk（或浏览器在发版窗口内混用了新旧 chunk）时会产生两个函数对象，引用相等静默
 * 失败、没有任何报错，表现为下拉永远为空。</p>
 *
 * <p>这里把需求额外挂到解析器函数的全局 Symbol 标记上：标记随函数对象一起被复制，读取端只读标记，
 * 不再依赖引用。引用相等判定作为兜底保留，未打标记的第三方/历史解析器行为不变。</p>
 */
export const MASTER_OPTION_REQUIREMENTS_TAG = Symbol.for(
  'leo.masterOptionRequirements',
)

/** 主数据需求的键集合，与 {@link ModuleMasterOptionRequirements} 的字段一一对应。 */
export type MasterOptionRequirementKey =
  | 'suppliers'
  | 'customers'
  | 'projects'
  | 'carriers'
  | 'settlementCompanies'
  | 'warehouses'
  | 'materialCategories'
  | 'materialGrades'
  | 'materials'
  | 'brands'
  /** 定尺主数据（`/length-premiums` 的「正常」选项）：材料录入长度下拉、比价定尺加价/排序。 */
  | 'lengthPremiums'

export type MasterOptionRequirementsTag = readonly MasterOptionRequirementKey[]

/** 给解析器打上需求标记；返回同一个函数对象，便于 `export const x = tagMasterOptionRequirements(...)`。 */
export function tagMasterOptionRequirements<
  Resolver extends (...args: never[]) => unknown,
>(resolver: Resolver, keys: MasterOptionRequirementsTag): Resolver {
  Object.defineProperty(resolver, MASTER_OPTION_REQUIREMENTS_TAG, {
    value: keys,
    enumerable: false,
    configurable: true,
  })
  return resolver
}

/** 读取解析器上的需求标记；未打标记（含标记为空数组）时返回 undefined，由调用方回退到引用相等判定。 */
export function readMasterOptionRequirements(
  resolver: unknown,
): MasterOptionRequirementsTag | undefined {
  if (typeof resolver !== 'function') {
    return undefined
  }
  const tagged = (resolver as unknown as Record<symbol, unknown>)[
    MASTER_OPTION_REQUIREMENTS_TAG
  ]
  // 空数组必须按「未打标记」处理：调用方看到标记就跳过引用相等兜底，
  // 空的 `[]` 会让兜底被吞掉，需求判定全部为 false（下拉静默为空）。
  if (!Array.isArray(tagged) || tagged.length === 0) {
    return undefined
  }
  return tagged as MasterOptionRequirementsTag
}
