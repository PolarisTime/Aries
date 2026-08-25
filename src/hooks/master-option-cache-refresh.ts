import { reloadCarrierOptions } from '@/api/master/carrier-options'
import { reloadCustomerOptions } from '@/api/master/customer-options'
import { reloadMaterialCategories } from '@/api/master/material-categories'
import { fetchMaterialSearch } from '@/api/master/materials'
import { reloadSupplierOptions } from '@/api/master/supplier-options'
import { reloadWarehouseOptions } from '@/api/master/warehouse-options'
import { reloadSettlementCompanyOptions } from '@/api/system/company-settings'
import { QUERY_KEYS } from '@/constants/query-keys'

const MASTER_OPTION_QUERY_BY_MODULE: Record<string, readonly unknown[]> = {
  carrier: QUERY_KEYS.masterOptions.carrier,
  customer: QUERY_KEYS.masterOptions.customer,
  material: QUERY_KEYS.masterOptions.material,
  'material-categories': QUERY_KEYS.masterOptions.materialCategories,
  project: ['master-options', 'project'],
  'settlement-company': QUERY_KEYS.masterOptions.settlementCompany,
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
    case 'settlement-company':
      return reloadSettlementCompanyOptions()
    case 'supplier':
      return reloadSupplierOptions()
    case 'warehouse':
      return reloadWarehouseOptions()
  }
}
