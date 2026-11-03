/**
 * 报价网格的选区与批量填充计划（纯函数，不依赖 React / DOM）。
 *
 * <p>Excel 式操作的共同点：先有一块「选区」，再对选区里的格子做清空 / 向下填充 / 向右填充 /
 * 批量调价。选区只记坐标（行下标 + 列下标），**不记价格**；「这一格在商品资料里是否存在」
 * 由调用方注入的 {@link GridLookup} 决定 —— 报价表的列来自商品资料，不存在品牌 × 材质 ×
 * 定尺 × 规格的组合连输入框都没有，批量操作必须跳过它们而不是写脏键。</p>
 */

export type CellPoint = { row: number; col: number }

/** 一个物料表内的选区：类别 + 材质定表，anchor/focus 是框选的两个角。 */
export type GridSelection = {
  category: string
  material: string
  anchor: CellPoint
  focus: CellPoint
}

/** 归一化后的矩形：top ≤ bottom、left ≤ right。 */
export type SelectionBounds = {
  top: number
  bottom: number
  left: number
  right: number
}

/** 一个可写格子的身份：品牌 + 后端条目键（`类别|材质|规格|定尺`）。 */
export type GridAddress = { brandName: string; rowKey: string }

export type GridLookup = (row: number, col: number) => GridAddress | null

export type GridCellValue = GridAddress & { value: number | null }

export function selectSingle(
  category: string,
  material: string,
  point: CellPoint,
): GridSelection {
  return {
    category,
    material,
    anchor: { ...point },
    focus: { ...point },
  }
}

/** Shift+单击 / 拖拽：锚点不动，只把焦点挪到新格子。 */
export function extendSelection(
  selection: GridSelection,
  point: CellPoint,
): GridSelection {
  return { ...selection, focus: { ...point } }
}

export function selectionBounds(selection: GridSelection): SelectionBounds {
  const { anchor, focus } = selection
  return {
    top: Math.min(anchor.row, focus.row),
    bottom: Math.max(anchor.row, focus.row),
    left: Math.min(anchor.col, focus.col),
    right: Math.max(anchor.col, focus.col),
  }
}

export function boundsContain(
  bounds: SelectionBounds,
  row: number,
  col: number,
): boolean {
  return (
    row >= bounds.top &&
    row <= bounds.bottom &&
    col >= bounds.left &&
    col <= bounds.right
  )
}

export function boundsCellCount(bounds: SelectionBounds): number {
  const rows = bounds.bottom - bounds.top + 1
  const cols = bounds.right - bounds.left + 1
  return rows > 0 && cols > 0 ? rows * cols : 0
}

/** 选区内的**可写**格子，行优先顺序（批量调价、统计与 fill 共用它遍历）。 */
export function listSelectionCells(args: {
  bounds: SelectionBounds
  lookup: GridLookup
}): { point: CellPoint; address: GridAddress }[] {
  const cells: { point: CellPoint; address: GridAddress }[] = []
  for (let row = args.bounds.top; row <= args.bounds.bottom; row += 1) {
    for (let col = args.bounds.left; col <= args.bounds.right; col += 1) {
      const address = args.lookup(row, col)
      if (!address) continue
      cells.push({ point: { row, col }, address })
    }
  }
  return cells
}

/**
 * Ctrl+D（向下）/ Ctrl+R（向右）的填充计划。
 *
 * <p>源是选区的**首行**（向下）或**首列**（向右），与 Excel 一致：先选「源格 + 要填成它一样的格子」，
 * 再按键。源格不存在（该列在商品资料里没有这个组合）时整列/整行跳过，并计入 `skipped`，
 * 让界面能如实告诉用户「有几格没填」。</p>
 */
export function buildFillPlan(args: {
  bounds: SelectionBounds
  mode: 'down' | 'right'
  lookup: GridLookup
  valueOf: (address: GridAddress) => number | null
}): { cells: GridCellValue[]; skipped: number } {
  // 解构名不能直接叫 `valueOf`：它会遮蔽全局的 `Object.prototype.valueOf`，biome 的
  // `noShadowRestrictedNames` 会判错；改成 readValueOf 后语义也更清楚（它是"读值"）。
  const { bounds, lookup, valueOf: readValueOf } = args
  const cells: GridCellValue[] = []
  let skipped = 0

  if (args.mode === 'down') {
    for (let col = bounds.left; col <= bounds.right; col += 1) {
      const source = lookup(bounds.top, col)
      if (!source) {
        skipped += Math.max(bounds.bottom - bounds.top, 0)
        continue
      }
      const value = readValueOf(source)
      for (let row = bounds.top + 1; row <= bounds.bottom; row += 1) {
        const target = lookup(row, col)
        if (!target) {
          skipped += 1
          continue
        }
        cells.push({ ...target, value })
      }
    }
  } else {
    for (let row = bounds.top; row <= bounds.bottom; row += 1) {
      const source = lookup(row, bounds.left)
      if (!source) {
        skipped += Math.max(bounds.right - bounds.left, 0)
        continue
      }
      const value = readValueOf(source)
      for (let col = bounds.left + 1; col <= bounds.right; col += 1) {
        const target = lookup(row, col)
        if (!target) {
          skipped += 1
          continue
        }
        cells.push({ ...target, value })
      }
    }
  }

  return { cells, skipped }
}

/**
 * Delete 的清空计划：只清**本来有价**的格子。
 *
 * <p>空格子不算「清空」，否则一次 Delete 会把草稿里塞满一堆 `null`，保存载荷里看不出用户到底改了
 * 什么；`skipped` 只统计商品资料里不存在的格子。</p>
 */
export function buildClearPlan(args: {
  bounds: SelectionBounds
  lookup: GridLookup
  valueOf: (address: GridAddress) => number | null
}): { cells: GridCellValue[]; skipped: number } {
  const cells: GridCellValue[] = []
  let skipped = 0
  for (let row = args.bounds.top; row <= args.bounds.bottom; row += 1) {
    for (let col = args.bounds.left; col <= args.bounds.right; col += 1) {
      const address = args.lookup(row, col)
      if (!address) {
        skipped += 1
        continue
      }
      if (args.valueOf(address) === null) continue
      cells.push({ ...address, value: null })
    }
  }
  return { cells, skipped }
}

/**
 * Tab / Shift+Tab 的下一个可写格：行优先遍历，跨行不跨表，**不回环**。
 *
 * <p>不回环是有意的：报价表一屏几十行，跳到表尾再回到表头会让人以为"没动"；
 * 走到末尾就停住，用户自己点目标格。</p>
 */
export function nextCell(args: {
  rows: number
  cols: number
  current: CellPoint
  step: 1 | -1
  exists: (point: CellPoint) => boolean
}): CellPoint | null {
  const { rows, cols, step } = args
  if (rows <= 0 || cols <= 0) return null
  let row = args.current.row
  let col = args.current.col
  for (;;) {
    col += step
    if (col >= cols) {
      col = 0
      row += 1
    } else if (col < 0) {
      col = cols - 1
      row -= 1
    }
    if (row < 0 || row >= rows) return null
    const point = { row, col }
    if (args.exists(point)) return point
  }
}
