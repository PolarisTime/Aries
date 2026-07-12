import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId, parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type SupplierOption = {
  id: EntityId
  supplierCode: string
  supplierName: string
  value: EntityId
  label: string
}

type RawSupplierOption = {
  id?: unknown
  supplierCode?: unknown
  supplierName?: unknown
  value?: unknown
  label?: unknown
}

function buildSupplierLabel(
  id: EntityId,
  supplierCode: string,
  supplierName: string,
): string {
  if (supplierCode && supplierName) {
    return `${supplierCode} / ${supplierName}`
  }
  return supplierName ? `${supplierName} / #${id}` : `#${id}`
}

export function normalizeSupplierOptions(
  options: RawSupplierOption[],
): SupplierOption[] {
  return options.map((option, index) => {
    const id = parseEntityId(option.id, `suppliers[${index}].id`)
    const supplierCode = asString(option.supplierCode).trim()
    const rawValue = asString(option.value).trim()
    const sourceLabel = asString(option.label).trim()
    const supplierName =
      asString(option.supplierName).trim() ||
      (rawValue && rawValue !== id ? rawValue : '') ||
      sourceLabel

    return {
      id,
      supplierCode,
      supplierName,
      value: id,
      label: buildSupplierLabel(id, supplierCode, supplierName),
    }
  })
}

export function findSupplierOption(value: unknown): SupplierOption | undefined {
  let id: EntityId | undefined
  try {
    id = parseOptionalEntityId(value, 'supplierId')
  } catch {
    return undefined
  }
  return id ? cached.get().find((option) => option.id === id) : undefined
}

export function getSupplierEntityOptions(): SupplierOption[] {
  return cached.get()
}

export function getSupplierNameFilterOptions() {
  return [
    ...new Set(cached.get().map((option) => option.supplierName)),
  ].flatMap((supplierName) =>
    supplierName ? [{ value: supplierName, label: supplierName }] : [],
  )
}

/** @deprecated 供应商身份选择统一使用雪花 ID。 */
export function getSupplierIdentityOptions(): SupplierOption[] {
  return getSupplierEntityOptions()
}

const cached = createQueryCachedOptions<SupplierOption, RawSupplierOption>({
  endpoint: ENDPOINTS.SUPPLIERS_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.supplier,
  normalizer: normalizeSupplierOptions,
})

export const fetchSupplierOptions = cached.fetch
export const getSupplierOptions = cached.get
export const reloadSupplierOptions = cached.reload
