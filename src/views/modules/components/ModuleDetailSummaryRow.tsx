import { Table, type TableColumnsType } from 'antd'
import type { Key } from 'react'
import type { ModuleDetailSummaryCell } from '@/types/module-page'

/**
 * 列 `align` 的取值**直接取自 antd 列类型**，不在这里手写子集。
 *
 * <p>antd 6 的 `AlignType` 是 `start | end | left | right | center | justify |
 * match-parent`：手写成 `'left' | 'center' | 'right'` 比它窄，调用方把
 * `TableColumnsType` 原样传进来时只能写 `as` 收窄断言 —— 断言一旦存在，将来谁给列
 * 填了 `'end'`（antd 的右对齐别名）都不会被类型检查发现，合计行会静默按默认对齐渲染。</p>
 */
type ModuleDetailSummaryAlign = NonNullable<TableColumnsType[number]['align']>

/**
 * 汇总行只依赖列定义里的这几个字段，因此不直接耦合 antd 的完整列类型
 * （`TableColumnsType` 的结构化子集也能直接传进来）。
 */
export interface ModuleDetailSummaryColumn {
  dataIndex?: unknown
  key?: Key
  className?: string
  align?: ModuleDetailSummaryAlign
}

export interface ModuleDetailSummaryRowProps {
  /** 明细表列定义，用于把合计单元格横移到对应列。 */
  columns: readonly ModuleDetailSummaryColumn[]
  /** 合计单元格；`dataIndex` 命中的按列对齐，没有 `dataIndex` 的按顺序补空列。 */
  cells: ModuleDetailSummaryCell[]
}

/**
 * 数值列标记类。
 *
 * <p>**与 `buildDetailItemColumns` 打的是同一个类名**：右对齐由 `pages.css`、
 * 等宽字体由 `module-detail.css` 统一提供，合计行因此和明细行共用同一份「数值列」
 * 口径 —— 不要在这里另造第二个名字，否则两处样式会各自漂移。</p>
 */
const NUMERIC_CELL_CLASS = 'module-detail-table-cell--numeric'

interface ResolvedSummarySlot {
  key: string
  cell: ModuleDetailSummaryCell | null
  column: ModuleDetailSummaryColumn | undefined
  index: number
}

function isNumericColumn(
  column: ModuleDetailSummaryColumn | undefined,
): boolean {
  return column?.className?.split(/\s+/).includes(NUMERIC_CELL_CLASS) ?? false
}

/**
 * 把合计单元格排进列槽位：**一列一个槽**，缺数据的列渲染空单元格。
 *
 * <p>不能只渲染「有数的单元格」——antd 的汇总单元格是按顺序铺 <td> 的，
 * 中间少一个就会让后面的数字整体左移，金额落到「重量」列下面。</p>
 *
 * <p>分两轮：先按 `dataIndex` 精确匹配（没配 `dataIndex` 的按顺序占位），
 * `dataIndex` 匹配不到的单元格再从最左侧空槽依次填入，空槽填满后才追加到行末。</p>
 */
function resolveSummarySlots(
  columns: readonly ModuleDetailSummaryColumn[],
  cells: ModuleDetailSummaryCell[],
): ResolvedSummarySlot[] {
  const remaining = [...cells]
  const slots = columns.map((column, index): ResolvedSummarySlot => {
    const dataIndex =
      typeof column.dataIndex === 'string' ? column.dataIndex : undefined
    let matched =
      dataIndex === undefined
        ? -1
        : remaining.findIndex((cell) => cell.dataIndex === dataIndex)
    if (matched < 0) {
      matched = remaining.findIndex((cell) => cell.dataIndex === undefined)
    }
    const cell = matched < 0 ? undefined : remaining[matched]
    if (matched < 0 || cell === undefined) {
      return { key: `summary-empty-${index}`, cell: null, column, index }
    }
    remaining.splice(matched, 1)
    return { key: cell.key, cell, column, index }
  })

  /*
   * 第二轮：`dataIndex` 在列里**找不到**的单元格（例如销售订单合计行的 `dataIndex: '#'`，
   * 明细表根本没有序号列）从**最左侧的空槽**开始依次填入。
   *
   * <p>上一版是追加到行末：明细表是 `table-layout: fixed` + 横向滚动
   * （`ModuleItemsTable` 的 `scroll.x`），列占满后多出来的一格落在滚动区外，
   * 用户看不到。销售订单的「合计（N 行）」正是因此被横向裁剪，只剩右侧几个数字。
   * 填最左空槽既让标签可见，又保证「数值仍落在自己列下」这一读法。</p>
   */
  const emptySlotIndexes = slots
    .map((slot, index) => (slot.cell === null ? index : -1))
    .filter((index) => index >= 0)
  emptySlotIndexes.forEach((slotIndex, offset) => {
    const cell = remaining[offset]
    if (cell === undefined) return
    slots[slotIndex] = {
      key: cell.key,
      cell,
      column: columns[slotIndex],
      index: slotIndex,
    }
  })
  remaining.splice(0, emptySlotIndexes.length)

  /* 空槽填满后仍多余的单元格追加到末尾（宁可多一格，也不静默丢合计值）。 */
  remaining.forEach((cell, offset) => {
    slots.push({
      key: cell.key,
      cell,
      column: undefined,
      index: columns.length + offset,
    })
  })

  return slots
}

/**
 * 明细合计行（antd `Table.Summary.Row`）。
 *
 * <p>用法：把本组件作为 `summary` 的返回值交给 `ModuleItemsTable` /
 * `ModuleItemGroupsView` 的 `summary` prop，列定义与明细表传同一份，
 * 合计数字才能和上面的明细逐列对齐。</p>
 *
 * <p>对齐口径只有一处：数值列沿用列上的 `module-detail-table-cell--numeric`，
 * 本组件只做透传，不重新判断「哪个字段是金额」。</p>
 *
 * <p>数值列的 `align` **优先右对齐**，即使列定义上是 `center`（`buildDetailItemColumns`
 * 给所有列都填了 align，数值列默认也是 center）：明细行的右对齐由 `pages.css` 的
 * 选择器完成、只覆盖 thead/tbody，合计行位于 tfoot 拿不到那条规则，只能用 align 属性补。</p>
 */
export function ModuleDetailSummaryRow({
  columns,
  cells,
}: ModuleDetailSummaryRowProps) {
  const slots = resolveSummarySlots(columns, cells)

  return (
    <Table.Summary.Row className="module-detail-summary-row">
      {slots.map(({ key, cell, column, index }) => {
        const numeric = isNumericColumn(column)
        return (
          <Table.Summary.Cell
            align={cell?.align ?? (numeric ? 'right' : column?.align)}
            className={numeric ? NUMERIC_CELL_CLASS : undefined}
            index={index}
            key={key}
          >
            {cell?.value ?? null}
          </Table.Summary.Cell>
        )
      })}
    </Table.Summary.Row>
  )
}
