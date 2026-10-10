// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import type { PriceRow } from './types'
import { usePurchaseOrderPicker } from './usePurchaseOrderPicker'

const api = vi.hoisted(() => ({ fetchPurchaseOrderTonnages: vi.fn() }))
vi.mock('@/api/market/quote-sheets', async () => {
  const actual = await vi.importActual('@/api/market/quote-sheets')
  return {
    ...actual,
    fetchPurchaseOrderTonnages: api.fetchPurchaseOrderTonnages,
  }
})

const record: PurchaseOrderTonnageRecord = {
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
}

const baseRow: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 5,
}

/**
 * 关联采购订单的回写契约 (回归: 单据级「锁定规格和数量」下关联会被服务端清掉)。
 *
 * <p>服务端门禁是「仅锁定行可关联采购订单, 未锁定的行保存时强制清空关联与快照」
 * (QuoteSheetStore#applyItem), 而单据级锁定不会给行打 locked 标记 —— 因此选中订单时
 * 必须把 locked 与关联写在同一次 patch 里, 否则用户点完保存关联就凭空消失。</p>
 */
describe('usePurchaseOrderPicker 关联回写', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient
  let patches: Array<{ rowId: string; patch: Partial<PriceRow> }>

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    api.fetchPurchaseOrderTonnages.mockReset().mockResolvedValue([record])
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
    patches = []
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

  function Harness({ rows }: { rows: PriceRow[] }) {
    const picker = usePurchaseOrderPicker({
      rows,
      patchRow: (rowId, patch) => patches.push({ rowId, patch }),
    })
    return createElement(
      'div',
      null,
      createElement(
        'button',
        {
          className: 'open-picker',
          onClick: () => picker.open(rows[0].id),
          type: 'button',
        },
        'open',
      ),
      picker.node,
    )
  }

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const render = (rows: PriceRow[]) => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Harness, { rows }),
        ),
      )
    })
  }

  const openPicker = async () => {
    const trigger = container.querySelector<HTMLButtonElement>('.open-picker')
    act(() => {
      trigger?.click()
    })
    await flush()
    await flush()
  }

  const clickFirstRow = () => {
    const row = document.querySelector<HTMLElement>(
      '.ant-table-tbody tr.ant-table-row',
    )
    expect(row).not.toBeNull()
    act(() => {
      row?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
  }

  it('未锁定行选中订单时同笔写入 locked=true, 否则服务端会清空关联', async () => {
    render([{ ...baseRow }])
    await openPicker()
    clickFirstRow()

    expect(patches).toHaveLength(1)
    expect(patches[0].rowId).toBe('r1')
    expect(patches[0].patch).toEqual({
      locked: true,
      purchaseOrderId: '88',
      purchaseOrderNo: 'PO-88',
      purchaseOrderItemId: '301',
    })
  })

  it('已锁定行选中订单时不重复改锁定状态(避免无意义覆盖)', async () => {
    render([{ ...baseRow, locked: true }])
    await openPicker()
    clickFirstRow()

    expect(patches).toHaveLength(1)
    expect(patches[0].patch).not.toHaveProperty('locked')
    expect(patches[0].patch).toEqual({
      purchaseOrderId: '88',
      purchaseOrderNo: 'PO-88',
      purchaseOrderItemId: '301',
    })
  })

  it('清除关联只断开订单, 不改动行级锁定状态', async () => {
    render([
      { ...baseRow, purchaseOrderItemId: '301', purchaseOrderNo: 'PO-88' },
    ])
    await openPicker()
    const clear = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
    ).find((button) => button.textContent?.includes('清除关联'))
    expect(clear).not.toBeUndefined()
    act(() => {
      clear?.click()
    })

    expect(patches).toHaveLength(1)
    expect(patches[0].patch).not.toHaveProperty('locked')
    expect(patches[0].patch).toEqual({
      purchaseOrderId: undefined,
      purchaseOrderNo: undefined,
      purchaseOrderItemId: undefined,
    })
  })
})
