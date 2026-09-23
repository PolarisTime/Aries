// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderPickupListItem } from '@/api/purchase/purchase-order-pickup-list'
import { usePickupListColumns } from './pickup-list-columns'
import type { PickupListRow } from './pickup-list-draft'

function buildRow(overrides: Partial<PickupListRow> = {}): PickupListRow {
  const item: PurchaseOrderPickupListItem = {
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
  }
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

describe('usePickupListColumns', () => {
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

  const renderColumns = () => {
    let columns: ReturnType<typeof usePickupListColumns> | undefined
    function Probe() {
      columns = usePickupListColumns()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    return () => columns
  }

  it('返回 10 列且包含拖拽把手列与数量/重量列', () => {
    const getColumns = renderColumns()
    const columns = getColumns()
    expect(columns).toHaveLength(10)
    expect(columns?.[0]?.key).toBe('drag')
    const keys = columns?.slice(1).map((column) => column.key)
    expect(keys).toEqual([
      'warehouseName',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'quantity',
      'pieceWeightTon',
      'weightTon',
    ])
  })

  it('仓库/长度空值渲染为占位符 -', () => {
    const getColumns = renderColumns()
    const columns = getColumns()
    const warehouseColumn = columns?.find(
      (column) => column.key === 'warehouseName',
    ) as { render?: (value: null, row: PickupListRow) => string } | undefined
    const lengthColumn = columns?.find((column) => column.key === 'length') as
      | { render?: (value: null, row: PickupListRow) => string }
      | undefined

    expect(warehouseColumn?.render?.(null, buildRow())).toBe('一号仓')
    expect(
      warehouseColumn?.render?.(
        null,
        buildRow({
          item: {
            ...buildRow().item,
            warehouseName: '  ',
          },
        }),
      ),
    ).toBe('-')
    expect(
      lengthColumn?.render?.(
        null,
        buildRow({ item: { ...buildRow().item, length: null } }),
      ),
    ).toBe('-')
  })

  it('重量列使用拆分后的行值渲染', () => {
    const getColumns = renderColumns()
    const columns = getColumns()
    const weightColumn = columns?.find(
      (column) => column.key === 'weightTon',
    ) as { render?: (value: number) => unknown } | undefined
    expect(weightColumn?.render?.(0.25)).toBe('0.250')
  })
})
