import type { ModuleRecord } from '@/types/module-page'

/**
 * 拖拽框选：把「起点行 ~ 当前行」换算成要勾选的 key。
 *
 * <p>纯函数（不碰 DOM、不读事件），因此可以直接单测边界：向上拖、向下拖、越界、
 * 跨页已有勾选（`baseKeys`）怎么并入。</p>
 *
 * <p>语义对齐 Windows 资源管理器：不按修饰键时**替换**为这一段；按住 Ctrl/⌘ 时
 * 把这一段**并入**拖拽开始前的勾选。</p>
 */
export interface RowRangeSelectionInput {
  /** 当前页数据，顺序即视觉顺序（序号就按这个顺序排） */
  dataSource: readonly ModuleRecord[]
  /** 拖拽起点所在行下标 */
  anchorIndex: number
  /** 当前指针所在行下标 */
  focusIndex: number
  /** 拖拽开始前的勾选（含其它页已勾选的行） */
  baseKeys: readonly string[]
  /** Ctrl / ⌘ 按下 → 并入而不是替换 */
  additive: boolean
}

export interface RowRangeSelectionResult {
  /** 结果 key（字符串化的行 id），可直接交给 `rowSelection.onChange` */
  keys: string[]
  /**
   * 当前页内能提供行对象的那些行。
   *
   * <p>跨页勾选的 key 在 `keys` 里保留、但不在这里 —— 上层 `selectedRowMap` 只删除
   * "不再勾选"的项，已有行对象不会被清掉，与单行点选的既有行为一致。</p>
   */
  rows: ModuleRecord[]
}

export function resolveRowRangeSelection({
  dataSource,
  anchorIndex,
  focusIndex,
  baseKeys,
  additive,
}: RowRangeSelectionInput): RowRangeSelectionResult {
  if (dataSource.length === 0) return { keys: [], rows: [] }

  const clampIndex = (index: number) =>
    Math.min(Math.max(index, 0), dataSource.length - 1)
  const from = clampIndex(Math.min(anchorIndex, focusIndex))
  const to = clampIndex(Math.max(anchorIndex, focusIndex))

  const keys: string[] = []
  const seen = new Set<string>()
  const push = (key: string) => {
    if (seen.has(key)) return
    seen.add(key)
    keys.push(key)
  }
  if (additive) {
    for (const key of baseKeys) push(String(key))
  }
  for (const row of dataSource.slice(from, to + 1)) push(String(row.id))

  const keySet = new Set(keys)
  return { keys, rows: dataSource.filter((row) => keySet.has(String(row.id))) }
}
