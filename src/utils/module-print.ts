export interface PrintableField {
  label: string
  value: string
}

export interface PrintableColumn {
  title: string
  align?: 'left' | 'center' | 'right'
}

export interface ModulePrintDocument {
  title: string
  subtitle?: string
  fields: PrintableField[]
  columns?: PrintableColumn[]
  rows?: string[][]
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatPrintTime() {
  const current = new Date()
  const date = [
    current.getFullYear(),
    String(current.getMonth() + 1).padStart(2, '0'),
    String(current.getDate()).padStart(2, '0'),
  ].join('-')
  const time = [
    String(current.getHours()).padStart(2, '0'),
    String(current.getMinutes()).padStart(2, '0'),
    String(current.getSeconds()).padStart(2, '0'),
  ].join(':')
  return `${date} ${time}`
}

function renderFieldRows(fields: PrintableField[]) {
  const rows: string[] = []
  for (let index = 0; index < fields.length; index += 2) {
    const left = fields[index]
    const right = fields[index + 1]
    rows.push(
      `<tr>
        <th style="width: 14%;">${escapeHtml(left.label)}</th>
        <td style="width: 36%;">${escapeHtml(left.value).replaceAll('\n', '<br>')}</td>
        <th style="width: 14%;">${right ? escapeHtml(right.label) : ''}</th>
        <td style="width: 36%;">${right ? escapeHtml(right.value).replaceAll('\n', '<br>') : ''}</td>
      </tr>`,
    )
  }
  return rows.join('')
}

function renderItemsTable(columns: PrintableColumn[], rows: string[][]) {
  if (!columns.length || !rows.length) {
    return ''
  }

  const headerHtml = columns
    .map((column) => `<th style="text-align:${column.align || 'left'};">${escapeHtml(column.title)}</th>`)
    .join('')
  const bodyHtml = rows
    .map((row) => `<tr>${row.map((cell, index) => `<td style="text-align:${columns[index]?.align || 'left'};">${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')

  return `<div class="print-block">
    <table>
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${bodyHtml}</tbody>
    </table>
  </div>`
}

export function buildModulePrintHtml(document: ModulePrintDocument) {
  return `
    <h1>${escapeHtml(document.title)}</h1>
    ${document.subtitle ? `<div class="print-subtitle">${escapeHtml(document.subtitle)}</div>` : ''}
    <table>
      <tbody>${renderFieldRows(document.fields)}</tbody>
    </table>
    ${renderItemsTable(document.columns || [], document.rows || [])}
    <div class="print-footnote">打印时间：${escapeHtml(formatPrintTime())}</div>
  `
}
