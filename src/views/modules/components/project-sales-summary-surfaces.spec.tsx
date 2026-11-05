// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProjectSalesSummary } from '@/api/sales/project-sales-summary'

const fetchProjectSalesSummaryMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/sales/project-sales-summary', () => ({
  fetchProjectSalesSummary: fetchProjectSalesSummaryMock,
}))

/** 真实中文文案：从 zh-CN 查表 + 插值，断言的是用户看到的字。 */
vi.mock('react-i18next', async () => {
  const { zhCN } = await import('@/locales/zh-CN')
  const translate = (key: string, options?: Record<string, unknown>) => {
    let node: unknown = zhCN
    for (const part of key.split('.')) {
      if (!node || typeof node !== 'object') return key
      node = (node as Record<string, unknown>)[part]
    }
    if (typeof node !== 'string') return key
    return options
      ? node.replace(/\{\{(\w+)\}\}/g, (_match, name: string) =>
          String(options[name] ?? ''),
        )
      : node
  }
  return { useTranslation: () => ({ t: translate }) }
})

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}))

import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { ModuleRecord } from '@/types/module-page'
import { ModuleRecordDetailContent } from './ModuleRecordDetailContent'
import { ModuleRecordDetailInline } from './ModuleRecordDetailInline'

function summaryOf(): ProjectSalesSummary {
  return {
    projectId: '9007199254740993',
    projectName: '华东钢铁项目',
    orderAmount: 1234567.8,
    orderTonnage: 1234.5,
    deliveredAmount: 900000.5,
    deliveredTonnage: 1000.25,
    reconciledAmount: 650000.25,
    reconciledTonnage: 640.5,
    unreconciledAmount: -250.5,
    unreconciledTonnage: -12.125,
    hasContract: true,
    contractAmount: 2000000,
    contractTonnage: 2000,
    remainingAmount: 765432.2,
    remainingTonnage: 765.5,
    exceededAmount: 0,
    exceededTonnage: 0,
    amountUsageRate: 0.617284,
    tonnageUsageRate: 0.61725,
    message: '',
  }
}

const record = {
  id: '9007199254740995',
  orderNo: 'SO-1',
  projectId: '9007199254740993',
  items: [
    {
      id: 'r1',
      warehouseName: '升华物流',
      unitPrice: 3270,
      quantity: 5,
      weightTon: 12.5,
      amount: 136180.02,
    },
  ],
} as unknown as ModuleRecord

/** 等 hook 的 300ms 防抖 + 请求 resolve 完成（真实定时器，避免与 antd 的 rAF 打桩冲突）。 */
const flushRequest = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
  })
}

/**
 * 只读详情面的「项目数据」现在由**指标条 + 合计行**承载，不再挂卡片行。
 *
 * <p>历史断言是「详情里能找到 `ProjectSalesSummaryPanel`（标题「项目数据」+ 合计金额）」，
 * 本轮起同一批数据被拆成两块 DOM：顶部 `.module-detail-metric` 四项指标（合同金额/吨位
 * 使用率、送货对比、未对账），底部 `tr.module-detail-summary-row` 合计行（行数/数量/重量/金额）。
 * 用例保留、只换期望值，并继续保留「卡片行只出现在编辑器」这条负向断言 —— 否则重构时
 * 很容易把卡片行加回来，详情里就出现两份同源数字。</p>
 */
describe('项目数据在两个只读详情面上的新形态（指标条 + 合计行）', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    fetchProjectSalesSummaryMock.mockReset()
    fetchProjectSalesSummaryMock.mockResolvedValue(summaryOf())
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /** 两个详情面共用的「指标条 4 项 + 合计行」断言。 */
  function expectMetricsAndSummaryRow() {
    const text = container.textContent || ''

    // 指标条：4 项，标签取真实 zh-CN 文案。
    expect(container.querySelectorAll('.module-detail-metric')).toHaveLength(4)
    expect(text).toContain('合同金额使用率')
    expect(text).toContain('合同吨位使用率')
    expect(text).toContain('合计送货吨位')
    expect(text).toContain('未对账金额')
    // 未对账金额来自汇总接口（-250.5 → ¥-250.50）。
    expect(text).toContain('¥-250.50')

    // 合计行：金额求自明细（136180.02），不是指标条里的订单金额。
    const summaryRow = container.querySelector('tr.module-detail-summary-row')
    expect(summaryRow).not.toBeNull()
    expect(summaryRow?.textContent).toContain('136180.02')
    /*
     * 合计行第一格必须是「行数 1」：该单元格没有可对应的列（`dataIndex: '#'`），
     * 必须落到最左侧空槽（仓库名称列）而不是追加到行末 —— 追加到行末会被横向滚动裁掉。
     */
    expect(summaryRow?.querySelector('td')?.textContent).toBe('行数 1')
    // 数值列沿用同一个「数值列」class（等宽 + 合计行 nowrap 都按它命中）。
    expect(
      summaryRow?.querySelectorAll('td.module-detail-table-cell--numeric')
        .length,
    ).toBeGreaterThan(0)

    // 负向断言：只读面不再出现「项目数据」卡片行（它只属于编辑器）。
    expect(container.querySelector('.project-sales-summary')).toBeNull()
  }

  it('列表行「+」展开区显示指标条与合计行', async () => {
    act(() => {
      root.render(
        createElement(ModuleRecordDetailInline, {
          config: salesOrdersPageConfig,
          record,
          loading: false,
          error: null,
          onRetry: () => {},
        }),
      )
    })
    await flushRequest()

    expectMetricsAndSummaryRow()
    // 只读面按后端已计入本单的口径请求：不传 excludeOrderId / pending
    expect(fetchProjectSalesSummaryMock.mock.calls[0]?.[0]).toEqual({
      projectId: '9007199254740993',
    })
  })

  it('详情弹窗显示指标条与合计行', async () => {
    act(() => {
      root.render(
        createElement(ModuleRecordDetailContent, {
          config: salesOrdersPageConfig,
          record,
          loading: false,
          error: null,
          onClose: () => {},
          onRetry: () => {},
        }),
      )
    })
    await flushRequest()

    expectMetricsAndSummaryRow()
    // 描述区仍在（指标条没有把既有字段挤掉）。
    expect(
      container.querySelector('.module-record-detail-descriptions'),
    ).not.toBeNull()
  })
})
