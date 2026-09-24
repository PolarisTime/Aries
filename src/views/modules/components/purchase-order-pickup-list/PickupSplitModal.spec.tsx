// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { PickupSplitModal } from './PickupSplitModal'
import type { PickupListRow } from './pickup-list-draft'

function buildItem(
  overrides: Partial<PurchaseOrderPickupListItem>,
): PurchaseOrderPickupListItem {
  return {
    itemId: '1',
    orderId: '1',
    orderNo: 'PO-1',
    lineNo: 1,
    warehouseId: 'w1',
    warehouseName: '一号仓',
    brand: '品牌',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9',
    pickupQuantity: 8,
    pieceWeightTon: 0.1,
    pickupWeightTon: 0.8,
    ...overrides,
  }
}

function buildRow(quantity = 8): PickupListRow {
  const item = buildItem({ pickupQuantity: quantity })
  return {
    rowId: item.itemId,
    baseItemId: item.itemId,
    item,
    quantity,
    weightTon: item.pickupWeightTon,
    partIndex: 0,
    partCount: 1,
  }
}

describe('PickupSplitModal', () => {
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

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  const render = (
    overrides: Partial<Parameters<typeof PickupSplitModal>[0]> = {},
  ) => {
    const props: Parameters<typeof PickupSplitModal>[0] = {
      open: true,
      row: buildRow(),
      onConfirm: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(PickupSplitModal, props))
    })
    return props
  }

  const flush = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('默认每份件数为总数对半, 并预览各份件数', async () => {
    render()
    await flush()
    // 8 件默认每份 4 → 4+4
    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('当前共 8 件')
    expect(modal?.textContent).toContain('第 1 份：4 件')
    expect(modal?.textContent).toContain('第 2 份：4 件')
  })

  it('修改每份件数实时刷新预览(余数独立成末份)', async () => {
    render()
    await flush()
    const input = document.querySelector(
      '.purchase-pickup-list-split-piece-count input',
    ) as HTMLInputElement
    act(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(input, '3')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()
    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('第 1 份：3 件')
    expect(modal?.textContent).toContain('第 2 份：3 件')
    expect(modal?.textContent).toContain('第 3 份：2 件')
  })

  it('每份件数超出范围时禁用确认', async () => {
    render()
    await flush()
    const input = document.querySelector(
      '.purchase-pickup-list-split-piece-count input',
    ) as HTMLInputElement
    act(() => {
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(input, '8')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await flush()
    const okButton = document.querySelector(
      '.ant-modal-footer .ant-btn-primary',
    ) as HTMLButtonElement
    expect(okButton.disabled).toBe(true)
  })

  it('确认时回传每份件数', async () => {
    const props = render()
    await flush()
    const okButton = document.querySelector(
      '.ant-modal-footer .ant-btn-primary',
    ) as HTMLButtonElement
    act(() => {
      okButton.click()
    })
    expect(props.onConfirm).toHaveBeenCalledWith(4)
  })
})
