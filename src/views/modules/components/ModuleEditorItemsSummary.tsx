import { Table } from 'antd'
import { type Key, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { computeDraftTotals } from '@/module-system/editor/module-editor-draft'
import type {
  ModuleDetailSummaryCell,
  ModuleLineItem,
} from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { sumLineItemsBy } from '@/views/modules/module-editor-workspace-support'
import {
  type ModuleDetailSummaryColumn,
  ModuleDetailSummaryRow,
} from './ModuleDetailSummaryRow'

/**
 * 编辑器明细表底部的「草稿实时合计行」。
 *
 * <p>口径**只有一个出口**：金额与重量取 {@link computeDraftTotals}（与保存载荷联动写回的
 * `totalAmount` / `totalWeight`、列表「总金额」、「项目数据」卡片是同一份结果），
 * 件数取同一个求和函数 {@link sumLineItemsBy} —— 这里不另写 `reduce`，
 * 否则编辑器上看到的合计会和保存后列表里的数字各算一遍。</p>
 *
 * <p>它是**纯渲染组件**：不持有状态、不订阅 store。草稿行由编辑器的既有状态链路
 * （`ModuleEditorWorkspace` 的 `items`）传进来，行一变就重渲染，合计随之更新。</p>
 */

/** 金额列 `dataIndex`：与 {@link computeDraftTotals} 内部使用的口径字段一致。 */
const AMOUNT_KEY = 'amount'
/** 重量列 `dataIndex`（吨）：同上。 */
const WEIGHT_KEY = 'weightTon'
/** 件数列 `dataIndex`：`computeDraftTotals` 不返回件数，沿用同一份求和的 key。 */
const COUNT_KEY = 'quantity'

/**
 * 非数据列（选择 / 序号）的列 `key`。
 *
 * <p>合计行必须挂在**第一个真实数据列**下：选择列的 `dataIndex` 是 `id`，
 * 直接把标签挂在第一列会挤进 48px 宽的复选框列。</p>
 */
const NON_DATA_COLUMN_KEYS: ReadonlySet<string> = new Set([
  'selection',
  '_index',
])

/** 合计行数值单元格的等宽数字类（样式见 `pages.css`，按合计行 scope，不动编辑单元格）。 */
const SUMMARY_NUMBER_CLASS = 'module-editor-summary-number'

export interface EditorDraftSummaryValues {
  /** 草稿行数。 */
  rowCount: number
  /** 件数合计（`quantity` 求和）。 */
  totalCount: number
  /** 重量合计（吨）。 */
  totalWeight: number
  /** 单据总金额 = 货物小计 + 附加费用小计。 */
  totalAmount: number
  /**
   * 该模块是否注册了金额计算口径（`computeDraftTotals` 返回非 null）。
   * 未注册时不展示金额/重量合计 —— 显示 0 会被误读成「合计是 0」。
   */
  hasComputedTotals: boolean
}

/**
 * 计算草稿合计（唯一口径出口的适配层）。
 *
 * <p>`chargeTotal` 传附加费用合计（`sumChargeItemAmount`）时，`totalAmount` 就是
 * 含附加费用的单据总金额；不传按 0 计，口径与保存载荷完全一致。</p>
 */
export function resolveEditorDraftSummaryValues(
  moduleKey: string,
  items: readonly ModuleLineItem[],
  chargeTotal?: number,
): EditorDraftSummaryValues {
  const draftTotals = computeDraftTotals(
    moduleKey,
    [...items],
    sumLineItemsBy,
    chargeTotal,
  )
  return {
    rowCount: items.length,
    // 件数不在 computeDraftTotals 的返回里，但必须走同一个求和出口（sumLineItemsBy）。
    totalCount: sumLineItemsBy([...items], COUNT_KEY),
    totalWeight: draftTotals?.totalWeight ?? 0,
    totalAmount: draftTotals?.totalAmount ?? 0,
    hasComputedTotals: draftTotals !== null,
  }
}

/**
 * 合计行需要的列字段（antd 列类型 + 列分组的结构化子集）。
 *
 * <p>`align` 用宽类型：antd v6 的 `AlignType` 比 `ModuleDetailSummaryColumn` 多一个 `'end'`，
 * 直接收窄会让调用方（`TableColumnsType` 原样传入）类型不通过。</p>
 */
export interface ModuleEditorItemsSummaryColumn {
  dataIndex?: unknown
  key?: Key
  className?: string
  /** antd 的 `AlignType`（含 `end` / `justify`），这里按宽类型收，归一在下面做。 */
  align?: string
  children?: readonly ModuleEditorItemsSummaryColumn[]
}

/**
 * `AlignType` 归一：`end` 与 `right` 同义，`justify` 这类合计行不支持的取值退回列默认。
 *
 * <p>直接收窄成 `'left' | 'center' | 'right'` 会让调用方原样传 `TableColumnsType` 时
 * 类型不通过（antd v6 的 `AlignType` 比它宽）。</p>
 */
function toSummaryAlign(
  align: string | undefined,
): ModuleDetailSummaryColumn['align'] {
  if (align === 'end' || align === 'right') return 'right'
  if (align === 'left' || align === 'center') return align
  return undefined
}

/** 摊平列分组，并把对齐别名归一成 {@link ModuleDetailSummaryColumn} 能接受的取值。 */
function normalizeSummaryColumns(
  columns: readonly ModuleEditorItemsSummaryColumn[],
): ModuleDetailSummaryColumn[] {
  return columns.flatMap((column) => [
    ...(column.children?.length
      ? normalizeSummaryColumns(column.children)
      : []),
    {
      dataIndex: column.dataIndex,
      key: column.key,
      className: column.className,
      align: toSummaryAlign(column.align),
    },
  ])
}

/**
 * 是否挂合计行。
 *
 * <p>多分组时 antd 会把同一份 `summary` 传给**每个分组表**，整单合计会在每组底部重复；
 * 整单合计只在单分组时挂，分组小计要另做（改共享组件），不在本任务范围。
 * 没有可见列时不挂：否则会渲染一条空的 `<tfoot>` 行。</p>
 */
export function shouldAttachEditorDraftSummary(
  itemGroupCount: number,
  columnCount: number,
): boolean {
  return itemGroupCount === 1 && columnCount > 0
}

/** 第一个真实数据列的 `dataIndex`（跳过选择 / 序号 / 行操作列）。 */
function resolveFirstDataColumnKey(
  columns: readonly ModuleDetailSummaryColumn[],
): string | undefined {
  for (const column of columns) {
    if (
      typeof column.key === 'string' &&
      NON_DATA_COLUMN_KEYS.has(column.key)
    ) {
      continue
    }
    // 选择列的 dataIndex 也是 'id'，即使调用方没给 key 也要跳过
    if (typeof column.dataIndex === 'string' && column.dataIndex !== 'id') {
      return column.dataIndex
    }
  }
  return undefined
}

/** 件数不需要小数位，但同样套等宽数字，合计行扫读时位数才对得齐。 */
function formatCount(value: number): string {
  return Number.isFinite(value) ? String(value) : '0'
}

/**
 * 把合计值排成 `ModuleDetailSummaryRow` 的单元格。
 *
 * <p>数值单元格**显式** `align: 'right'`：合计行是只读的，右对齐才对得上上面的明细数字，
 * 而编辑器数据列本身保持居中（可编辑单元格居中便于定位输入框，是全站既有约定），
 * 所以这里不靠列上的 `module-detail-table-cell--numeric` 标记。</p>
 *
 * <p>列被用户在「列设置」里隐藏时不产出该单元格：`ModuleDetailSummaryRow` 会把多出来
 * 的单元格追加到行末，那会让金额落到错误的列下面。</p>
 */
export function buildEditorDraftSummaryCells(
  columns: readonly ModuleDetailSummaryColumn[],
  values: EditorDraftSummaryValues,
  label: string,
): ModuleDetailSummaryCell[] {
  const presentKeys = new Set(
    columns
      .map((column) =>
        typeof column.dataIndex === 'string' ? column.dataIndex : undefined,
      )
      .filter((key): key is string => Boolean(key)),
  )
  const cells: ModuleDetailSummaryCell[] = []
  const firstDataKey = resolveFirstDataColumnKey(columns)
  if (firstDataKey) {
    cells.push({
      key: 'editor-summary-label',
      dataIndex: firstDataKey,
      value: label,
      // 短标签居中，其余单元格按列对齐（数值列右对齐）。
      align: 'center',
    })
  }
  if (presentKeys.has(COUNT_KEY)) {
    cells.push({
      key: 'editor-summary-count',
      dataIndex: COUNT_KEY,
      value: (
        <span className={SUMMARY_NUMBER_CLASS}>
          {formatCount(values.totalCount)}
        </span>
      ),
      align: 'right',
    })
  }
  if (values.hasComputedTotals && presentKeys.has(WEIGHT_KEY)) {
    cells.push({
      key: 'editor-summary-weight',
      dataIndex: WEIGHT_KEY,
      value: (
        <span className={SUMMARY_NUMBER_CLASS}>
          {formatWeight(values.totalWeight)}
        </span>
      ),
      align: 'right',
    })
  }
  if (values.hasComputedTotals && presentKeys.has(AMOUNT_KEY)) {
    cells.push({
      key: 'editor-summary-amount',
      dataIndex: AMOUNT_KEY,
      value: (
        <span className={SUMMARY_NUMBER_CLASS}>
          {formatAmount(values.totalAmount)}
        </span>
      ),
      align: 'right',
    })
  }
  return cells
}

export interface ModuleEditorItemsSummaryProps {
  /** 模块 key：决定 `computeDraftTotals` 是否启用金额口径。 */
  moduleKey: string
  /** 草稿明细行（编辑器的实时状态，不传则合计为 0 行）。 */
  items: readonly ModuleLineItem[]
  /**
   * 明细表列定义（编辑器最终列，含选择/序号列），用于逐列对齐。
   *
   * <p>直接传 antd 的 `TableColumnsType` 即可：内部会摊平列分组并归一 `align`。</p>
   */
  columns: readonly ModuleEditorItemsSummaryColumn[]
  /** 附加费用合计（`sumChargeItemAmount`）；与「项目数据」卡片的待定金额同一口径。 */
  chargeTotal?: number
}

/**
 * 草稿合计行（antd `Table.Summary`）：行数 / 件数 / 重量 / 金额。
 *
 * <p>用法：把本组件作为 `ModuleItemGroupsView` 的 `summary` prop 的返回值。
 * **只在单分组表上挂**：分组视图会把同一份 `summary` 透传给每个分组表，
 * 多分组时整单合计会在每个分组底部重复一遍。</p>
 */
export function ModuleEditorItemsSummary({
  moduleKey,
  items,
  columns,
  chargeTotal,
}: ModuleEditorItemsSummaryProps) {
  const { t } = useTranslation()
  const summaryColumns = useMemo(
    () => normalizeSummaryColumns(columns),
    [columns],
  )

  const cells = useMemo(() => {
    const values = resolveEditorDraftSummaryValues(
      moduleKey,
      items,
      chargeTotal,
    )
    const hasExpense = Number(chargeTotal) > 0
    const label = hasExpense
      ? t('modules.itemsSummary.summaryRowWithExpense', {
          rows: values.rowCount,
        })
      : t('modules.itemsSummary.summaryRow', { rows: values.rowCount })
    return buildEditorDraftSummaryCells(summaryColumns, values, label)
  }, [chargeTotal, items, moduleKey, summaryColumns, t])

  return (
    <Table.Summary>
      <ModuleDetailSummaryRow columns={summaryColumns} cells={cells} />
    </Table.Summary>
  )
}
