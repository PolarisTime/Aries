import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'

export type SupplierOption = {
  id?: string
  supplierCode?: string
  value: string
  label: string
}

export function normalizeSupplierOptions(
  options: SupplierOption[],
): SupplierOption[] {
  return options.map((option) => ({
    ...option,
    id: option.id == null ? undefined : String(option.id),
    supplierCode:
      option.supplierCode == null ? undefined : String(option.supplierCode),
    label: String(option.label || ''),
    value: String(option.value || ''),
  }))
}

export function findSupplierOption(value: unknown): SupplierOption | undefined {
  const normalizedValue = String(value ?? '').trim()
  if (!normalizedValue) return undefined
  return cached
    .get()
    .find(
      (option) =>
        String(option.supplierCode ?? '').trim() === normalizedValue ||
        String(option.value).trim() === normalizedValue,
    )
}

export function getSupplierIdentityOptions(): SupplierOption[] {
  return cached.get().flatMap((option) => {
    const supplierCode = String(option.supplierCode ?? '').trim()
    const supplierName = String(option.value).trim()
    if (!supplierCode || !supplierName) return []
    return [
      {
        ...option,
        supplierCode,
        value: supplierCode,
        label: `${supplierCode} / ${supplierName}`,
      },
    ]
  })
}

const cached = createQueryCachedOptions<SupplierOption>({
  endpoint: ENDPOINTS.SUPPLIERS_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.supplier,
  normalizer: normalizeSupplierOptions,
})

export const fetchSupplierOptions = cached.fetch
export const getSupplierOptions = cached.get
export const reloadSupplierOptions = cached.reload
