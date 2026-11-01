// @vitest-environment jsdom

import { Fragment, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'
import type { ProjectSalesSummaryPanelProps } from '@/views/modules/components/ProjectSalesSummaryPanel'
import { ProjectSalesSummaryPanel } from '@/views/modules/components/ProjectSalesSummaryPanel'
import { SalesOrderNetPriceCheck } from '@/views/modules/components/SalesOrderNetPriceCheck'

const items = [
  { id: '11', amount: 100, weightTon: 1.5 },
  { id: '12', amount: 200, weightTon: 2.25 },
] as unknown as ModuleLineItem[]
const expenseItems = [{ chargeName: '运费', amount: 30 }]

const form = {} as never

type ExtrasProps = Partial<ProjectSalesSummaryPanelProps>

function childrenOf(node: ReactElement): ReactElement[] {
  const children = (node.props as { children?: unknown }).children
  return (Array.isArray(children) ? children : [children]).filter(
    Boolean,
  ) as ReactElement[]
}

/**
 * 销售订单「项目数据」的**接线契约**（三处挂载中的两处由配置声明）。
 *
 * <p>详情弹层与列表行展开共用 `renderDetailExtras`；编辑器走 `renderEditorExtras`。
 * 这里锁定三件容易在后续重构里悄悄断掉的事：</p>
 * <ol>
 *   <li>两个挂载点都真的声明了「项目数据」面板（不是只声明了网价核查）；</li>
 *   <li>详情面不传 pending（后端已把本单计入），编辑器传 pending 且**排除本单**；</li>
 *   <li>pending 金额/吨位来自 `computeDraftTotals`（货物 + 附加费用），不是面板自己求和。</li>
 * </ol>
 */
describe('销售订单「项目数据」接线', () => {
  const record = {
    id: '9007199254740995',
    orderNo: 'SO-1',
    projectId: '9007199254740993',
  } as unknown as ModuleRecordInput

  it('详情弹层与行展开的挂载点同时包含网价核查与项目数据面板', () => {
    const element = salesOrdersPageConfig.renderDetailExtras?.({
      record: record as never,
    }) as ReactElement

    expect(element.type).toBe(Fragment)
    const [netPrice, panel] = childrenOf(element)
    expect(netPrice?.type).toBe(SalesOrderNetPriceCheck)
    expect(panel?.type).toBe(ProjectSalesSummaryPanel)
    expect(panel?.props).toMatchObject({
      projectId: '9007199254740993',
      variant: 'detail',
    })
  })

  it('详情面不传 pending / excludeOrderId（本单已被后端计入合计）', () => {
    const element = salesOrdersPageConfig.renderDetailExtras?.({
      record: record as never,
    }) as ReactElement
    const panel = childrenOf(element)[1] as ReactElement<ExtrasProps>

    expect(panel.props.pendingAmount).toBeUndefined()
    expect(panel.props.pendingTonnage).toBeUndefined()
    expect(panel.props.excludeOrderId).toBeUndefined()
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
