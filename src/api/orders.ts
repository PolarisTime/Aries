import { http } from './client'
import {
  mockListPurchaseOrders,
  mockSearchSuppliers,
} from '@/mock/server'
import type { TableResponse } from '@/types/api'
import type {
  PurchaseOrderRecord,
  PurchaseOrderSearch,
  SupplierOption,
} from '@/types/order'
import { isMockEnabled } from '@/utils/env'
import type { ListQueryOptions } from '@/utils/list'
import { buildListParams } from '@/utils/list'

export function listPurchaseOrders(
  search: PurchaseOrderSearch,
  options: ListQueryOptions,
) {
  if (isMockEnabled) {
    return mockListPurchaseOrders(search, options)
  }

  return http.get<
    TableResponse<PurchaseOrderRecord>,
    TableResponse<PurchaseOrderRecord>
  >('/depotHead/list', {
    params: buildListParams(search, options),
  })
}

export function searchSuppliers(keyword?: string) {
  if (isMockEnabled) {
    return mockSearchSuppliers(keyword)
  }

  return http.post<SupplierOption[], SupplierOption[]>('/supplier/findBySelect_sup', {
    key: keyword,
    limit: 20,
  })
}
