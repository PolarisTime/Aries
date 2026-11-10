import i18next from 'i18next'
import type {
  ModuleDetailSummaryCell,
  ModuleLineItem,
} from '@/types/module-page'
import { formatAmount, formatInteger, formatWeight } from '@/utils/formatters'
import { sumLineItemsBy } from '@/views/modules/module-editor-workspace-support'

/**
 * 明细表合计行的**默认口径**（行数 / 数量 / 重量 / 金额）。
 *
 * <p>求和唯一出口是 `sumLineItemsBy`（编辑器联动、保存载荷用的是同一个函数），
 * 本函数只把四项投影成按列对齐的单元格，不再写第二份 reduce 或数字格式化。</p>
 *
 * <p>适合「明细列里确有 数量 / 重量(吨) / 金额 三列」的单据（销售订单、采购入库、
 * 销售出库/退货）。列结构不同的模块（如按分组渲染的对账单）不要直接复用，
 * 否则未匹配的单元格会被追加到合计行末尾，看起来像错列。</p>
 */
export function buildDefaultLineItemSummary(
  items: ModuleLineItem[],
): ModuleDetailSummaryCell[] | null {
  if (!items.length) return null
  return [
    {
      key: 'rowCount',
      dataIndex: '#',
      /*
       * 明细表没有「序号」列，合计行首格自带标签。
       * 文案与编辑器草稿合计共用 `modules.itemsSummary.summaryRow`（合计（N 行）），
       * 同一张单在编辑器与详情页看到的合计行标签不再一个叫「行数」一个叫「合计」。
       */
      value: i18next.t('modules.itemsSummary.summaryRow', {
        rows: items.length,
      }),
    },
    {
      key: 'quantity',
      dataIndex: 'quantity',
      value: formatInteger(sumLineItemsBy(items, 'quantity')),
      align: 'right',
    },
    {
      key: 'weightTon',
      dataIndex: 'weightTon',
      value: formatWeight(sumLineItemsBy(items, 'weightTon')),
      align: 'right',
    },
    {
      key: 'amount',
      dataIndex: 'amount',
      value: formatAmount(sumLineItemsBy(items, 'amount')),
      align: 'right',
    },
  ]
}
