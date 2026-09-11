import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
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

const rawWarehouseOptionSchema = z.object({
  id: z.string(),
  value: z.string(),
  label: z.string(),
  warehouseCode: z.string(),
  warehouseName: z.string(),
})

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

export async function fetchWarehouseOptions(): Promise<WarehouseOption[]> {
  const data = await apiGet(
    ENDPOINTS.WAREHOUSES_OPTIONS,
    z.array(rawWarehouseOptionSchema),
  )
  return normalizeWarehouseOptions(data)
}
