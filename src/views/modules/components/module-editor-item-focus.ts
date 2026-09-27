/** 明细行内可编辑字段的候选选择器：排除勾选列、拖拽列与隐藏域。 */
const EDITABLE_CELL_SELECTOR = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])',
  'textarea',
  '[contenteditable="true"]',
].join(',')

/**
 * 把焦点落到指定明细行的「首格」。
 *
 * <p>优先聚焦该行第一个可编辑输入控件（商品选择、数量、单价等）；
 * 行内没有输入控件时回落到行内第一个可聚焦元素。返回是否成功聚焦，
 * 便于调用方（复制本行）在失败时不做额外处理。</p>
 */
export function focusFirstEditableItemCell(row: HTMLElement | null): boolean {
  if (!row) return false
  const target =
    row.querySelector<HTMLElement>(EDITABLE_CELL_SELECTOR) ??
    row.querySelector<HTMLElement>('[tabindex]:not([tabindex="-1"])')
  if (!target) return false
  target.focus()
  return true
}
