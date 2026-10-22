// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { ModuleRecordDetailContent } from './ModuleRecordDetailContent'
import { ModuleRecordDetailInline } from './ModuleRecordDetailInline'

/** antd 表格/栅格在 jsdom 下需要的两个浏览器 API（与其它用例一致地打桩）。 */
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

/**
 * 只读详情面的模块级附加节点（`renderDetailExtras`）挂载契约。
 *
 * <p>「网价匹配」这类列的值不在明细行上，需要详情面先把派生数据准备好（发起核查）。
 * 通用详情组件必须把这个挂载点渲染出来，否则销售订单的核查永远发不起来 —— 这正是
 * 「详情页网价匹配永远显示未核查」的根因。这里同时锁定两个只读面：列表行「+」展开
 * （Inline）与详情弹窗（Content）。</p>
 */
const marker = (label: string) =>
  createElement('span', { 'data-testid': label })

const buildConfig = (
  extras: ModulePageConfig['renderDetailExtras'],
): ModulePageConfig => ({
  key: 'sales-order',
  title: '销售订单',
  kicker: 'Sales',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  detailItemColumns: [
    { title: '仓库名称', dataIndex: 'warehouseName' },
    { title: '单价', dataIndex: 'unitPrice', type: 'amount' },
  ],
  itemColumns: [{ title: '仓库名称', dataIndex: 'warehouseName' }],
  data: [],
  statusMap: {},
  buildOverview: () => [],
  ...(extras ? { renderDetailExtras: extras } : {}),
})

const record = {
  id: 'order-1',
  orderNo: 'SO-1',
  items: [{ id: 'r1', warehouseName: '升华物流', unitPrice: 3270 }],
} as unknown as ModuleRecord

describe('只读详情面的 renderDetailExtras', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const renderNode = (node: ReactNode) => {
    act(() => {
      root.render(node)
    })
  }

  it('列表行「+」展开的内联详情会挂载模块附加节点', () => {
    const extras = vi.fn(() => marker('inline-extras'))
    renderNode(
      createElement(ModuleRecordDetailInline, {
        config: buildConfig(extras),
        record,
        loading: false,
        error: null,
        onRetry: () => {},
      }),
    )

    expect(extras).toHaveBeenCalledWith({ record })
    expect(
      container.querySelector('[data-testid="inline-extras"]'),
    ).not.toBeNull()
  })

  it('详情弹窗会挂载模块附加节点', () => {
    const extras = vi.fn(() => marker('content-extras'))
    renderNode(
      createElement(ModuleRecordDetailContent, {
        config: buildConfig(extras),
        record,
        loading: false,
        error: null,
        onClose: () => {},
        onRetry: () => {},
      }),
    )

    expect(extras).toHaveBeenCalledWith({ record })
    expect(
      container.querySelector('[data-testid="content-extras"]'),
    ).not.toBeNull()
  })

  it('未声明附加节点的模块保持原样(不渲染多余节点)', () => {
    renderNode(
      createElement(ModuleRecordDetailInline, {
        config: buildConfig(undefined),
        record,
        loading: false,
        error: null,
        onRetry: () => {},
      }),
    )

    expect(
      container.querySelector('.module-record-detail-inline'),
    ).not.toBeNull()
  })

  it('销售订单配置声明了网价核查挂载点', () => {
    const extras = salesOrdersPageConfig.renderDetailExtras
    expect(typeof extras).toBe('function')
    expect(extras?.({ record })).toBeTruthy()
  })
})
