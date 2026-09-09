// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { TableColumnsType } from 'antd'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { PickupDraftGroupSection } from './pickup-list-drag-rows'

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
    pickupQuantity: 2,
    pieceWeightTon: 0.1,
    pickupWeightTon: 0.2,
    ...overrides,
  }
}

const columns: TableColumnsType<PurchaseOrderPickupListItem> = [
  { title: '仓库', dataIndex: 'warehouseName', width: 112 },
  { title: '数量', dataIndex: 'pickupQuantity', width: 72 },
]

const baseProps = {
  columns,
  components: {},
  emptyText: '暂无明细',
  group: { id: 'g1', locked: false, remark: '', itemIds: ['1'] },
  groupCount: 2,
  index: 0,
  items: [buildItem({})],
  projectOptions: [],
  projectOptionsLoading: false,
  onLockedChange: vi.fn(),
  onProjectChange: vi.fn(),
  onRemarkChange: vi.fn(),
  onRemove: vi.fn(),
}

describe('PickupDraftGroupSection 渲染冒烟', () => {
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const renderSection = (
    props: Partial<Parameters<typeof PickupDraftGroupSection>[0]> = {},
  ) => {
    act(() => {
      root.render(
        createElement(
          DndContext,
          null,
          createElement(PickupDraftGroupSection, {
            ...baseProps,
            ...props,
          }),
        ),
      )
    })
  }

  it('渲染分组标题、仓库标签、汇总与明细行', () => {
    renderSection()
    expect(container.textContent).toContain('分组 1')
    expect(container.textContent).toContain('一号仓')
    expect(container.textContent).toContain('1条明细')
    expect(container.textContent).toContain('总件数：2')
    const rows = container.querySelectorAll('.ant-table-tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    expect(container.textContent).toContain('一号仓')
  })

  it('备注输入触发 onRemarkChange', () => {
    renderSection()
    const remarkInput = container.querySelector<HTMLInputElement>(
      '.purchase-pickup-list-group-remark input',
    )
    expect(remarkInput).toBeTruthy()
    act(() => {
      remarkInput?.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      if (!remarkInput) return
      // 使用原型链 setter 绕过 React 受控输入的值追踪器，保证 onChange 触发
      // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
      const valueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set
      valueSetter?.call(remarkInput, '备注内容')
      remarkInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(baseProps.onRemarkChange).toHaveBeenCalledWith('g1', '备注内容')
  })

  it('锁定按钮切换触发 onLockedChange', () => {
    renderSection()
    const lockButton = container.querySelector<HTMLButtonElement>(
      'button[aria-pressed]',
    )
    expect(lockButton).toBeTruthy()
    act(() => {
      lockButton?.click()
    })
    expect(baseProps.onLockedChange).toHaveBeenCalledWith('g1', true)
  })

  it('仅一个分组时移除按钮禁用', () => {
    renderSection({ groupCount: 1 })
    const removeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="移除分组 1"]',
    )
    expect(removeButton?.disabled).toBe(true)
  })
})
