import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecordInput } from '@/types/module-page'
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

export function normalizeCarrierOptions(
  options: CarrierOption[],
): CarrierOption[] {
  return options.map((option, index) => ({
    ...option,
    id: parseOptionalEntityId(option.id, `carriers[${index}].id`),
    carrierCode:
      option.carrierCode == null
        ? undefined
        : String(option.carrierCode).trim(),
    carrierName: String(option.carrierName || option.value || '').trim(),
    label: String(option.label || ''),
    value: String(option.value || ''),
    vehiclePlates: Array.isArray(option.vehiclePlates)
      ? option.vehiclePlates.flatMap((plate) => {
          const v = String(plate || '').trim()
          return v ? [v] : []
        })
      : [],
    defaultSettlementCompanyId: parseOptionalEntityId(
      option.defaultSettlementCompanyId,
      `carriers[${index}].defaultSettlementCompanyId`,
    ),
  }))
}

const cached = createQueryCachedOptions<CarrierOption>({
  endpoint: ENDPOINTS.CARRIERS_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.carrier,
  normalizer: normalizeCarrierOptions,
})

export const fetchCarrierOptions = cached.fetch
export const reloadCarrierOptions = cached.reload

export function getCarrierOptions(): CarrierOption[] {
  return cached.get()
}

export function getCarrierEntityOptions(): CarrierOption[] {
  return cached.get().flatMap((option) => {
    const id = option.id
    const carrierCode = String(option.carrierCode ?? '').trim()
    const carrierName = String(option.carrierName ?? option.value).trim()
    if (!id || !carrierName) return []
    return [
      {
        ...option,
        id,
        carrierName,
        value: id,
        label: carrierCode
          ? `${carrierCode} / ${carrierName}`
          : `${carrierName} / #${id}`,
      },
    ]
  })
}

export function findCarrierOption(value: unknown): CarrierOption | undefined {
  const normalizedValue = asString(value).trim()
  if (!normalizedValue) return undefined
  return cached
    .get()
    .find(
      (option) =>
        String(option.id ?? '').trim() === normalizedValue ||
        String(option.value).trim() === normalizedValue,
    )
}

export function getCarrierVehiclePlateOptions(form?: ModuleRecordInput) {
  const carrier = findCarrierOption(form?.carrierName)
  return (carrier?.vehiclePlates || []).map((plate) => ({
    label: plate,
    value: plate,
  }))
}
