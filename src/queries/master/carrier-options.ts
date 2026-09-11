import {
  type CarrierOption,
  fetchCarrierOptions,
} from '@/api/master/carrier-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const carrierOptions = createQueryCachedOptions<CarrierOption>({
  queryKey: QUERY_KEYS.masterOptions.carrier,
  fetch: fetchCarrierOptions,
})

export const getCarrierOptions = carrierOptions.get
export const reloadCarrierOptions = carrierOptions.reload

export function getCarrierEntityOptions(): CarrierOption[] {
  return carrierOptions.get().flatMap((option) => {
    const id = option.id
    const carrierName = String(option.carrierName ?? option.value).trim()
    if (!id || !carrierName) return []
    return [
      {
        ...option,
        id,
        carrierName,
        value: id,
        label: carrierName,
      },
    ]
  })
}

export function findCarrierOption(value: unknown): CarrierOption | undefined {
  const normalizedValue = asString(value).trim()
  if (!normalizedValue) return undefined
  return carrierOptions
    .get()
    .find(
      (option) =>
        String(option.id ?? '').trim() === normalizedValue ||
        String(option.value).trim() === normalizedValue ||
        String(option.carrierName ?? '').trim() === normalizedValue,
    )
}

export function getCarrierVehiclePlateOptions(form?: ModuleRecordInput) {
  const carrier = findCarrierOption(form?.carrierId ?? form?.carrierName)
  return (carrier?.vehiclePlates || []).map((plate) => ({
    label: plate,
    value: plate,
  }))
}
