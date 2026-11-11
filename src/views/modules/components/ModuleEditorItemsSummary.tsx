import { Table } from 'antd'
import { type Key, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { computeDraftTotals } from '@/module-system/editor/module-editor-draft'
import type { ModuleLineItem } from '@/types/module-page'
import { formatAmount, formatWeight } from '@/utils/formatters'
import { sumLineItemsBy } from '@/views/modules/module-editor-workspace-support'

/**
 * 编辑器明细表底部的「草稿实时合计」。
 *
 * <p>口径**只有一个出口**：金额与重量取 {@link computeDraftTotals}（与保存载荷联动写回的
 * `totalAmount` / `totalWeight`、列表「总金额」、「项目数据」卡片是同一份结果），
 * 件数取同一个求和函数 {@link sumLineItemsBy} —— 这里不另写 `reduce`，
 * 否则编辑器上看到的合计会和保存后列表里的数字各算一遍。</p>
 *
 * <p>它是**纯渲染组件**：不持有状态、不订阅 store。草稿行由编辑器的既有状态链路
 * （`ModuleEditorWorkspace` 的 `items`）传进来，行一变就重渲染，合计随之更新。</p>
 */

/** 件数列 `dataIndex`：`computeDraftTotals` 不返回件数，沿用同一份求和的 key。 */
const COUNT_KEY = 'quantity'

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
 * 是否挂合计行。
 *
 * <p>多分组时 antd 会把同一份 `summary` 传给**每个分组表**，整单合计会在每组底部重复；
 * 整单合计只在单分组时挂，分组小计要另做（改共享组件），不在本任务范围。
 * 没有可见列时不挂：否则会渲染一条把表格撑高的空行。</p>
 */
export function shouldAttachEditorDraftSummary(
  itemGroupCount: number,
  columnCount: number,
): boolean {
  return itemGroupCount === 1 && columnCount > 0
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
  /** antd 的 `AlignType`（含 `end` / `justify`），这里按宽类型收。 */
  align?: string
  children?: readonly ModuleEditorItemsSummaryColumn[]
}

export interface ModuleEditorItemsSummaryProps {
  /** 模块 key：决定 `computeDraftTotals` 是否启用金额口径。 */
  moduleKey: string
  /** 草稿明细行（编辑器的实时状态，不传则合计为 0 行）。 */
  items: readonly ModuleLineItem[]
  /** 附加费用合计（`sumChargeItemAmount`）；与「项目数据」卡片的待定金额同一口径。 */
  chargeTotal?: number
  /**
   * 合计文字要横跨的列数（含表格末尾的「顺序」列）。
   *
   * <p>必须由调用方给：`ModuleItemGroupsView` 会在数据列之后**追加**行序操作列，
   * 组件自己数 `columns` 会少一列，文字右端就离表格右边界差一截。</p>
   */
  colSpan: number
}

/**
 * 草稿合计（antd `Table.Summary` 里**一行文字**，右对齐）。
 *
 * <p>形态由来：逐列对齐的合计行（每个数值列各占一格）在编辑器里反而不好读 ——
 * 数字被十几列拉得很散，和上面的明细行撞在一起像多了一行数据。改成一句
 * 「合计 N 行 · 数量 X · 重量 Y 吨 · 金额 Z 元」并按表格右边界对齐，扫读路径变成
 * 「右下一眼看到三个数」。</p>
 *
 * <p>口径不变：全部来自 {@link resolveEditorDraftSummaryValues}（`computeDraftTotals` +
 * `sumLineItemsBy`），与保存载荷、列表总金额、项目数据卡片同一份结果，这里不另算。</p>
 *
 * <p>没有明细行时不渲染：空表交给 antd 的空态，避免出现「合计 0 行」这种没有信息量的行。</p>
 */
export function ModuleEditorItemsSummary({
  moduleKey,
  items,
  chargeTotal,
  colSpan,
}: ModuleEditorItemsSummaryProps) {
  const { t } = useTranslation()
  const values = useMemo(
    () => resolveEditorDraftSummaryValues(moduleKey, items, chargeTotal),
    [chargeTotal, items, moduleKey],
  )
  if (items.length === 0) return null

  const hasExpense = Number(chargeTotal) > 0
  const text = !values.hasComputedTotals
    ? t('modules.itemsSummary.summaryLineSimple', {
        rows: values.rowCount,
        count: values.totalCount,
      })
    : t(
        hasExpense
          ? 'modules.itemsSummary.summaryLineWithExpense'
          : 'modules.itemsSummary.summaryLine',
        {
          rows: values.rowCount,
          count: values.totalCount,
          weight: formatWeight(values.totalWeight),
          amount: formatAmount(values.totalAmount),
        },
      )

  return (
    <Table.Summary>
      <Table.Summary.Row className="module-editor-summary-text-row">
        <Table.Summary.Cell index={0} colSpan={Math.max(colSpan, 1)}>
          <div className="module-editor-summary-text">{text}</div>
        </Table.Summary.Cell>
      </Table.Summary.Row>
    </Table.Summary>
  )
}
