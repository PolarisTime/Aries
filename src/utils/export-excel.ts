import * as XLSX from 'xlsx'
import type { ModuleColumnDefinition, ModuleRecord } from '@/types/module-page'

function formatCell(value: unknown): string {
  if (value === undefined || value === null) return ''
  return String(value)
}

export function exportRecordsToXlsx(
  title: string,
  columns: ModuleColumnDefinition[],
  rows: ModuleRecord[],
  valueFormatter?: (column: ModuleColumnDefinition, value: unknown, record: ModuleRecord) => string,
) {
  const headers = columns.map((c) => c.title)
  const data = rows.map((record) =>
    columns.map((col) => {
      if (valueFormatter) return valueFormatter(col, record[col.dataIndex], record)
      return formatCell(record[col.dataIndex])
    }),
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31))
  XLSX.writeFile(wb, `${title}.xlsx`)
}

/** Legacy wrapper for backward compatibility */
export function exportRecordsToExcel(
  moduleKey: string,
  rows: ModuleRecord[],
) {
  const filename = moduleKey || 'export'
  const headers = rows.length > 0 ? Object.keys(rows[0]) : []
  const data = rows.map((row) => headers.map((h) => formatCell(row[h])))

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}
