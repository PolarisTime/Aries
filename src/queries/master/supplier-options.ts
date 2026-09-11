import {
  fetchSupplierOptions,
  type SupplierOption,
} from '@/api/master/supplier-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'

const supplierOptions = createQueryCachedOptions<SupplierOption>({
  queryKey: QUERY_KEYS.masterOptions.supplier,
  fetch: fetchSupplierOptions,
})

export const getSupplierOptions = supplierOptions.get
export const reloadSupplierOptions = supplierOptions.reload

export function getSupplierEntityOptions(): SupplierOption[] {
  return supplierOptions.get()
}

export function findSupplierOption(value: unknown): SupplierOption | undefined {
  let id: EntityId | undefined
  try {
    id = parseOptionalEntityId(value, 'supplierId')
  } catch {
    return undefined
  }
  return id
    ? supplierOptions.get().find((option) => option.id === id)
    : undefined
}
