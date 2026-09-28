// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  PurchaseOrderPickerModal,
  remainingLinkableTon,
} from './PurchaseOrderPickerModal'

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
    brand: '中天',
    orderedWeight: 40,
    issuedWeight: 30,
    remainingWeight: 10,
    status: '正常',
  },
]

/** 剩余可关联吨位为 0 的另一品牌明细行(同规格, 用于"区分品牌"与"默认隐藏"用例)。 */
const doneRecord: PurchaseOrderTonnageRecord = {
  ...records[0],
  purchaseOrderId: '99',
  purchaseOrderItemId: '302',
  orderNo: 'PO-99',
  brand: '永钢',
  orderedWeight: 20,
  issuedWeight: 20,
  remainingWeight: 0,
}

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

  const tableRows = () =>
    Array.from(document.querySelectorAll('.ant-table-tbody tr.ant-table-row'))

  it('材质/规格/长度列同时展示品牌', async () => {
    render()
    await flush()
    await flush()
    const variety = document.querySelector(
      '.price-compare-purchase-order-picker-variety',
    )
    expect(variety?.textContent).toContain('HRB400E')
    expect(variety?.textContent).toContain('中天')
  })

  it('同一规格多品牌的多张订单按行展示品牌, 可区分', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([...records, doneRecord])
    render()
    await flush()
    await flush()
    const brands = Array.from(
      document.querySelectorAll('.price-compare-purchase-order-picker-brand'),
    ).map((node) => node.textContent)
    expect(brands).toContain('中天')
    // 剩余 0 的行默认隐藏, 需开关才能看到永钢
    expect(brands).not.toContain('永钢')
  })

  it('剩余可关联吨位为 0 的明细行默认隐藏, 开关后可显示且不可选', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([...records, doneRecord])
    const props = render()
    await flush()
    await flush()

    // 默认只渲染还有剩余额度的行
    expect(tableRows()).toHaveLength(1)
    const toggle = document.querySelector<HTMLInputElement>(
      '.price-compare-purchase-order-picker-toggle input[type="checkbox"]',
    )
    expect(toggle).not.toBeNull()
    // 开关文案写明被隐藏的条数, 数据不会显得"丢了"
    expect(
      document.querySelector('.price-compare-purchase-order-picker-toggle')
        ?.textContent,
    ).toContain('显示已关联完的订单（1）')

    act(() => {
      toggle?.click()
    })
    expect(tableRows()).toHaveLength(2)

    const doneRow = tableRows()[1] as HTMLElement
    expect(doneRow.textContent).toContain('永钢')
    expect(doneRow.textContent).toContain('已关联完')
    expect(doneRow.getAttribute('aria-disabled')).toBe('true')
    expect(doneRow.tabIndex).toBe(-1)

    act(() => {
      doneRow.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onSelect).not.toHaveBeenCalled()
  })

  it('全部行都已关联完时给出可操作的空态提示(而非"暂无采购订单")', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([doneRecord])
    render()
    await flush()
    await flush()
    expect(tableRows()).toHaveLength(0)
    expect(document.querySelector('.ant-empty')?.textContent).toContain(
      '勾选上方开关',
    )
  })

  it('本单据已关联吨位吃满的行默认隐藏, 开关内可看到已关联数量', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([records[0]])
    render({ linkedTonByItemId: new Map([['301', 10]]) })
    await flush()
    await flush()
    // 服务端 remainingWeight 10, 本单据已用 10 → 剩余 0
    expect(tableRows()).toHaveLength(0)

    const toggle = document.querySelector<HTMLInputElement>(
      '.price-compare-purchase-order-picker-toggle input[type="checkbox"]',
    )
    act(() => {
      toggle?.click()
    })
    const doneRow = tableRows()[0] as HTMLElement
    expect(doneRow.textContent).toContain('已关联完')
    expect(doneRow.getAttribute('aria-disabled')).toBe('true')
  })

  it('当前已关联行即使剩余为 0 也保持可见且标记选中', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([doneRecord])
    render({ selectedItemId: doneRecord.purchaseOrderItemId })
    await flush()
    await flush()
    expect(tableRows()).toHaveLength(1)
    expect(tableRows()[0].getAttribute('aria-selected')).toBe('true')
  })

  it('remainingLinkableTon: 服务端剩余缺失时回退到 订货-已开 并扣减本单据已关联吨位', () => {
    expect(
      remainingLinkableTon(
        {
          ...records[0],
          orderedWeight: 40,
          issuedWeight: 30,
          remainingWeight: Number.NaN,
        },
        new Map([['301', 4]]),
      ),
    ).toBe(6)
    // 无本单据关联时直接用服务端剩余
    expect(remainingLinkableTon(records[0], undefined)).toBe(10)
  })

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

  it('明细行可键盘聚焦, Enter/Space 触发 onSelect', async () => {
    const props = render()
    await flush()
    await flush()
    const row = document.querySelector<HTMLElement>(
      '.ant-table-tbody tr.ant-table-row',
    )
    expect(row).not.toBeNull()
    // 行必须可聚焦, 否则键盘用户能搜、能看、不能选
    expect(row?.tabIndex).toBe(0)
    expect(
      row?.classList.contains('price-compare-purchase-order-picker-row'),
    ).toBe(true)

    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      row?.dispatchEvent(enter)
    })
    expect(enter.defaultPrevented).toBe(true)
    expect(props.onSelect).toHaveBeenCalledWith(records[0])

    const space = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      row?.dispatchEvent(space)
    })
    // Enter 与 Space 各触发一次
    expect(props.onSelect).toHaveBeenCalledTimes(2)
    expect(props.onSelect).toHaveBeenLastCalledWith(records[0])
  })

  it('未选中行未标记 aria-selected, 选中行标记为 true', async () => {
    render({ selectedItemId: records[0].purchaseOrderItemId })
    await flush()
    await flush()
    const row = document.querySelector<HTMLElement>(
      '.ant-table-tbody tr.ant-table-row',
    )
    expect(row?.getAttribute('aria-selected')).toBe('true')
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
