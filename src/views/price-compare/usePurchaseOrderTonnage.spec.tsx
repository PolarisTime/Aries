// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PriceSheet } from './types'

const api = vi.hoisted(() => ({
  fetchPurchaseOrderTonnages: vi.fn(),
}))

vi.mock('@/api/market/quote-sheets', async () => {
  const actual = await vi.importActual('@/api/market/quote-sheets')
  return {
    ...actual,
    fetchPurchaseOrderTonnages: api.fetchPurchaseOrderTonnages,
  }
})

import { usePurchaseOrderTonnage } from './usePurchaseOrderTonnage'

const record = (id: string, orderNo: string) => ({
  purchaseOrderId: id,
  orderNo,
  supplierName: '沙钢',
  orderedWeight: 40,
  issuedWeight: 30,
  remainingWeight: 10,
  status: '正常',
})

function sheetWithRows(rows: PriceSheet['rows']): PriceSheet {
  return {
    id: 's1',
    name: '批次',
    status: '报价',
    projectId: 'p1',
    projectName: '项目',
    orderDate: '2026-09-22',
    refDate: '2026-09-22',
    refPeriod: '上午',
    lengthPremium: 30,
    inputs: {},
    rows,
  }
}

describe('usePurchaseOrderTonnage', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(() => {
    api.fetchPurchaseOrderTonnages.mockReset().mockResolvedValue([])
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await Promise.resolve()
    })
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
  })

  function render(active: PriceSheet) {
    let state: ReturnType<typeof usePurchaseOrderTonnage> | undefined
    function Harness() {
      state = usePurchaseOrderTonnage(active, true)
      return null
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness),
        ),
      )
    })
    return () => state
  }

  async function flush() {
    await act(async () => {
      // react-query 在宏任务里通知订阅者, 需 let timers 跑一轮才能触发重渲染
      for (let i = 0; i < 4; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    })
  }

  it('成功时返回选项与吨位映射, isError=false', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([record('88', 'PO-88')])
    const get = render(sheetWithRows([]))
    await flush()

    const state = get()
    expect(state?.options).toHaveLength(1)
    expect(state?.tonnageByOrderId.get('88')?.orderNo).toBe('PO-88')
    expect(state?.isError).toBe(false)
  })

  it('选项加载失败时 isError=true', async () => {
    vi.useFakeTimers()
    try {
      api.fetchPurchaseOrderTonnages.mockRejectedValue(new Error('boom'))
      const get = render(sheetWithRows([]))
      // hook 内置 retry:1, 需推进到重试结束
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000)
      })
      expect(get()?.isError).toBe(true)
      expect(get()?.options).toEqual([])
    } finally {
      vi.useRealTimers()
    }
  })

  it('已关联但不在选项中的订单按 id 回查并合并进映射', async () => {
    api.fetchPurchaseOrderTonnages
      // 首次(选项)返回空, 说明订单不在可选项里
      .mockResolvedValueOnce([])
      // 回查按 ids 返回该订单
      .mockResolvedValueOnce([record('99', 'PO-99')])
    const get = render(
      sheetWithRows([
        {
          id: 'r1',
          category: '螺纹钢',
          material: 'HRB400E',
          spec: 12,
          length: '9米',
          purchaseOrderId: '99',
        },
      ]),
    )
    await flush()

    expect(get()?.tonnageByOrderId.get('99')?.orderNo).toBe('PO-99')
    // 第二次调用应为按 id 回查
    const calls = api.fetchPurchaseOrderTonnages.mock.calls
    expect(calls.some((c) => c[0]?.purchaseOrderIds?.includes('99'))).toBe(true)
  })

  it('传 excludeSheetId 排除当前单据自身已保存吨位', async () => {
    render(sheetWithRows([]))
    await flush()
    expect(api.fetchPurchaseOrderTonnages.mock.calls[0][0]).toMatchObject({
      excludeSheetId: 's1',
    })
  })
})
