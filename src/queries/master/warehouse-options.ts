import {
  fetchWarehouseOptions,
  type WarehouseOption,
} from '@/api/master/warehouse-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { createQueryCachedOptions } from '@/queries/query-cached-options'

const warehouseOptions = createQueryCachedOptions<WarehouseOption>({
  queryKey: QUERY_KEYS.masterOptions.warehouse,
  fetch: fetchWarehouseOptions,
})

export const getWarehouseOptions = warehouseOptions.get
export const reloadWarehouseOptions = warehouseOptions.reload
