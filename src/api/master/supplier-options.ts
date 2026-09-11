import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseEntityId } from '@/types/entity-id'
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

const rawSupplierOptionSchema = z.object({
  id: z.string(),
  supplierCode: z.string(),
  supplierName: z.string(),
  value: z.string(),
  label: z.string(),
})

function buildSupplierLabel(id: EntityId, supplierName: string): string {
  return supplierName || `#${id}`
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
      label: buildSupplierLabel(id, supplierName),
    }
  })
}

export async function fetchSupplierOptions(): Promise<SupplierOption[]> {
  const data = await apiGet(
    ENDPOINTS.SUPPLIERS_OPTIONS,
    z.array(rawSupplierOptionSchema),
  )
  return normalizeSupplierOptions(data)
}
