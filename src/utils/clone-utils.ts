import type { ModuleLineItem } from '@/types/module-page'

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}


export function cloneLineItems(
  items: unknown,
  prefix?: string,
): ModuleLineItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  if (prefix) {
    return cloneRecord(items).map((item: ModuleLineItem, index: number) => ({
      ...item,
      id: buildLineItemId(prefix, index),
    }))
  }

  return cloneRecord(items) as ModuleLineItem[]
}


function buildLineItemId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index + 1}`
}
