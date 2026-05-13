import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

function toArray<T>(value: T[] | undefined) {
  return Array.isArray(value) ? value : []
}

export function normalizeLineItem(
  item: Record<string, unknown>,
): ModuleLineItem {
  const result: ModuleLineItem = { id: String(item.id ?? item.lineNo ?? '') }
  for (const [key, value] of Object.entries(item)) {
    if (key === 'id' || key === 'lineNo') {
      ;(result as Record<string, unknown>)[key] =
        value == null ? '' : String(value)
    } else {
      ;(result as Record<string, unknown>)[key] = value
    }
  }
  return result
}

export function normalizeRecord(record: Record<string, unknown>) {
  const normalized: ModuleRecord = {
    ...record,
    id: String(record.id ?? ''),
  }

  if (Array.isArray(record.items)) {
    normalized.items = record.items.map((item) =>
      normalizeLineItem(item as Record<string, unknown>),
    )
  }

  return normalized
}

export function normalizeRows(rows: unknown[] | undefined) {
  return toArray(rows).map((record) =>
    normalizeRecord(record as Record<string, unknown>),
  )
}
