import type { PriceRow } from './types'

/**
 * 比价表格的键盘焦点移动（从 `SheetPanel.tsx` 抽出的独立职责）。
 *
 * <p>按方向在行内移动焦点，并跳过无法聚焦的中间行（如隔断行没有输入框），
 * 保证 Tab/Enter/方向键能穿过隔断继续定位到下一可编辑行。纯 DOM 逻辑，可直接单测。</p>
 */

/**
 * 在 `orderedRows` 中从 `rowId` 依 `delta` 方向寻找第一个可聚焦输入框并聚焦。
 *
 * @return 是否移动了焦点。边界（列首/列尾）返回 false，调用方据此放行浏览器默认 Tab，
 *         否则 preventDefault 后焦点原地不动，整列会变成键盘陷阱。
 */
export function moveFocusBy(
  orderedRows: PriceRow[],
  rowId: string,
  delta: number,
  selectorOf: (row: PriceRow) => string,
): boolean {
  if (delta === 0) return false
  const index = orderedRows.findIndex((row) => row.id === rowId)
  if (index < 0) return false
  for (let i = index + delta; i >= 0 && i < orderedRows.length; i += delta) {
    const input = document.querySelector<HTMLInputElement>(
      selectorOf(orderedRows[i]),
    )
    if (!input) continue
    input.focus()
    input.select()
    return true
  }
  return false
}

/** 现货价列内的焦点移动（选择器 `input[data-spot="品牌:行"]`）。 */
export function moveFocus(orderedRows: PriceRow[]) {
  return (brandName: string, rowId: string, delta: number) =>
    moveFocusBy(
      orderedRows,
      rowId,
      delta,
      (row) => `input[data-spot="${brandName}:${row.id}"]`,
    )
}

/** 吨位列内的焦点移动（选择器 `input[data-ton="行"]`）。 */
export function moveFocusTon(orderedRows: PriceRow[]) {
  return (rowId: string, delta: number) =>
    moveFocusBy(
      orderedRows,
      rowId,
      delta,
      (row) => `input[data-ton="${row.id}"]`,
    )
}
