import { safe, asString, asArray, asId } from '@/utils/type-narrowing'
import type { ModuleRecord, ModuleLineItem } from '@/shared/schemas'

/**
 * API 响应规范化 — 将后端返回的原始数据转换为类型安全的 ModuleRecord。
 * 与 Zod schema 校验互补：Zod 负责类型验证，normalizer 负责字段格式化（id→string 等）。
 */

export function normalizeLineItem(raw: Record<string, unknown>): ModuleLineItem {
  const s = safe(raw)
  const result: Record<string, unknown> = { id: asString(raw.id ?? raw.lineNo) }
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'id' || key === 'lineNo') {
      result[key] = value == null ? '' : asString(value)
    } else {
      result[key] = value
    }
  }
  return result
}

export function normalizeRecord(raw: Record<string, unknown>): ModuleRecord {
  const items = asArray<Record<string, unknown>>(raw.items)
  const normalized: Record<string, unknown> = {
    ...raw,
    id: asId(raw.id) || asString(raw.id),
  }
  if (items.length > 0) {
    normalized.items = items.map(normalizeLineItem)
  }
  return normalized as unknown as ModuleRecord
}

export function normalizeRows(rows: unknown): ModuleRecord[] {
  return asArray<Record<string, unknown>>(rows).map(normalizeRecord)
}
