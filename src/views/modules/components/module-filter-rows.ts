/**
 * 默认排到第二行的筛选字段——「往来方 + 项目」这一类**主数据维度**。
 *
 * <p>筛选区是 4 列网格、默认两行。第一行留给「这张单本身」的属性（单号、状态、
 * 单据日期、结算主体），查单号/查状态是最高频的动作；客户、供应商、物流商、项目
 * 这类主数据维度取值长、需要下拉挑，放第二行后第一行能排满高频条件，
 * 也符合「先定位单据、再按往来方收窄」的查找顺序。</p>
 *
 * <p>只在页面配置**没有显式写 `row`** 时生效：
 * 个别页面若确实想把客户放第一行，写 `row: 1` 即可覆盖。</p>
 */
const SECOND_ROW_FILTER_KEYS: ReadonlySet<string> = new Set([
  'customerId',
  'customerName',
  'supplierId',
  'supplierName',
  'carrierId',
  'carrierName',
  'projectId',
  'projectName',
])

/** 行分组只看这两个字段；用结构类型让调用方保留完整的元素类型 */
interface FilterRowFields {
  key: string
  row?: number
}

/**
 * 解析一个筛选项落在第几行：显式 `row` > 默认规则（往来方/项目 → 2，其余 → 1）。
 *
 * <p>返回值只用于**排序**（渲染顺序 = 配置顺序，`row` 只决定行分组），
 * 所以两行之外的值（如 `row: 3`）不会被截断，仍会按数值排到后面。</p>
 */
export function resolveFilterRow(field: FilterRowFields): number {
  if (typeof field.row === 'number') return field.row
  return SECOND_ROW_FILTER_KEYS.has(field.key) ? 2 : 1
}

/**
 * 按「行号升序 + 同行的声明顺序」给筛选字段排序。
 *
 * <p>`Array.prototype.sort` 自 ES2019 起保证稳定，因此同一行内保持配置里的先后，
 * 不需要额外的序号字段。</p>
 */
export function sortFilterFieldsByRow<T extends FilterRowFields>(
  fields: readonly T[],
): T[] {
  return fields.toSorted(
    (left, right) => resolveFilterRow(left) - resolveFilterRow(right),
  )
}
