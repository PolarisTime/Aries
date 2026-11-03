import { describe, expect, it } from 'vitest'
import {
  boundsCellCount,
  boundsContain,
  buildClearPlan,
  buildFillPlan,
  extendSelection,
  type GridLookup,
  type GridSelection,
  listSelectionCells,
  nextCell,
  selectionBounds,
  selectSingle,
} from './supplier-quote-selection'

/** 3×3 假网格：`holes` 里的坐标表示商品资料里不存在（渲染时没有输入框）。 */
const lookupWithHoles =
  (holes: readonly string[]): GridLookup =>
  (row, col) =>
    holes.includes(`${row},${col}`)
      ? null
      : { brandName: `brand-${col}`, rowKey: `key-${row}-${col}` }

const valuesOf = (entries: Record<string, number | null>) => {
  return (address: { rowKey: string }) => entries[address.rowKey] ?? null
}

describe('报价网格选区', () => {
  it('anchor/focus 不要求顺序：反向框选要归一化', () => {
    const selection: GridSelection = {
      category: '直条',
      material: 'HRB400E',
      anchor: { row: 3, col: 2 },
      focus: { row: 1, col: 0 },
    }
    expect(selectionBounds(selection)).toEqual({
      top: 1,
      bottom: 3,
      left: 0,
      right: 2,
    })
    expect(boundsContain(selectionBounds(selection), 1, 0)).toBe(true)
    expect(boundsContain(selectionBounds(selection), 4, 0)).toBe(false)
    expect(boundsCellCount(selectionBounds(selection))).toBe(9)
  })

  it('单击建单格选区，Shift/拖拽只移动焦点', () => {
    const single = selectSingle('直条', 'HRB400E', { row: 2, col: 3 })
    expect(single.anchor).toEqual({ row: 2, col: 3 })
    expect(single.focus).toEqual({ row: 2, col: 3 })
    const extended = extendSelection(single, { row: 4, col: 5 })
    expect(extended.anchor).toEqual({ row: 2, col: 3 })
    expect(extended.focus).toEqual({ row: 4, col: 5 })
    expect(extended).not.toBe(single)
  })

  it('listSelectionCells 行优先、跳过不存在的格子', () => {
    const result = listSelectionCells({
      bounds: { top: 0, bottom: 1, left: 0, right: 2 },
      lookup: lookupWithHoles(['1,1']),
    })
    expect(result.map((cell) => `${cell.point.row},${cell.point.col}`)).toEqual(
      ['0,0', '0,1', '0,2', '1,0', '1,2'],
    )
  })

  it('Ctrl+D：源为首行，向下填满；不存在的格子计入 skipped', () => {
    const plan = buildFillPlan({
      bounds: { top: 0, bottom: 2, left: 0, right: 1 },
      mode: 'down',
      lookup: lookupWithHoles(['1,1']),
      valueOf: valuesOf({ 'key-0-0': 3280, 'key-0-1': 3300 }),
    })
    expect(plan.skipped).toBe(1)
    expect(plan.cells).toEqual([
      { brandName: 'brand-0', rowKey: 'key-1-0', value: 3280 },
      { brandName: 'brand-0', rowKey: 'key-2-0', value: 3280 },
      { brandName: 'brand-1', rowKey: 'key-2-1', value: 3300 },
    ])
  })

  it('Ctrl+D：源格为空时写 null（清空目标），源格不存在时整列跳过', () => {
    const plan = buildFillPlan({
      bounds: { top: 0, bottom: 1, left: 0, right: 1 },
      mode: 'down',
      lookup: lookupWithHoles(['0,1']),
      valueOf: valuesOf({ 'key-1-0': 3280 }),
    })
    expect(plan.cells).toEqual([
      { brandName: 'brand-0', rowKey: 'key-1-0', value: null },
    ])
    expect(plan.skipped).toBe(1)
  })

  it('Ctrl+R：源为首列，向右填满', () => {
    const plan = buildFillPlan({
      bounds: { top: 0, bottom: 1, left: 0, right: 2 },
      mode: 'right',
      lookup: lookupWithHoles(['0,2']),
      valueOf: valuesOf({ 'key-0-0': 3280, 'key-1-0': 3300 }),
    })
    expect(plan.skipped).toBe(1)
    expect(plan.cells).toEqual([
      { brandName: 'brand-1', rowKey: 'key-0-1', value: 3280 },
      { brandName: 'brand-1', rowKey: 'key-1-1', value: 3300 },
      { brandName: 'brand-2', rowKey: 'key-1-2', value: 3300 },
    ])
  })

  it('单格选区没有可填目标', () => {
    const plan = buildFillPlan({
      bounds: { top: 1, bottom: 1, left: 1, right: 1 },
      mode: 'down',
      lookup: lookupWithHoles([]),
      valueOf: valuesOf({ 'key-1-1': 3280 }),
    })
    expect(plan.cells).toEqual([])
    expect(plan.skipped).toBe(0)
  })

  it('Delete：只清本来有价的格子', () => {
    const plan = buildClearPlan({
      bounds: { top: 0, bottom: 0, left: 0, right: 2 },
      lookup: lookupWithHoles(['0,2']),
      valueOf: valuesOf({ 'key-0-0': 3280, 'key-0-1': null }),
    })
    expect(plan.cells).toEqual([
      { brandName: 'brand-0', rowKey: 'key-0-0', value: null },
    ])
    expect(plan.skipped).toBe(1)
  })

  it('Tab / Shift+Tab：行末跳下一行，跳过不存在的格子，不回环', () => {
    const exists = (point: { row: number; col: number }) =>
      !(point.row === 0 && point.col === 1)
    expect(
      nextCell({
        rows: 2,
        cols: 3,
        current: { row: 0, col: 0 },
        step: 1,
        exists,
      }),
    ).toEqual({ row: 0, col: 2 })
    expect(
      nextCell({
        rows: 2,
        cols: 3,
        current: { row: 0, col: 2 },
        step: 1,
        exists,
      }),
    ).toEqual({ row: 1, col: 0 })
    expect(
      nextCell({
        rows: 2,
        cols: 3,
        current: { row: 1, col: 2 },
        step: 1,
        exists,
      }),
    ).toBeNull()
    expect(
      nextCell({
        rows: 2,
        cols: 3,
        current: { row: 1, col: 0 },
        step: -1,
        exists,
      }),
    ).toEqual({ row: 0, col: 2 })
    expect(
      nextCell({
        rows: 2,
        cols: 3,
        current: { row: 0, col: 0 },
        step: -1,
        exists,
      }),
    ).toBeNull()
  })
})
