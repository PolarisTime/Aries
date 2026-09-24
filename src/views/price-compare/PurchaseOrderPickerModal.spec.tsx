// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'

const api = vi.hoisted(() => ({ fetchPurchaseOrderTonnages: vi.fn() }))
vi.mock('@/api/market/quote-sheets', async () => {
  const actual = await vi.importActual('@/api/market/quote-sheets')
  return {
    ...actual,
    fetchPurchaseOrderTonnages: api.fetchPurchaseOrderTonnages,
  }
})

const records: PurchaseOrderTonnageRecord[] = [
  {
    purchaseOrderId: '88',
    purchaseOrderItemId: '301',
    orderNo: 'PO-88',
    supplierName: '沙钢',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9米',
    orderedWeight: 40,
    issuedWeight: 30,
    remainingWeight: 10,
    status: '正常',
  },
]

describe('PurchaseOrderPickerModal', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    api.fetchPurchaseOrderTonnages.mockReset().mockResolvedValue(records)
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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
    document.body.innerHTML = ''
    queryClient.clear()
    vi.clearAllMocks()
  })

  const render = (
    overrides: Partial<Parameters<typeof PurchaseOrderPickerModal>[0]> = {},
  ) => {
    const props: Parameters<typeof PurchaseOrderPickerModal>[0] = {
      open: true,
      selectedItemId: undefined,
      onSelect: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(PurchaseOrderPickerModal, props),
        ),
      )
    })
    return props
  }

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('打开时从后端拉取并渲染明细行, 展示规格/订货/已开/剩余', async () => {
    render()
    await flush()
    await flush()
    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('选择采购订单规格行')
    expect(modal?.textContent).toContain('PO-88')
    expect(modal?.textContent).toContain('沙钢')
    expect(modal?.textContent).toContain('40.000')
  })

  it('点击行触发 onSelect(完整记录)', async () => {
    const props = render()
    await flush()
    await flush()
    const row = Array.from(
      document.querySelectorAll('.ant-table-tbody tr.ant-table-row'),
    )[0] as HTMLElement
    act(() => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onSelect).toHaveBeenCalledWith(records[0])
  })

  it('关键字搜索下沉到后端(防抖后带 keyword 请求)', async () => {
    vi.useFakeTimers()
    try {
      render()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      const input = document.querySelector(
        '.ant-modal input.ant-input',
      ) as HTMLInputElement
      act(() => {
        // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
        const setter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value',
        )?.set
        setter?.call(input, 'PO-88')
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(400)
      })
      const calls = api.fetchPurchaseOrderTonnages.mock.calls
      expect(calls.some((c) => c[0]?.keyword === 'PO-88')).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })
})
