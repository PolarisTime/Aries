import type { ModuleColumnDefinition, ModuleRecord } from '@/types/module-page'

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatCell(value: unknown) {
  if (value === undefined || value === null) {
    return ''
  }
  return String(value)
}

export function exportRecordsToExcel(
  title: string,
  columns: ModuleColumnDefinition[],
  rows: ModuleRecord[],
  valueFormatter: (column: ModuleColumnDefinition, value: unknown, record: ModuleRecord) => string,
) {
  const headerHtml = columns
    .map((column) => `<th>${escapeHtml(column.title)}</th>`)
    .join('')
  const bodyHtml = rows
    .map((record) => `<tr>${
      columns
        .map((column) => `<td>${escapeHtml(formatCell(valueFormatter(column, record[column.dataIndex], record)))}</td>`)
        .join('')
    }</tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
body { font-family: SimSun, serif; }
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #d9d9d9; padding: 6px 8px; font-size: 12px; }
th { background: #f5f5f5; font-weight: 700; }
</style>
</head>
<body>
<table>
<thead><tr>${headerHtml}</tr></thead>
<tbody>${bodyHtml}</tbody>
</table>
</body>
</html>`

  const blob = new Blob([`\ufeff${html}`], {
    type: 'application/vnd.ms-excel;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const date = new Date()
  const fileName = `${title}_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}.xls`
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
