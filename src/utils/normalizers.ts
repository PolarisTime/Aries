import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'
import { asArray, asId, asString } from '@/utils/type-narrowing'

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
