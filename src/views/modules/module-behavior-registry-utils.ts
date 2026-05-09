import type { ModuleLineItem } from '@/types/module-page'

export function normalizeBehaviorStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function collectUniqueSourceNos(items: ModuleLineItem[]): string {
  return Array.from(
    new Set(
      items.map((item) => String(item.sourceNo || '').trim()).filter(Boolean),
    ),
  ).join(', ')
}
