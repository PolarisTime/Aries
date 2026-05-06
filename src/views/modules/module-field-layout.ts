interface RowField {
  row?: number
}

function normalizeRow(value: unknown) {
  const row = Number(value)
  if (!Number.isFinite(row) || row < 1) {
    return 1
  }
  return Math.trunc(row)
}

export function groupFieldsByRow<T extends RowField>(fields: T[]): T[][] {
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
