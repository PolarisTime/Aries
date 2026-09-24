// @vitest-environment jsdom

import { DndContext } from '@dnd-kit/core'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { TableColumnsType } from 'antd'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { usePickupListColumns } from './pickup-list-columns'
import type { PickupListRow } from './pickup-list-draft'
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

function buildRow(overrides: Partial<PickupListRow> = {}): PickupListRow {
  const item = overrides.item ?? buildItem({})
  return {
    rowId: item.itemId,
    baseItemId: item.itemId,
    item,
    quantity: item.pickupQuantity,
    weightTon: item.pickupWeightTon,
    partIndex: 0,
    partCount: 1,
    ...overrides,
  }
}

const columns: TableColumnsType<PickupListRow> = [
  { title: '仓库', key: 'warehouseName', width: 112 },
  { title: '数量', dataIndex: 'quantity', width: 72 },
]

const baseProps = {
  columns,
  components: {},
  emptyText: '暂无明细',
  group: { id: 'g1', locked: false, remark: '', itemIds: ['1'] },
  groupCount: 2,
  index: 0,
  rows: [buildRow()],
  onLockedChange: vi.fn(),
  onMerge: vi.fn(),
  onQuantityChange: vi.fn(),
  onRemarkChange: vi.fn(),
  onRemove: vi.fn(),
  onRemovePart: vi.fn(),
  onSplit: vi.fn(),
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
  })

  it('不再渲染卸货目标下拉', () => {
    renderSection()
    expect(container.textContent).not.toContain('卸货目标')
    expect(container.querySelector('.purchase-pickup-list-group-project')).toBe(
      null,
    )
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

  it('拆分行按来源明细去重统计明细数', () => {
    renderSection({
      rows: [
        buildRow({ rowId: '1', partIndex: 0, partCount: 2, quantity: 1 }),
        buildRow({ rowId: '1#1', partIndex: 1, partCount: 2, quantity: 1 }),
      ],
    })
    expect(container.textContent).toContain('1条明细')
    expect(container.textContent).toContain('总件数：2')
  })

  it('仅一个分组时移除按钮禁用', () => {
    renderSection({ groupCount: 1 })
    const removeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="移除分组 1"]',
    )
    expect(removeButton?.disabled).toBe(true)
  })

  it('未拆分行渲染拆分按钮，点击触发 onSplit', () => {
    renderSection()
    const splitButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="拆分数量"]',
    )
    expect(splitButton).toBeTruthy()
    act(() => {
      splitButton?.click()
    })
    expect(baseProps.onSplit).toHaveBeenCalledTimes(1)
  })

  it('未拆分行仅展示拆分按钮, 不显示数量输入框', () => {
    renderSection()
    expect(
      container.querySelector('button[aria-label="拆分数量"]'),
    ).toBeTruthy()
    expect(
      container.querySelector('.purchase-pickup-list-quantity-input'),
    ).toBeNull()
  })

  it('拆分行渲染份次标签与数量输入框及合并/移除份按钮', () => {
    renderSection({
      rows: [
        buildRow({ rowId: '1', partIndex: 0, partCount: 2, quantity: 1 }),
        buildRow({ rowId: '1#1', partIndex: 1, partCount: 2, quantity: 1 }),
      ],
    })
    expect(container.textContent).toContain('第 1/2 份')
    expect(container.textContent).toContain('第 2/2 份')
    expect(
      container.querySelector('.purchase-pickup-list-quantity-input'),
    ).toBeTruthy()
    // 拆分行始终提供合并按钮(两份时禁用: 合并即等于移除末份)
    const mergeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="合并拆分"]',
    )
    expect(mergeButton).toBeTruthy()
    expect(mergeButton?.disabled).toBe(true)
    expect(
      container.querySelector('button[aria-label="移除第 1 行"]'),
    ).toBeTruthy()
    expect(container.querySelector('button[aria-label="拆分数量"]')).toBeNull()
  })

  it('三份以上时合并按钮可用', () => {
    renderSection({
      rows: [
        buildRow({ rowId: '1', partIndex: 0, partCount: 3, quantity: 3 }),
        buildRow({ rowId: '1#1', partIndex: 1, partCount: 3, quantity: 3 }),
        buildRow({ rowId: '1#2', partIndex: 2, partCount: 3, quantity: 2 }),
      ],
    })
    const mergeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="合并拆分"]',
    )
    expect(mergeButton).toBeTruthy()
    expect(mergeButton?.disabled).toBe(false)
  })
})

describe('usePickupListColumns 行实例列定义', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
  })

  it('列文案来自 row.item，数量列取行值', () => {
    let columns: ReturnType<typeof usePickupListColumns> | undefined
    function Probe() {
      columns = usePickupListColumns()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    const byKey = (key: string) =>
      columns?.find((column) => column.key === key) as
        | {
            render?: (value: unknown, row: PickupListRow) => unknown
            dataIndex?: unknown
          }
        | undefined
    const row = buildRow()
    expect(byKey('warehouseName')?.render?.(null, row)).toBe('一号仓')
    expect(byKey('brand')?.render?.(null, row)).toBe('品牌')
    expect(byKey('length')?.render?.(null, row)).toBe('9')
    expect(byKey('weightTon')?.dataIndex).toBe('weightTon')
    expect(byKey('quantity')?.dataIndex).toBe('quantity')
  })
})
