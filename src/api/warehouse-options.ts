import { ENDPOINTS } from '@/constants/endpoints'
import { createCachedOptions } from '@/lib/create-cached-options'

type WarehouseOption = {
  value: string
  label: string
}

const cached = createCachedOptions<WarehouseOption>({
  endpoint: ENDPOINTS.WAREHOUSES_OPTIONS,
})

export const fetchWarehouseOptions = cached.fetch
export const getWarehouseOptions = cached.get
export const reloadWarehouseOptions = cached.reload
