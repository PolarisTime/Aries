import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

export function cloneRecord<T>(value: T): T {
  return structuredClone(value)
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

export function resetReactiveObject(target: ModuleRecord, next: ModuleRecord) {
  Object.keys(target).forEach((key) => {
    delete target[key]
  })
  Object.assign(target, next)
}

function buildLineItemId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index + 1}`
}
