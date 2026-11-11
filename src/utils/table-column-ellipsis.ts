import type { ModuleColumnType } from '@/types/module-page-fields'

/**
 * 「放不下时能不能省略」的唯一判定处（列表主表、父单据选择、明细表共用）。
 *
 * <p>短值——数值、日期、状态、布尔——是拿来**一眼比对**的：`12345678.90` 被截成
 * `123456…` 既读不出量级也比不了大小，`2026-11-11` 截成 `2026-11…` 直接是错的日期。
 * 因此这些类型默认**不省略**，放不下就让表格横向滚动（各表的 `scroll.x` 都等于列宽合计）。
 * 文本类（客户名、项目名、备注…）默认省略，全文由 antd 写进 `title`，悬停/读屏仍可拿到。</p>
 *
 * <p>列上显式声明 `ellipsis` 时以声明为准（明细字段目录就是这么用的）。</p>
 */
const NO_ELLIPSIS_TYPES: ReadonlySet<ModuleColumnType> =
  new Set<ModuleColumnType>([
    'amount',
    'weight',
    'count',
    'date',
    'datetime',
    'status',
    'boolean',
  ])

export function shouldEllipsizeColumn(column: {
  type?: ModuleColumnType
  ellipsis?: boolean
}): boolean {
  if (column.ellipsis !== undefined) {
    return column.ellipsis
  }
  if (column.type && NO_ELLIPSIS_TYPES.has(column.type)) {
    return false
  }
  return true
}
