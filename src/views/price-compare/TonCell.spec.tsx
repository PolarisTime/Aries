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
      onOpenPicker: vi.fn(),
      onMoveFocus: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(TonCell, props))
    })
    return props
  }

  it('渲染吨位输入与明细图标', () => {
    render()
    expect(container.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(container.querySelector('.price-compare-ton-info')).toBeTruthy()
  })

  it('未关联时不显示已开吨位数值', () => {
    render()
    expect(container.textContent).not.toContain('已开')
  })

  it('关联后显示"已开 X"(叠加本地未保存吨位)', () => {
    render({
      row: { ...baseRow, purchaseOrderId: '88' },
      localTonForOrder: 5,
    })
    // 服务端已开 30 + 本地 5 = 35
    expect(container.textContent).toContain('已开 35.000')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('超过订货吨数时"已开"标红', () => {
    render({
      row: { ...baseRow, purchaseOrderId: '88', ton: 15 },
      localTonForOrder: 15,
    })
    // 30 + 15 = 45 > 40
    expect(
      container.querySelector(
        '.price-compare-ton-issued.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
  })

  it('hover 明细图标显示订单明细 popover', async () => {
    render({
      row: { ...baseRow, purchaseOrderId: '88' },
      localTonForOrder: 5,
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover).toBeTruthy()
    expect(popover?.textContent).toContain('PO-88')
    expect(popover?.textContent).toContain('沙钢')
    expect(popover?.textContent).toContain('40.000')
    expect(popover?.textContent).toContain('35.000')
  })

  it('popover 内按钮触发 onOpenPicker', async () => {
    const props = render({
      row: { ...baseRow, purchaseOrderId: '88' },
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const button = Array.from(
      document.querySelectorAll('.price-compare-ton-popover button'),
    )[0] as HTMLButtonElement
    act(() => {
      button?.click()
    })
    expect(props.onOpenPicker).toHaveBeenCalledTimes(1)
  })

  it('订单已删除时 popover 提示重新选择', async () => {
    render({
      row: { ...baseRow, purchaseOrderId: '99', purchaseOrderNo: 'PO-99' },
      options: [],
      linked: undefined,
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover?.textContent).toContain('PO-99')
    expect(popover?.textContent).toContain('关联订单已删除，请重新选择')
  })
})
