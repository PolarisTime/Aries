import type { ModuleLineItem } from '@/types/module-page'

export function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function cloneLineItems(value: unknown): ModuleLineItem[] {
  if (!Array.isArray(value)) {
    return []
  }
  return cloneRecord(value) as ModuleLineItem[]
}

export function resetReactiveObject(target: Record<string, unknown>, next: Record<string, unknown>) {
  Object.keys(target).forEach((key) => {
    delete target[key]
  })
  Object.assign(target, next)
}
