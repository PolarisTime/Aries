// NOTE: These are fallback/default values for dropdown selects.
// Supplier and carrier options intentionally have no fallback: business modules
// must use master-data APIs so stale hardcoded names cannot be saved.
import type { MaterialCategoryOption } from '@/api/material-categories'
import { getMaterialCategoryOptions as apiGetMaterialCategoryOptions } from '@/api/material-categories'
import { getMaterialGradeOptions as apiGetMaterialGradeOptions } from '@/api/material-grades'
import { getWarehouseOptions as apiGetWarehouseOptions } from '@/api/warehouse-options'

function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

const materialCategoryValues = ['螺纹钢', '盘螺', '线材'] as const
const materialCategoryFallbackOptions: MaterialCategoryOption[] = materialCategoryValues.map((value) => ({
  label: value,
  value,
  purchaseWeighRequired: value === '盘螺' || value === '线材',
}))

export function materialCategoryOptions() {
  const dynamic = apiGetMaterialCategoryOptions()
  return dynamic.length > 0 ? dynamic : materialCategoryFallbackOptions
}

export function getMaterialCategoryOptions() {
  return materialCategoryOptions()
}

export function isPurchaseWeighRequiredCategory(category: unknown) {
  const normalized = String(category || '').trim()
  if (!normalized) {
    return false
  }
  return materialCategoryOptions().some((option) =>
    String(option.value || '').trim() === normalized
    && Boolean(option.purchaseWeighRequired),
  )
}

export { materialCategoryFallbackOptions }

const materialGradeFallbackOptions = createOptionList(['HRB400', 'HRB500'] as const)

export function materialGradeOptions() {
  const dynamic = apiGetMaterialGradeOptions()
  return dynamic.length > 0 ? dynamic : materialGradeFallbackOptions
}

export { materialGradeFallbackOptions }

const supplierFallbackOptions: ReturnType<typeof createOptionList> = []

const _supplierOptions = supplierFallbackOptions

export function supplierOptions() {
  const dynamic = apiGetSupplierOptions()
  return dynamic.length > 0 ? dynamic : _supplierOptions
}

import { getSupplierOptions as apiGetSupplierOptions } from '@/api/supplier-options'

export function getSupplierOptions() {
  return supplierOptions()
}

export { supplierFallbackOptions }


const customerFallbackOptions: ReturnType<typeof createOptionList> = []

const _customerOptions = customerFallbackOptions

export function customerOptions() {
  const dynamic = apiGetCustomerOptions()
  return dynamic.length > 0 ? dynamic : _customerOptions
}

import {
  getCustomerOptions as apiGetCustomerOptions,
  getCustomerProjectOptions as apiGetCustomerProjectOptions,
} from '@/api/customer-options'

export function getCustomerOptions() {
  return customerOptions()
}

export function getCustomerProjectOptions(form?: Record<string, unknown>) {
  return apiGetCustomerProjectOptions(form)
}


const carrierFallbackOptions: ReturnType<typeof createOptionList> = []

const _carrierOptions = carrierFallbackOptions

export function carrierOptions() {
  return _carrierOptions
}

import {
  getCarrierOptions as apiGetCarrierOptions,
  getCarrierVehiclePlateOptions as apiGetCarrierVehiclePlateOptions,
} from '@/api/carrier-options'

export function getCarrierOptions() {
  const dynamic = apiGetCarrierOptions()
  return dynamic.length > 0 ? dynamic : _carrierOptions
}

export function getCarrierVehiclePlateOptions(form?: Record<string, unknown>) {
  return apiGetCarrierVehiclePlateOptions(form)
}


const warehouseFallbackOptions = createOptionList(['一号库', '二号库'] as const)

export function warehouseOptions() {
  const dynamic = apiGetWarehouseOptions()
  return dynamic.length > 0 ? dynamic : warehouseFallbackOptions
}

export function getWarehouseOptions() {
  return warehouseOptions()
}


export const enabledStatusValues = ['正常', '禁用'] as const
export const enabledStatusOptions = createOptionList(enabledStatusValues)

export const statementStatusValues = ['待确认', '已确认'] as const
export const statementStatusOptions = createOptionList(statementStatusValues)

export const userAccountDataScopeValues = ['全部数据', '全部', '本部门', '本人'] as const
export const userAccountDataScopeOptions = createOptionList(userAccountDataScopeValues)

export const flexibleUserAccountDataScopeValues = ['全部数据', '全部', '本部门', '本人'] as const
export const roleDataScopeValues = ['全部数据', '全部', '本部门', '本人'] as const
export const roleDataScopeOptions = createOptionList(roleDataScopeValues)

export const roleTypeValues = ['平台角色', '系统角色', '业务角色', '财务角色'] as const
export const roleTypeOptions = createOptionList(roleTypeValues)

export function buildValueOptions(...values: string[]) {
  return createOptionList(values)
}
