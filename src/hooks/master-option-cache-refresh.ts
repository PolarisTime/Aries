import { reloadCarrierOptions } from '@/api/carrier-options'
import { reloadCustomerOptions } from '@/api/customer-options'
import { reloadMaterialCategories } from '@/api/material-categories'
import { fetchMaterialSearch } from '@/api/materials'
import { reloadSupplierOptions } from '@/api/supplier-options'
import { reloadWarehouseOptions } from '@/api/warehouse-options'
import { QUERY_KEYS } from '@/constants/query-keys'

const MASTER_OPTION_QUERY_BY_MODULE: Record<string, readonly unknown[]> = {
  carrier: QUERY_KEYS.masterOptions.carrier,
  customer: QUERY_KEYS.masterOptions.customer,
  material: QUERY_KEYS.masterOptions.material,
  'material-categories': QUERY_KEYS.masterOptions.materialCategories,
  supplier: QUERY_KEYS.masterOptions.supplier,
  warehouse: QUERY_KEYS.masterOptions.warehouse,
}

export function getMasterOptionQueryKey(moduleKey: string) {
  return MASTER_OPTION_QUERY_BY_MODULE[moduleKey]
}

export async function reloadMasterOptionsForModule(moduleKey: string) {
  switch (moduleKey) {
    case 'carrier':
      return reloadCarrierOptions()
    case 'customer':
      return reloadCustomerOptions()
    case 'material':
      return fetchMaterialSearch('', 500)
    case 'material-categories':
      return reloadMaterialCategories()
    case 'supplier':
      return reloadSupplierOptions()
    case 'warehouse':
      return reloadWarehouseOptions()
  }
}
