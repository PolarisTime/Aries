// @vitest-environment jsdom

import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'
import type { ProjectSalesSummaryPanelProps } from '@/views/modules/components/ProjectSalesSummaryPanel'
import { ProjectSalesSummaryPanel } from '@/views/modules/components/ProjectSalesSummaryPanel'
import { SalesOrderDetailMetrics } from '@/views/modules/components/SalesOrderDetailMetrics'
import { SalesOrderNetPriceCheck } from '@/views/modules/components/SalesOrderNetPriceCheck'

const items = [
  { id: '11', amount: 100, weightTon: 1.5 },
  { id: '12', amount: 200, weightTon: 2.25 },
] as unknown as ModuleLineItem[]
const expenseItems = [{ chargeName: '运费', amount: 30 }]

const form = {} as never

type ExtrasProps = Partial<ProjectSalesSummaryPanelProps>

/**
 * 销售订单「项目数据」的**接线契约**。
 *
 * <p>本轮起只读详情面（详情弹层 / 列表行「+」展开）不再挂 `ProjectSalesSummaryPanel`
 * 卡片行：同一批数据改由顶部指标条（`detailMetricsSlot`）与明细表底部合计行
 * （`detailSummary`）承载，避免详情里出现「卡片行 + 指标条」两份同源数字。
 * 编辑器侧仍保留卡片行（`renderEditorExtras`）。这里锁定四件容易在后续重构里
 * 悄悄断掉的事：</p>
 * <ol>
 *   <li>详情挂载点只剩网价核查，不再产出项目数据面板；</li>
 *   <li>指标条与合计行两个插槽都已配置（漏一个，详情里就只剩一份数字）；</li>
 *   <li>合计行的求和口径仍来自 `sumLineItemsBy`（与编辑器、保存载荷同一出口）；</li>
 *   <li>编辑器仍传 pending 且**排除本单**，pending 金额/吨位来自 `computeDraftTotals`
 *       （货物 + 附加费用），不是面板自己求和。</li>
 * </ol>
 */
describe('销售订单「项目数据」接线', () => {
  const record = {
    id: '9007199254740995',
    orderNo: 'SO-1',
    projectId: '9007199254740993',
  } as unknown as ModuleRecordInput

  it('详情挂载点只含网价核查，不再渲染项目数据卡片行', () => {
    const element = salesOrdersPageConfig.renderDetailExtras?.({
      record: record as never,
    }) as ReactElement

    // 直接是网价核查节点：再包一层 Fragment 说明有别的挂载点被加了回来。
    expect(element.type).toBe(SalesOrderNetPriceCheck)
    expect(element.props).toMatchObject({ record })
  })

  it('详情面用指标条 + 合计行承载项目数据', () => {
    // 指标条：契约是「页面声明用哪个组件」，不是「组件里写死」。
    expect(salesOrdersPageConfig.detailMetricsSlot).toBe(
      SalesOrderDetailMetrics,
    )

    // 合计行：按列对齐的四项，合计标签落在没有对应列的 '#' 槽上。
    const cells = salesOrdersPageConfig.detailSummary?.({ items }) ?? []
    expect(cells.map((cell) => cell.dataIndex)).toEqual([
      '#',
      'quantity',
      'weightTon',
      'amount',
    ])
    // 金额 100 + 200 = 300：只有货物、不含附加费用（那是编辑器 pending 的口径）。
    expect(cells[3]?.value).toBe('300.00')
    // 标签与编辑器草稿合计行统一成「合计（N 行）」，行数取真实明细条数
    expect(String(cells[0]?.value)).toBe(`合计（${items.length} 行）`)
    // 空明细不展示合计（footer 里一条只有边框的空行比不显示更糟）。
    expect(salesOrdersPageConfig.detailSummary?.({ items: [] })).toBeNull()
  })

  it('编辑器把草稿合计（货物 + 附加费用）作为 pending，并排除本单', () => {
    const element = salesOrdersPageConfig.renderEditorExtras?.({
      record,
      form,
      items,
      expenseItems,
    }) as ReactElement<ExtrasProps>

    expect(element.type).toBe(ProjectSalesSummaryPanel)
    // 货物 300 + 费用 30 = 330（只有货物会是 300，能区分两种口径）；吨位 1.5 + 2.25
    expect(element.props).toMatchObject({
      projectId: '9007199254740993',
      excludeOrderId: '9007199254740995',
      pendingAmount: 330,
      pendingTonnage: 3.75,
      variant: 'editor',
    })
  })

  it('新建态（无 id）不传 excludeOrderId，避免把空串发给后端', () => {
    const element = salesOrdersPageConfig.renderEditorExtras?.({
      record: { projectId: '9007199254740993' },
      form,
      items,
      expenseItems,
    }) as ReactElement<ExtrasProps>

    expect(element.props.excludeOrderId).toBeUndefined()
    expect(element.props.projectId).toBe('9007199254740993')
  })
})
