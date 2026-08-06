const DEFAULT_COLUMN_WIDTH = 120

/**
 * 将 antd 列的 width（number 或 string）解析为数值像素宽度。
 * 供 hooks/ 层与表格工具层共用，避免 hooks 导入 views/。
 */
export function parseTableColumnWidth(width: unknown) {
  if (typeof width === 'number' && Number.isFinite(width)) return width
  if (typeof width === 'string') {
    const parsed = Number.parseInt(width, 10)
    return Number.isFinite(parsed) ? parsed : DEFAULT_COLUMN_WIDTH
  }
  return DEFAULT_COLUMN_WIDTH
}
