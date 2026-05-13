import { enabledStatusOptions } from '@/constants/module-options'
import { getSupplierOptions } from '@/constants/module-options'
import { getCustomerOptions } from '@/constants/module-options'
import { getCarrierOptions } from '@/constants/module-options'
import { getWarehouseOptions } from '@/constants/module-options'
import { materialCategoryOptions } from '@/constants/module-options'
import { BILL_STATUS_LABEL, SUPPLIER_NAME_LABEL, CUSTOMER_NAME_LABEL, CARRIER_NAME_LABEL } from './filter-labels'

export const keywordFilter = (placeholder = '搜索...') => ({
  key: 'keyword' as const,
  label: '关键字',
  type: 'input' as const,
  placeholder,
})

export const masterStatusFilter = {
  key: 'status' as const,
  label: '状态',
  type: 'select' as const,
  options: enabledStatusOptions,
}

export const billStatusFilter = (options: ReturnType<typeof import('@/constants/module-options').enabledStatusOptions>) => ({
  key: 'status' as const,
  label: BILL_STATUS_LABEL,
  type: 'select' as const,
  options,
})

export const supplierFilter = {
  key: 'supplierName' as const,
  label: SUPPLIER_NAME_LABEL,
  type: 'select' as const,
  options: getSupplierOptions,
}

export const customerFilter = {
  key: 'customerName' as const,
  label: CUSTOMER_NAME_LABEL,
  type: 'select' as const,
  options: getCustomerOptions,
}

export const carrierFilter = {
  key: 'carrierName' as const,
  label: CARRIER_NAME_LABEL,
  type: 'select' as const,
  options: getCarrierOptions,
}

export const warehouseFilter = {
  key: 'warehouseName' as const,
  label: '仓库',
  type: 'select' as const,
  options: getWarehouseOptions,
}

export const categoryFilter = {
  key: 'category' as const,
  label: '类别',
  type: 'select' as const,
  options: materialCategoryOptions,
}
