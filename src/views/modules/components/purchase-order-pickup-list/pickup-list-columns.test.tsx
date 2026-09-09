// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { usePickupListColumns } from './pickup-list-columns'

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

  it('返回 10 列且包含拖拽把手列', () => {
    let columns: ReturnType<typeof usePickupListColumns> | undefined
    function Probe() {
      columns = usePickupListColumns()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    expect(columns).toHaveLength(10)
    expect(columns?.[0]?.key).toBe('drag')
    const dataIndexes = columns
      ?.slice(1)
      .map((column) => ('dataIndex' in column ? column.dataIndex : undefined))
    expect(dataIndexes).toEqual([
      'warehouseName',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'pickupQuantity',
      'pieceWeightTon',
      'pickupWeightTon',
    ])
  })

  it('空值渲染为占位符 -', () => {
    let columns: ReturnType<typeof usePickupListColumns> | undefined
    function Probe() {
      columns = usePickupListColumns()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    const warehouseColumn = columns?.find(
      (column) => 'dataIndex' in column && column.dataIndex === 'warehouseName',
    ) as { render?: (value: string | null) => string } | undefined
    expect(warehouseColumn?.render?.(null)).toBe('-')
    expect(warehouseColumn?.render?.('  ')).toBe('-')
    expect(warehouseColumn?.render?.('仓库')).toBe('仓库')
  })

  it('重量列使用 formatWeight 渲染', () => {
    let columns: ReturnType<typeof usePickupListColumns> | undefined
    function Probe() {
      columns = usePickupListColumns()
      return null
    }
    act(() => {
      root.render(createElement(Probe))
    })
    const weightColumn = columns?.find(
      (column) =>
        'dataIndex' in column && column.dataIndex === 'pieceWeightTon',
    ) as { render?: (value: number) => unknown } | undefined
    expect(weightColumn?.render?.(0.25)).toBe('0.250')
  })
})
