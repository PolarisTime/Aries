import { cloneDeep } from 'es-toolkit'
import type { ModuleLineItem } from '@/types/module-page'

export function cloneLineItems(
  items: unknown,
  prefix?: string,
): ModuleLineItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  if (prefix) {
    return cloneDeep(items).map((item: ModuleLineItem) => ({
      ...item,
      id: buildLineItemId(prefix),
    }))
  }

  return cloneDeep(items) as ModuleLineItem[]
}

function buildLineItemId(prefix: string) {
  const uniqueId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${uniqueId}`
}
