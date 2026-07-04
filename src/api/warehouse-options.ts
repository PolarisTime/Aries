import { ENDPOINTS } from '@/constants/endpoints'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/lib/query-cached-options'

type WarehouseOption = {
  value: string
  label: string
}

const cached = createQueryCachedOptions<WarehouseOption>({
  endpoint: ENDPOINTS.WAREHOUSES_OPTIONS,
  queryKey: QUERY_KEYS.masterOptions.warehouse,
})

export const fetchWarehouseOptions = cached.fetch
export const getWarehouseOptions = cached.get
export const reloadWarehouseOptions = cached.reload
