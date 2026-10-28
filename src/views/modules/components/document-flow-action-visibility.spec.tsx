// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleRecord } from '@/types/module-page'
import { PurchaseOrderDocumentFlowAction } from './PurchaseOrderDocumentFlowAction'
import { SalesOrderDocumentFlowAction } from './SalesOrderDocumentFlowAction'

vi.mock('@/layouts/tabs/use-tab-open', () => ({
  useTabOpen: () => vi.fn(),
}))
vi.mock('@/api/sales/sales-order-document-flow', () => ({
  getSalesOrderDocumentFlow: vi.fn(),
}))

/**
 * 「单据流」按钮的显隐契约。
 *
 * <p>需求：**默认隐藏，勾选后出现**。单据流是针对"某一张单"的动作，工具栏常驻一个灰按钮
 * 既占位置、又要用户点了才知道必须先选行。勾选多行时保留按钮但置灰并说明"只能选一条"，
 * 避免选择过程中按钮忽隐忽现。</p>
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  ResizeObserverStub

const rows = (count: number): ModuleRecord[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `row-${index + 1}`,
    orderNo: `SO-${index + 1}`,
    inboundNo: `IN-${index + 1}`,
  }))

describe('单据流按钮显隐', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
  })

  const render = (node: ReactNode) => {
    act(() => {
      root.render(
        createElement(QueryClientProvider, { client: queryClient }, node),
      )
    })
  }

  /** 工具栏里那颗「单据流」按钮（按可访问文字定位，不依赖 DOM 顺序）。 */
  const flowButton = () =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>('button.ant-btn'),
    ).find((button) => (button.textContent ?? '').includes('单据流')) ?? null

  for (const [name, Component] of [
    ['采购单据流', PurchaseOrderDocumentFlowAction],
    ['销售单据流', SalesOrderDocumentFlowAction],
  ] as const) {
    it(`${name}: 未勾选时不渲染按钮`, () => {
      render(createElement(Component, { selectedRows: rows(0) }))
      expect(flowButton()).toBeNull()
      // 连 icon 也不该留下空壳
      expect(container.querySelectorAll('button').length).toBe(0)
    })

    it(`${name}: 勾选 1 行时出现且可点击`, () => {
      render(createElement(Component, { selectedRows: rows(1) }))
      const button = flowButton()
      expect(button).not.toBeNull()
      // React 会把 aria-* 的布尔 false 渲染成字符串 "false"，只关心不是 "true"
      expect(button?.getAttribute('aria-disabled')).not.toBe('true')
    })

    it(`${name}: 勾选多行时保留按钮但置灰(避免选择过程中按钮忽隐忽现)`, () => {
      render(createElement(Component, { selectedRows: rows(2) }))
      const button = flowButton()
      expect(button).not.toBeNull()
      expect(button?.getAttribute('aria-disabled')).toBe('true')
    })
  }
})
