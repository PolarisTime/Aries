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
  /** 列名。文字形态的合计行用它作标签（如「数量 17」）；缺省则该段只输出值。 */
  title?: unknown
}

export interface ModuleDetailSummaryRowProps {
  /** 明细表列定义，用于把合计单元格横移到对应列。 */
  columns: readonly ModuleDetailSummaryColumn[]
  /** 合计单元格；`dataIndex` 命中的按列对齐，没有 `dataIndex` 的按顺序补空列。 */
  cells: ModuleDetailSummaryCell[]
}

interface ResolvedSummarySlot {
  key: string
  cell: ModuleDetailSummaryCell | null
  column: ModuleDetailSummaryColumn | undefined
  index: number
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
 * 明细合计行（antd `Table.Summary.Row`）——**一行文字、右端对齐**。
 *
 * <p>与编辑器草稿合计（`ModuleEditorItemsSummary`）保持同一形态：逐列铺开的合计
 * 在十几列的表里会把三个数拉得很散、看起来像多了一行数据；收成一句
 * 「合计（4 行） · 数量 17 · 重量(吨) 35.882 · 金额 116745.72」并按表格右边界对齐后，
 * 三个数挨在一起，扫读路径变成「右下一眼看到」。</p>
 *
 * <p>口径没有变：单元格仍由 `config.detailSummary`（如 `buildDefaultLineItemSummary`）
 * 产出，求和仍来自 `sumLineItemsBy`；本组件只负责排版，不重算任何数字。</p>
 *
 * <p>仍保留 `resolveSummarySlots` 的槽位解析：它决定**哪些单元格出现、按什么顺序**，
 * 以及 `dataIndex` 与列的对应关系（列名即标签）。没有可用单元格时不渲染整行 ——
 * 空表交给 antd 的空态，避免出现「合计 0 行」这种没有信息量的行。</p>
 */
export function ModuleDetailSummaryRow({
  columns,
  cells,
}: ModuleDetailSummaryRowProps) {
  const parts = resolveSummarySlots(columns, cells)
    .map(({ cell, column }) => {
      if (!cell || cell.value === null || cell.value === undefined) return null
      const value = String(cell.value)
      /*
       * 只有「单元格与列按 dataIndex 精确对上」才加列名标签：合计标签
       * （`dataIndex: '#'` 的「合计（N 行）」）会被补到最左空槽，那一槽的列名是
       * 「仓库名称」之类，加上去会读成「仓库名称 合计（4 行）」。
       */
      const matched =
        cell.dataIndex !== undefined && column?.dataIndex === cell.dataIndex
      const title =
        matched && typeof column?.title === 'string' ? column.title.trim() : ''
      return title ? `${title} ${value}` : value
    })
    .filter((part): part is string => Boolean(part))

  if (parts.length === 0) return null

  return (
    <Table.Summary.Row className="module-detail-summary-row">
      <Table.Summary.Cell index={0} colSpan={Math.max(columns.length, 1)}>
        <div className="module-detail-summary-text">{parts.join(' · ')}</div>
      </Table.Summary.Cell>
    </Table.Summary.Row>
  )
}
