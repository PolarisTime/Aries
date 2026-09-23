// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { TonCell } from './TonCell'
import type { PriceRow } from './types'

const poRecord: PurchaseOrderTonnageRecord = {
  purchaseOrderId: '88',
  orderNo: 'PO-88',
  supplierName: '沙钢',
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

describe('TonCell 吨位 + 采购订单关联', () => {
  let container: HTMLDivElement
  let root: Root

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
    vi.clearAllMocks()
  })

  const render = (overrides: Partial<Parameters<typeof TonCell>[0]> = {}) => {
    const props: Parameters<typeof TonCell>[0] = {
      row: baseRow,
      rowId: 'r1',
      options: [poRecord],
      linked: undefined,
      localTonForOrder: 0,
      disabled: false,
      loading: false,
      onTonChange: vi.fn(),
      onPurchaseOrderChange: vi.fn(),
      onMoveFocus: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(TonCell, props))
    })
    return props
  }

  it('渲染吨位输入与采购订单下拉', () => {
    render()
    expect(container.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(
      container.querySelector('input[aria-label="关联采购订单"]'),
    ).toBeTruthy()
  })

  it('未关联订单时不展示已开/剩余提示', () => {
    render()
    expect(container.textContent).not.toContain('已开')
  })

  it('关联订单时展示叠加本地吨位后的已开/剩余', () => {
    render({
      row: { ...baseRow, purchaseOrderId: '88' },
      localTonForOrder: 5,
    })
    // 服务端已开 30 + 本地 5 = 35, 剩余 40 - 35 = 5
    expect(container.textContent).toContain('已开 35.000 / 剩 5.000')
    expect(container.textContent).not.toContain('超额')
  })

  it('超过订货吨数时提示超额', () => {
    render({
      row: { ...baseRow, purchaseOrderId: '88', ton: 15 },
      localTonForOrder: 15,
    })
    // 服务端已开 30 + 本地 15 = 45 > 订货 40
    expect(container.textContent).toContain('超额')
    expect(
      container.querySelector('.price-compare-ton-hint--over'),
    ).toBeTruthy()
  })

  it('关联订单已不在选项列表时使用 linked 回显', () => {
    render({
      row: { ...baseRow, purchaseOrderId: '99' },
      options: [],
      linked: { ...poRecord, purchaseOrderId: '99', orderNo: 'PO-99' },
    })
    expect(container.textContent).toContain('已开')
  })

  it('关联订单已删除且无 linked 时回退订单号快照并提示重选', () => {
    render({
      row: {
        ...baseRow,
        purchaseOrderId: '99',
        purchaseOrderNo: 'PO-99',
      },
      options: [],
      linked: undefined,
    })
    // 下拉展示快照订单号而非原始雪花 ID
    const select = container.querySelector('.price-compare-purchase-order')
    expect(select?.textContent).toContain('PO-99')
    expect(select?.textContent).toContain('订单已删除')
    expect(container.textContent).toContain('关联订单已删除，请重新选择')
    // 无可信吨位: 不显示已开/剩余
    expect(container.textContent).not.toContain('已开')
  })

  it('关联订单已删除且无快照时回退到订单 ID', () => {
    render({
      row: { ...baseRow, purchaseOrderId: '99' },
      options: [],
      linked: undefined,
    })
    const select = container.querySelector('.price-compare-purchase-order')
    expect(select?.textContent).toContain('99')
    expect(container.textContent).toContain('关联订单已删除，请重新选择')
  })

  it('已关联时下拉展示订单号', () => {
    render({ row: { ...baseRow, purchaseOrderId: '88' } })
    const select = container.querySelector('.price-compare-purchase-order')
    expect(select?.textContent).toContain('PO-88')
  })
})
