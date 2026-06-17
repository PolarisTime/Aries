import { cloneDeep } from 'lodash-es'
import type { ModuleLineItem } from '@/types/module-page'

export function cloneLineItems(
  items: unknown,
  prefix?: string,
): ModuleLineItem[] {
  if (!Array.isArray(items)) {
    return []
  }

  if (prefix) {
    return cloneDeep(items).map((item: ModuleLineItem, index: number) => ({
      ...item,
      id: buildLineItemId(prefix, index),
    }))
  }

  return cloneDeep(items) as ModuleLineItem[]
}

function buildLineItemId(prefix: string, index: number) {
  return `${prefix}-${Date.now()}-${index + 1}`
}
