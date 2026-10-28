// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { OperationLogPage } from '@/api/system/operation-logs'

const api = vi.hoisted(() => ({
  fetchOperationLogs: vi.fn(),
  fetchOperationLogSummary: vi.fn(),
}))

vi.mock('@/api/system/operation-logs', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/system/operation-logs')>()
  return {
    ...actual,
    fetchOperationLogs: api.fetchOperationLogs,
    fetchOperationLogSummary: api.fetchOperationLogSummary,
  }
})

vi.mock('@/utils/antd-app', () => ({
  message: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  modal: { confirm: vi.fn() },
}))

import { OperationLogPage as Page } from './OperationLogPage'

const LOG_OK = {
  id: '1',
  logNo: 'OP1',
  operatorName: '张三',
  loginName: 'zhangsan',
  moduleName: '供应商报价表',
  actionType: '修改',
  businessNo: 'SUP-1',
  requestMethod: 'PUT',
  requestPath: '/api/v2.0/supplier-price-lists/1/items',
  clientIp: '10.0.0.1',
  resultStatus: '成功',
  operationTime: '2026-10-28T10:00:00',
  statusCode: 200,
  durationMs: 320,
  requestBody: { items: [{ price: 3280 }] },
  operationCategory: 'BUSINESS',
}

const LOG_FAILED = {
  ...LOG_OK,
  id: '2',
  logNo: 'OP2',
  resultStatus: '失败',
  statusCode: 409,
  durationMs: 1200,
  errorCode: '4090',
  errorMessage: '库存不足',
  requestBody: { password: '***' },
}

const pageResponse: OperationLogPage = {
  content: [LOG_OK, LOG_FAILED],
  totalElements: 2,
  totalPages: 1,
  currentPage: 0,
  pageSize: 30,
  hasMore: false,
}

const summary = {
  total: 2,
  successCount: 1,
  failedCount: 1,
  avgDurationMs: 760,
  byDay: [{ date: '2026-10-28', total: 2, failed: 1 }],
  topFailedModules: [{ moduleName: '供应商报价表', count: 1 }],
}

describe('操作日志页（重做版）', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true

    api.fetchOperationLogs.mockReset().mockResolvedValue(pageResponse)
    api.fetchOperationLogSummary.mockReset().mockResolvedValue(summary)

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
    document.body.innerHTML = ''
  })

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  async function render() {
    await act(async () => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Page) as ReactNode,
        ),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
  }

  it('渲染指标卡、趋势与表格，失败行直接显示失败原因', async () => {
    await render()

    expect(container.textContent).toContain(
      i18n.t('modules.pages.operationLog.summaryTotal'),
    )
    expect(container.textContent).toContain('4090: 库存不足')
    // 结果列与时间列在表格里（不再被挤到屏幕外）
    expect(container.textContent).toContain('成功')
    expect(container.textContent).toContain('失败')
  })

  it('输入操作人筛选会带上 operatorName 重新查询', async () => {
    await render()
    const operator = container.querySelector<HTMLInputElement>(
      `input[aria-label="${i18n.t('modules.pages.operationLog.operatorFilter')}"]`,
    )
    expect(operator).not.toBeNull()
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set?.call(operator, '张三')
      operator?.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const calls = api.fetchOperationLogs.mock.calls
    expect(calls.at(-1)?.[0]).toMatchObject({ operatorName: '张三', page: 0 })
  })

  it('快捷筛选「仅失败」把 resultStatus=失败 传给后端', async () => {
    await render()
    const failedTab = Array.from(
      container.querySelectorAll('.ant-segmented-item-label'),
    ).find((node) =>
      (node.textContent ?? '').includes(
        i18n.t('modules.pages.operationLog.quickFailed'),
      ),
    )
    expect(failedTab).toBeTruthy()
    await act(async () => {
      failedTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const calls = api.fetchOperationLogs.mock.calls
    expect(calls.at(-1)?.[0]).toMatchObject({ resultStatus: '失败' })
  })

  it('点「详情」打开抽屉，展示请求体与错误信息', async () => {
    await render()
    const detailButton = Array.from(container.querySelectorAll('button')).find(
      (button) => (button.getAttribute('aria-label') ?? '').includes('OP2'),
    )
    expect(detailButton).toBeTruthy()
    await act(async () => {
      detailButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const drawer = document.querySelector('.oplog-drawer')
    expect(drawer).not.toBeNull()
    expect(document.body.textContent).toContain('库存不足')
    expect(document.body.textContent).toContain(
      i18n.t('modules.pages.operationLog.sectionRequest'),
    )
  })
})
