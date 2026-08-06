import type { ColumnsType, ColumnType, TableProps } from 'antd/es/table'
import { useMemo } from 'react'
import {
  MAX_COLUMN_WIDTH,
  MIN_COLUMN_WIDTH,
  ResizableHeaderCell,
} from '@/components/table/ResizableHeaderCell'
import { parseTableColumnWidth } from '@/utils/table-column-width'

export interface UseColumnResizingOptions<T> {
  /** 原始 antd 列（宽度为默认值） */
  columns: ColumnsType<T>
  /** 已持久化的列宽覆盖（key 为列 key/dataIndex） */
  columnSizes: Record<string, number>
  /** 拖拽中实时回调（仅更新 UI） */
  onResizePreview: (columnKey: string, width: number) => void
  /** 拖拽结束回调（触发持久化） */
  onResizeCommit: () => void
  /** 双击把手复位单列宽度 */
  onResizeReset: (columnKey: string) => void
  /** 判定某列是否可拖拽调整，默认列定义了 width 则可调 */
  isResizable?: (column: ColumnType<T>, index: number) => boolean
  minWidth?: number
  maxWidth?: number
}

export interface UseColumnResizingResult<T> {
  columns: ColumnsType<T>
  components: TableProps<T>['components']
}

/**
 * 为 antd Table 注入列宽拖拽能力（纯表现层）：
 * ① 用 columnSizes 覆盖各列 width；② 为可调列注入 onHeaderCell 元数据；
 * ③ 返回稳定的 `components`（header.cell = ResizableHeaderCell）。
 *
 * columns 不做 useMemo，每次渲染重建以拿到最新 columnSizes 与回调，
 * 与 use-business-grid-table 的 buildAntdColumns 现状保持一致。
 */
export function useColumnResizing<T>({
  columns,
  columnSizes,
  onResizePreview,
  onResizeCommit,
  onResizeReset,
  isResizable,
  minWidth = MIN_COLUMN_WIDTH,
  maxWidth = MAX_COLUMN_WIDTH,
}: UseColumnResizingOptions<T>): UseColumnResizingResult<T> {
  const resolveResizable =
    isResizable ?? ((column: ColumnType<T>) => column.width != null)

  const resizableColumns: ColumnsType<T> = columns.map((column, index) => {
    // 列组（含 children）不参与列宽拖拽，原样返回
    if ('children' in column && Array.isArray(column.children)) {
      return column
    }
    const col = column as ColumnType<T>
    const key = String(col.key ?? col.dataIndex ?? index)
    const resizable = resolveResizable(col, index)
    const defaultWidth = parseTableColumnWidth(col.width)

    const merged: ColumnType<T> = {
      ...col,
      // 不可调列（操作列/序号列等）保持原宽
      width: resizable ? (columnSizes[key] ?? col.width) : col.width,
      onHeaderCell: (headerColumn, headerIndex) => {
        const existing =
          typeof col.onHeaderCell === 'function'
            ? col.onHeaderCell(headerColumn, headerIndex)
            : undefined
        if (!resizable) {
          return existing ?? {}
        }
        return {
          ...(existing ?? {}),
          'data-column-key': key,
          'data-resizable': 'true',
          'data-default-width': String(defaultWidth),
          'data-min-width': String(minWidth),
          'data-max-width': String(maxWidth),
          onResizePreview: (width: number) => onResizePreview(key, width),
          onResizeCommit,
          onResizeReset: () => onResizeReset(key),
        } as ReturnType<NonNullable<ColumnType<T>['onHeaderCell']>>
      },
    }
    return merged
  })

  const components = useMemo<TableProps<T>['components']>(
    () => ({ header: { cell: ResizableHeaderCell } }),
    [],
  )

  return { columns: resizableColumns, components }
}
