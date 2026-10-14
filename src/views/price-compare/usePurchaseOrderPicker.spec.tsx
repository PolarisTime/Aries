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

  /** 两张可关联的明细行(订货 60 / 70), 用于多选分配吨位的用例。 */
  const firstLinkable: PurchaseOrderTonnageRecord = {
    ...record,
    orderedWeight: 60,
    issuedWeight: 20,
    remainingWeight: 40,
  }
  const secondLinkable: PurchaseOrderTonnageRecord = {
    ...record,
    purchaseOrderId: '99',
    purchaseOrderItemId: '302',
    orderNo: 'PO-99',
    orderedWeight: 70,
    issuedWeight: 0,
    remainingWeight: 70,
  }

  const checkInput = (orderNo: string) =>
    document.querySelector<HTMLInputElement>(
      `.price-compare-purchase-order-picker-check input[aria-label="${orderNo}"]`,
    )

  const confirmButton = () =>
    document.querySelector<HTMLButtonElement>(
      '.price-compare-purchase-order-picker-confirm',
    )

  const check = (orderNo: string) => {
    act(() => {
      checkInput(orderNo)?.click()
    })
  }

  it('未锁定行选中订单时同笔写入 locked=true, 否则服务端会清空关联', async () => {
    render([{ ...baseRow }])
    await openPicker()
    clickFirstRow()

    expect(patches).toHaveLength(1)
    expect(patches[0].rowId).toBe('r1')
    // 关联集合与三列是同一份关联的两种表示: 必须一起写, 否则保存时服务端按旧集合镜像回三列
    expect(patches[0].patch).toEqual({
      locked: true,
      purchaseOrderLinks: [
        {
          purchaseOrderId: '88',
          purchaseOrderNo: 'PO-88',
          purchaseOrderItemId: '301',
          allocatedTon: 5,
        },
      ],
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
      purchaseOrderLinks: [
        {
          purchaseOrderId: '88',
          purchaseOrderNo: 'PO-88',
          purchaseOrderItemId: '301',
          allocatedTon: 5,
        },
      ],
      purchaseOrderId: '88',
      purchaseOrderNo: 'PO-88',
      purchaseOrderItemId: '301',
    })
  })

  it('已有多条关联的行单选另一张明细行时, 关联集合被覆盖为这一条(不能只改三列)', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([secondLinkable])
    render([
      {
        ...baseRow,
        locked: true,
        purchaseOrderId: '88',
        purchaseOrderNo: 'PO-88',
        purchaseOrderItemId: '301',
        purchaseOrderLinks: [
          {
            purchaseOrderId: '88',
            purchaseOrderNo: 'PO-88',
            purchaseOrderItemId: '301',
            allocatedTon: 3,
          },
          {
            purchaseOrderId: '99',
            purchaseOrderNo: 'PO-99',
            purchaseOrderItemId: '302',
            allocatedTon: 2,
          },
        ],
      },
    ])
    await openPicker()
    clickFirstRow()

    expect(patches).toHaveLength(1)
    const patch = patches[0].patch
    // 只覆盖三列会让旧集合在保存时把三列镜像回去, 用户的单选被静默回滚
    expect(patch.purchaseOrderLinks).toEqual([
      {
        purchaseOrderId: '99',
        purchaseOrderNo: 'PO-99',
        purchaseOrderItemId: '302',
        allocatedTon: 5,
      },
    ])
    expect(patch.purchaseOrderId).toBe('99')
    expect(patch.purchaseOrderNo).toBe('PO-99')
    expect(patch.purchaseOrderItemId).toBe('302')
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
    // 显式 [] 才能表达"清空关联": 后端语义是"未携带 = 不改"
    expect(patches[0].patch).toEqual({
      purchaseOrderId: undefined,
      purchaseOrderNo: undefined,
      purchaseOrderItemId: undefined,
      purchaseOrderLinks: [],
    })
  })

  it('勾选两张明细行后确认: 按勾选顺序分配吨位, 旧三列镜像第一条', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      firstLinkable,
      secondLinkable,
    ])
    render([{ ...baseRow, ton: 130 }])
    await openPicker()
    // 勾选顺序与列表顺序相反: 分配顺序必须跟勾选顺序走
    check('PO-99')
    check('PO-88')
    act(() => {
      confirmButton()?.click()
    })

    expect(patches).toHaveLength(1)
    expect(patches[0].rowId).toBe('r1')
    expect(patches[0].patch).toEqual({
      locked: true,
      purchaseOrderLinks: [
        {
          purchaseOrderId: '99',
          purchaseOrderNo: 'PO-99',
          purchaseOrderItemId: '302',
          allocatedTon: 70,
        },
        {
          purchaseOrderId: '88',
          purchaseOrderNo: 'PO-88',
          purchaseOrderItemId: '301',
          allocatedTon: 60,
        },
      ],
      purchaseOrderId: '99',
      purchaseOrderNo: 'PO-99',
      purchaseOrderItemId: '302',
    })
  })

  it('报单吨位不足时逐条扣减剩余额度, 最后一条只吃到剩下的量', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      firstLinkable,
      secondLinkable,
    ])
    render([{ ...baseRow, ton: 100 }])
    await openPicker()
    check('PO-88')
    check('PO-99')
    act(() => {
      confirmButton()?.click()
    })

    expect(patches).toHaveLength(1)
    expect(patches[0].patch.purchaseOrderLinks).toEqual([
      {
        purchaseOrderId: '88',
        purchaseOrderNo: 'PO-88',
        purchaseOrderItemId: '301',
        allocatedTon: 60,
      },
      {
        purchaseOrderId: '99',
        purchaseOrderNo: 'PO-99',
        purchaseOrderItemId: '302',
        allocatedTon: 40,
      },
    ])
    // 旧三列镜像第一条
    expect(patches[0].patch.purchaseOrderItemId).toBe('301')
    expect(patches[0].patch.purchaseOrderNo).toBe('PO-88')
  })

  it('报单吨位超过订货量合计时每条只吃到自己的订货量(不超发)', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      firstLinkable,
      secondLinkable,
    ])
    render([{ ...baseRow, ton: 200 }])
    await openPicker()
    check('PO-88')
    check('PO-99')
    act(() => {
      confirmButton()?.click()
    })

    expect(
      (patches[0].patch.purchaseOrderLinks ?? []).map(
        (link) => link.allocatedTon,
      ),
    ).toEqual([60, 70])
  })

  it('已锁定行确认多选时不再重复写 locked', async () => {
    api.fetchPurchaseOrderTonnages.mockResolvedValue([
      firstLinkable,
      secondLinkable,
    ])
    render([{ ...baseRow, ton: 130, locked: true }])
    await openPicker()
    check('PO-88')
    check('PO-99')
    act(() => {
      confirmButton()?.click()
    })

    expect(patches).toHaveLength(1)
    expect(patches[0].patch).not.toHaveProperty('locked')
    expect(
      (patches[0].patch.purchaseOrderLinks ?? []).map(
        (link) => link.allocatedTon,
      ),
    ).toEqual([60, 70])
  })
})
