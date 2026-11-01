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
  items: [{ id: 'r1', warehouseName: '升华物流', unitPrice: 3270 }],
} as unknown as ModuleRecord

/** 等 hook 的 300ms 防抖 + 请求 resolve 完成（真实定时器，避免与 antd 的 rAF 打桩冲突）。 */
const flushRequest = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400))
  })
}

/**
 * 「项目数据」面板在**两个只读详情面**上的真实挂载（详情弹层 + 列表行「+」展开）。
 *
 * <p>两者都通过 `salesOrdersPageConfig.renderDetailExtras` 挂载同一个面板；这里不 mock
 * 通用详情组件，直接渲染真实组件 + 真实配置，用来锁住「需求的三处展示里的另外两处」。</p>
 */
describe('项目数据面板的两个只读详情面', () => {
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

  it('列表行「+」展开区显示项目数据', async () => {
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

    const text = container.textContent || ''
    expect(text).toContain('项目数据')
    expect(text).toContain('合计金额')
    expect(text).toContain('1234567.80')
    expect(container.querySelectorAll('[role="progressbar"]')).toHaveLength(2)
    // 只读面按后端已计入本单的口径请求：不传 excludeOrderId / pending
    expect(fetchProjectSalesSummaryMock.mock.calls[0]?.[0]).toEqual({
      projectId: '9007199254740993',
    })
  })

  it('详情弹窗显示项目数据', async () => {
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

    const text = container.textContent || ''
    expect(text).toContain('项目数据')
    expect(text).toContain('华东钢铁项目')
    expect(text).toContain('-250.50')
  })
})
