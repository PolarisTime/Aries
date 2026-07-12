import type { RawApiRecord } from '@/types/api-raw'
import {
  EntityIdContractError,
  normalizeEntityIds,
  parseEntityId,
} from '@/types/entity-id'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

function isRecord(value: unknown): value is RawApiRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeLineItem(raw: RawApiRecord, index: number): ModuleLineItem {
  const normalized = normalizeEntityIds(raw)
  return {
    ...normalized,
    id: parseEntityId(normalized.id, `items[${index}].id`),
  }
}

const FINANCIAL_ALLOCATION_SOURCE_FIELDS = [
  'sourceCustomerStatementId',
  'sourceSupplierStatementId',
  'sourceFreightStatementId',
] as const

function promoteFinancialAllocationSource(
  fields: Record<string, unknown>,
  items: ModuleLineItem[],
): Record<string, unknown> {
  const firstItem = items[0]
  if (!firstItem) {
    return fields
  }

  const promoted = { ...fields }
  for (const field of FINANCIAL_ALLOCATION_SOURCE_FIELDS) {
    if (promoted[field] == null && firstItem[field] != null) {
      promoted[field] = firstItem[field]
    }
  }
  return promoted
}

/** 在真实业务 API 边界规范化全部声明过的实体 ID。 */
export function normalizeRecord(raw: RawApiRecord): ModuleRecord {
  const normalized = normalizeEntityIds(raw)
  const id = parseEntityId(normalized.id, 'id')
  const items = Array.isArray(normalized.items)
    ? normalized.items.map(normalizeLineItem)
    : []
  const { items: _rawItems, ...fields } = normalized
  const promotedFields = promoteFinancialAllocationSource(fields, items)

  return items.length > 0
    ? { ...promotedFields, id, items }
    : { ...promotedFields, id }
}

/** 规范化业务 API 行集合；非数组按空集合处理，数组内非法行失败关闭。 */
export function normalizeRows(rows: unknown): ModuleRecord[] {
  if (!Array.isArray(rows)) {
    return []
  }
  return rows.map((row, index) => {
    if (!isRecord(row)) {
      throw new EntityIdContractError(`rows[${index}]`)
    }
    return normalizeRecord(row)
  })
}
