import { ENDPOINTS } from '@/constants/endpoints'
import { createCachedOptions } from '@/lib/create-cached-options'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

export type CarrierOption = {
  id?: string
  value: string
  label: string
  vehiclePlates?: string[]
}

function normalizeCarrierOptions(options: CarrierOption[]): CarrierOption[] {
  return options.map((option) => ({
    ...option,
    id: option.id == null ? undefined : String(option.id),
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

const cached = createCachedOptions<CarrierOption>({
  endpoint: ENDPOINTS.CARRIERS_OPTIONS,
  normalizer: normalizeCarrierOptions,
})

export const fetchCarrierOptions = cached.fetch
export const reloadCarrierOptions = cached.reload

export function getCarrierOptions(): CarrierOption[] {
  return cached.get()
}

function findCarrierOption(
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
