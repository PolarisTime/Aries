import { z } from 'zod'
import { apiGet } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import { asString } from '@/utils/type-narrowing'

export type CarrierOption = {
  id?: EntityId
  carrierCode?: string
  carrierName?: string
  value: string
  label: string
  vehiclePlates?: string[]
  defaultSettlementCompanyId?: EntityId
  defaultSettlementCompanyName?: string
}

type RawCarrierOption = {
  id?: unknown
  carrierCode?: unknown
  carrierName?: unknown
  value?: unknown
  label?: unknown
  vehiclePlates?: unknown
  defaultSettlementCompanyId?: unknown
  defaultSettlementCompanyName?: unknown
}

const rawCarrierOptionSchema = z.object({
  id: z.string(),
  carrierCode: z.string(),
  carrierName: z.string(),
  value: z.string(),
  label: z.string(),
  vehiclePlates: z.array(z.string()),
  defaultSettlementCompanyId: z.string().nullable().optional(),
  defaultSettlementCompanyName: z.string().nullable().optional(),
})

export function normalizeCarrierOptions(
  options: RawCarrierOption[],
): CarrierOption[] {
  return options.map((option, index) => {
    const carrierName = String(option.carrierName || option.value || '').trim()
    return {
      ...option,
      id: parseOptionalEntityId(option.id, `carriers[${index}].id`),
      carrierCode:
        option.carrierCode == null
          ? undefined
          : String(option.carrierCode).trim(),
      carrierName,
      label: carrierName || String(option.label || '').trim(),
      value: String(option.value || ''),
      vehiclePlates: Array.isArray(option.vehiclePlates)
        ? option.vehiclePlates.flatMap((plate: unknown) => {
            const v = String(plate || '').trim()
            return v ? [v] : []
          })
        : [],
      defaultSettlementCompanyId: parseOptionalEntityId(
        option.defaultSettlementCompanyId,
        `carriers[${index}].defaultSettlementCompanyId`,
      ),
      defaultSettlementCompanyName:
        asString(option.defaultSettlementCompanyName).trim() || undefined,
    }
  })
}

export async function fetchCarrierOptions(): Promise<CarrierOption[]> {
  const data = await apiGet(
    ENDPOINTS.CARRIERS_OPTIONS,
    z.array(rawCarrierOptionSchema),
  )
  return normalizeCarrierOptions(data)
}
