import { parseTableColumnWidth } from '@/utils/table-column-width'

export const MIN_TABLE_BODY_SCROLL_Y = 120

export function computeTableBodyScrollY(
  containerHeight: number,
  headerHeight: number,
  paginationHeight: number,
) {
  return Math.max(
    MIN_TABLE_BODY_SCROLL_Y,
    containerHeight - headerHeight - paginationHeight,
  )
}

/** 汇总各列宽度，用于普通列表页计算横向滚动范围 */
export function sumColumnWidths(columnWidths: unknown[]) {
  return columnWidths.reduce<number>(
    (total, width) => total + parseTableColumnWidth(width),
    0,
  )
}

export function computeTableScrollX({
  columnWidths,
  containerWidth,
  selectionColumnWidth,
}: {
  columnWidths: unknown[]
  containerWidth: number
  selectionColumnWidth: number
}) {
  const columnsWidth = columnWidths.reduce<number>(
    (total, width) => total + parseTableColumnWidth(width),
    0,
  )
  const contentWidth = columnsWidth + selectionColumnWidth
  if (containerWidth <= 0) return contentWidth
  return contentWidth > containerWidth ? contentWidth : undefined
}

/** 仅使用真实容器高度；零高度表示标签页隐藏或尚未完成布局。 */
export function computeTableAvailableHeight(containerHeight: number) {
  return Math.max(0, containerHeight)
}

export function buildTableScrollConfig(options: {
  dataLength: number
  isVirtual: boolean
  scrollX: number | undefined
  scrollY: number
  shellWidth: number
}) {
  const { isVirtual, scrollX, scrollY, shellWidth } = options
  return {
    x: isVirtual ? (scrollX ?? Math.max(shellWidth, 1)) : scrollX,
    y: scrollY,
  }
}

/**
 * 行内「可交互元素」清单：命中的元素上不触发行的点选 / 双击 / 拖拽框选。
 *
 * <p>收敛到一处：行的 `onClick`、`onDoubleClick`、`onKeyDown` 与拖拽框选的 `onMouseDown`
 * 必须用同一份清单 —— 否则会出现"从按钮上按下鼠标开始框选"这类错位（按钮点了没反应，
 * 反而整段行被选中）。</p>
 */
export const ROW_INTERACTION_EXCLUSION_SELECTOR =
  'button, a, input, textarea, select, [contenteditable="true"], .ant-btn, .ant-checkbox-wrapper, .ant-checkbox, .table-action-group, [role="button"]'

export function shouldIgnoreRowInteraction(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest(ROW_INTERACTION_EXCLUSION_SELECTOR))
  )
}
