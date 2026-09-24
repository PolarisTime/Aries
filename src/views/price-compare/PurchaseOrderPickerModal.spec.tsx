// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'

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
  {
    purchaseOrderId: '99',
    purchaseOrderItemId: '401',
    orderNo: 'PO-99',
    supplierName: '中天',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '25',
    length: '9米',
    orderedWeight: 20,
    issuedWeight: 22,
    remainingWeight: -2,
    status: '完成采购',
  },
]

describe('PurchaseOrderPickerModal', () => {
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
    overrides: Partial<Parameters<typeof PurchaseOrderPickerModal>[0]> = {},
  ) => {
    const props: Parameters<typeof PurchaseOrderPickerModal>[0] = {
      open: true,
      selectedItemId: undefined,
      options: records,
      loading: false,
      onSelect: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(
        createElement(PurchaseOrderPickerModal, {
          ...props,
          open: true,
        }),
      )
    })
    return props
  }

  it('渲染标题与采购订单行, 展示订货/已开/剩余', async () => {
    render()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const modal = document.querySelector('.ant-modal')
    expect(modal?.textContent).toContain('选择采购订单规格行')
    expect(modal?.textContent).toContain('PO-88')
    expect(modal?.textContent).toContain('沙钢')
    expect(modal?.textContent).toContain('40.000')
    expect(modal?.textContent).toContain('30.000')
  })

  it('点击行触发 onSelect(明细行 id)', async () => {
    const props = render()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const row = Array.from(
      document.querySelectorAll('.ant-table-tbody tr.ant-table-row'),
    )[0] as HTMLElement
    act(() => {
      row.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(props.onSelect).toHaveBeenCalledWith('301')
  })

  it('搜索框按单号过滤', async () => {
    render()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const input = document.querySelector(
      '.ant-modal input.ant-input',
    ) as HTMLInputElement
    act(() => {
      // 使用原型链 setter 绕过 React 受控输入的值追踪器，保证 onChange 触发
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      setter?.call(input, 'PO-99')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const body = document.querySelector('.ant-modal')?.textContent ?? ''
    expect(body).toContain('PO-99')
    expect(body).not.toContain('PO-88')
  })
})
