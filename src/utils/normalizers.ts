import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asArray, asId, asString } from '@/utils/type-narrowing'

export type LineItem = ModuleLineItem

/**
 * 将字符串数组规范化为去重、去空的字符串数组
 */
export function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }
  return Array.from(
    new Set(
      value.flatMap((item) => {
        const v = String(item || '').trim()
        return v ? [v] : []
      }),
    ),
  )
}

/**
 * 将逗号分隔的字符串解析为字符串数组
 */

/**
 * 将未知值规范化为字符串数组（支持数组和逗号分隔字符串）
 */
export function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const v = String(item).trim()
      return v ? [v] : []
    })
  }
  if (typeof value === 'string') {
    return value.split(',').flatMap((item) => {
      const v = item.trim()
      return v ? [v] : []
    })
  }
  return []
}

/**
 * 规范化行项目数据
 */
function normalizeLineItem(raw: ModuleRecordInput): ModuleLineItem {
  const result: ModuleLineItem = { id: asString(raw.id ?? raw.lineNo) }
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'id' || key === 'lineNo') {
      result[key] = value == null ? '' : asString(value)
    } else {
      result[key] = value
    }
  }
  return result
}

/**
 * 规范化模块记录数据
 */
export function normalizeRecord(raw: ModuleRecordInput): ModuleRecord {
  const items = asArray<ModuleRecordInput>(raw.items)
  const { items: _rawItems, ...rawFields } = raw
  const normalized: ModuleRecord = {
    ...rawFields,
    id: asId(raw.id) || asString(raw.id),
  }
  if (items.length > 0) {
    normalized.items = items.map(normalizeLineItem)
  }
  return normalized
}

/**
 * 规范化多行记录数据
 */
export function normalizeRows(rows: unknown): ModuleRecord[] {
  return asArray<ModuleRecord>(rows).map(normalizeRecord)
}
