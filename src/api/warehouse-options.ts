import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import type { EntityId } from '@/types/entity-id'
import { EntityIdContractError, parseEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type WarehouseOption = {
  id: EntityId
  value: EntityId
  label: string
  warehouseCode: string
  warehouseName: string
}

type RawWarehouseOption = {
  id?: unknown
  value?: unknown
  label?: unknown
  warehouseCode?: unknown
  warehouseName?: unknown
}

export function normalizeWarehouseOptions(
  options: RawWarehouseOption[],
): WarehouseOption[] {
  return options.map((option, index) => {
    const id = parseEntityId(
      option.id ?? option.value,
      `warehouses[${index}].id`,
    )
    if (option.id != null && option.value != null) {
      const value = parseEntityId(option.value, `warehouses[${index}].value`)
      if (value !== id) {
        throw new EntityIdContractError(`warehouses[${index}].value`)
      }
    }

    const warehouseName = asString(option.warehouseName).trim()
    return {
      id,
      value: id,
      label: warehouseName || asString(option.label).trim() || `#${id}`,
      warehouseCode: asString(option.warehouseCode).trim(),
      warehouseName,
    }
  })
}

const cached = createQueryCachedOptions<WarehouseOption, RawWarehouseOption>({
  endpoint: ENDPOINTS.WAREHOUSES_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.warehouse,
  normalizer: normalizeWarehouseOptions,
})

export const fetchWarehouseOptions = cached.fetch
export const getWarehouseOptions = cached.get
export const reloadWarehouseOptions = cached.reload
