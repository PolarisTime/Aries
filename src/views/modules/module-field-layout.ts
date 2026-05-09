interface RowField {
  row?: number
  fullRow?: boolean
  type?: string
}

function normalizeRow(value: unknown) {
  const row = Number(value)
  if (!Number.isFinite(row) || row < 1) {
    return 1
  }
  return Math.trunc(row)
}

export function groupFieldsByRow<T extends RowField>(fields: T[]): T[][] {
  if (!fields.length) {
    return []
  }

  const hasExplicitRows = fields.some((field) => field.row !== undefined)
  if (!hasExplicitRows) {
    const rows: T[][] = []
    let currentRow: T[] = []

    const flushCurrentRow = () => {
      if (currentRow.length) {
        rows.push(currentRow)
        currentRow = []
      }
    }

    fields.forEach((field) => {
      if (field.fullRow || field.type === 'textarea') {
        flushCurrentRow()
        rows.push([field])
        return
      }

      currentRow.push(field)
      if (currentRow.length === 4) {
        flushCurrentRow()
      }
    })

    flushCurrentRow()
    return rows
  }

  const grouped = new Map<number, T[]>()

  fields.forEach((field) => {
    const row = normalizeRow(field.row)
    const items = grouped.get(row)
    if (items) {
      items.push(field)
      return
    }
    grouped.set(row, [field])
  })

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([, items]) => items)
}
