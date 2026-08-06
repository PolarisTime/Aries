const MIN_TABLE_BODY_SCROLL_Y = 120
const DEFAULT_COLUMN_WIDTH = 120

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

export function parseTableColumnWidth(width: unknown) {
  if (typeof width === 'number' && Number.isFinite(width)) return width
  if (typeof width === 'string') {
    const parsed = Number.parseInt(width, 10)
    return Number.isFinite(parsed) ? parsed : DEFAULT_COLUMN_WIDTH
  }
  return DEFAULT_COLUMN_WIDTH
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

export function computeTableAvailableHeight({
  containerHeight,
  viewportHeight,
  containerTop,
  bottomInset,
}: {
  containerHeight: number
  viewportHeight: number
  containerTop: number
  bottomInset: number
}) {
  if (containerHeight > 0) return containerHeight

  const viewportAvailableHeight =
    viewportHeight > 0 && containerTop >= 0
      ? Math.max(0, viewportHeight - containerTop - bottomInset)
      : 0
  return viewportAvailableHeight
}

export function buildTableScrollConfig({
  dataLength,
  isVirtual,
  scrollX,
  scrollY,
  shellWidth,
}: {
  dataLength: number
  isVirtual: boolean
  scrollX: number | undefined
  scrollY: number
  shellWidth: number
}) {
  if (dataLength === 0) return undefined
  return {
    x: isVirtual ? (scrollX ?? Math.max(shellWidth, 1)) : scrollX,
    y: scrollY,
  }
}
