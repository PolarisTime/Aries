import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type CarrierOption = {
  id?: string
  carrierCode?: string
  value: string
  label: string
  vehiclePlates?: string[]
  defaultSettlementCompanyId?: string | number
  defaultSettlementCompanyName?: string
}

export function normalizeCarrierOptions(
  options: CarrierOption[],
): CarrierOption[] {
  return options.map((option) => ({
    ...option,
    id: option.id == null ? undefined : String(option.id),
    carrierCode:
      option.carrierCode == null
        ? undefined
        : String(option.carrierCode).trim(),
    label: String(option.label || ''),
    value: String(option.value || ''),
    vehiclePlates: Array.isArray(option.vehiclePlates)
      ? option.vehiclePlates.flatMap((plate) => {
          const v = String(plate || '').trim()
          return v ? [v] : []
        })
      : [],
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

export function findCarrierOption(
  carrierName: unknown,
): CarrierOption | undefined {
  const normalizedCarrierName = asString(carrierName).trim()
  if (!normalizedCarrierName) return undefined
  return cached
    .get()
    .find((option) => String(option.value).trim() === normalizedCarrierName)
}

export function getCarrierVehiclePlateOptions(form?: ModuleRecordInput) {
  const carrier = findCarrierOption(form?.carrierName)
  return (carrier?.vehiclePlates || []).map((plate) => ({
    label: plate,
    value: plate,
  }))
}
