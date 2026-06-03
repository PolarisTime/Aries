import { ENDPOINTS } from '@/constants/endpoints'
import { createCachedOptions } from '@/lib/create-cached-options'

export type SupplierOption = {
  id?: string
  value: string
  label: string
}

export function normalizeSupplierOptions(
  options: SupplierOption[],
): SupplierOption[] {
  return options.map((option) => ({
    ...option,
    id: option.id == null ? undefined : String(option.id),
    label: String(option.label || ''),
    value: String(option.value || ''),
  }))
}

const cached = createCachedOptions<SupplierOption>({
  endpoint: ENDPOINTS.SUPPLIERS_OPTIONS,
  normalizer: normalizeSupplierOptions,
})

export const fetchSupplierOptions = cached.fetch
export const getSupplierOptions = cached.get
export const reloadSupplierOptions = cached.reload
