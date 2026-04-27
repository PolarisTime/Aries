import { ref } from 'vue'
import { http, isSuccessCode } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'

interface OptionItem { label: string; value: string }

const warehouseOptions = ref<OptionItem[]>([])
const customerOptions = ref<OptionItem[]>([])
const supplierOptions = ref<OptionItem[]>([])

async function fetchOptions(url: string, cache: ReturnType<typeof ref<OptionItem[]>>) {
  if (cache.value?.length) return cache.value
  try {
    const response = await http.get<{ code: number; data: OptionItem[] }>(url)
    if (isSuccessCode(response.code) && Array.isArray(response.data)) {
      cache.value = response.data
    }
  } catch { /* keep fallback values */ }
  return cache.value
}

export function useMasterOptions() {
  return {
    warehouseOptions: () => fetchOptions(ENDPOINTS.WAREHOUSES_OPTIONS, warehouseOptions),
    customerOptions: () => fetchOptions(ENDPOINTS.CUSTOMERS_OPTIONS, customerOptions),
    supplierOptions: () => fetchOptions(ENDPOINTS.SUPPLIERS_OPTIONS, supplierOptions),
  }
}
