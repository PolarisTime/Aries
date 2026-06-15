import type { ModuleColumnDefinition } from '@/types/module-page'

export function insertColumnsAfter(
  columns: ModuleColumnDefinition[],
  dataIndex: string,
  insertedColumns: ModuleColumnDefinition[],
) {
  const index = columns.findIndex((column) => column.dataIndex === dataIndex)
  if (index < 0) {
    return [...columns, ...insertedColumns]
  }
  return [
    ...columns.slice(0, index + 1),
    ...insertedColumns,
    ...columns.slice(index + 1),
  ]
}

export function applyCompactItemLayout(
  columns: ModuleColumnDefinition[],
  widthMap: Record<string, number>,
  hiddenKeys: string[] = [],
) {
  const hiddenKeySet = new Set(hiddenKeys)
  return columns.flatMap((column) => {
    if (hiddenKeySet.has(column.dataIndex)) return []
    return [
      widthMap[column.dataIndex]
        ? { ...column, width: widthMap[column.dataIndex] }
        : column,
    ]
  })
}
