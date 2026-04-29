// NOTE: These are fallback/default values for dropdown selects.
// In production, warehouse/customer/supplier options should come from dedicated
// API endpoints (e.g., GET /warehouses/search, GET /customers/search) to stay
// in sync with the master data tables. Hardcoded lists here will drift.
function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

const materialCategoryValues = ['螺纹钢', '盘螺', '线材'] as const
const materialCategoryFallbackOptions = createOptionList(materialCategoryValues)

let _categoryOptions = materialCategoryFallbackOptions

export function materialCategoryOptions() {
  return _categoryOptions
}

export function getMaterialCategoryOptions() {
  return _categoryOptions
}

export { materialCategoryFallbackOptions }

import { fetchMaterialCategories } from '@/api/material-categories'

fetchMaterialCategories().then((data) => {
  if (data.length > 0) {
    _categoryOptions = data
  }
})

const materialGradeFallbackOptions = createOptionList(['HRB400', 'HRB500'] as const)

let _gradeOptions = materialGradeFallbackOptions

export function materialGradeOptions() {
  return _gradeOptions
}

export { materialGradeFallbackOptions }

import { fetchMaterialGrades } from '@/api/material-grades'

fetchMaterialGrades().then((data) => {
  if (data.length > 0) {
    _gradeOptions = data
  }
})

const supplierFallbackOptions = createOptionList(['江苏沙钢', '中天钢铁', '永锋钢铁'] as const)

let _supplierOptions = supplierFallbackOptions

export function supplierOptions() {
  return _supplierOptions
}

export { supplierFallbackOptions }

import { fetchSupplierOptions } from '@/api/supplier-options'

fetchSupplierOptions().then((data) => {
  if (data.length > 0) {
    _supplierOptions = data
  }
})

const customerFallbackOptions = createOptionList(['中建八局', '上海城建', '中铁建工'] as const)

let _customerOptions = customerFallbackOptions

export function customerOptions() {
  return _customerOptions
}

import { fetchCustomerOptions } from '@/api/customer-options'

fetchCustomerOptions().then((data) => {
  if (data.length > 0) {
    _customerOptions = data
  }
})

const carrierFallbackOptions = createOptionList(['中外运华东', '申通大件', '德邦钢材专线'] as const)

let _carrierOptions = carrierFallbackOptions

export function carrierOptions() {
  return _carrierOptions
}

import { fetchCarrierOptions } from '@/api/carrier-options'

fetchCarrierOptions().then((data) => {
  if (data.length > 0) {
    _carrierOptions = data
  }
})

const warehouseFallbackOptions = createOptionList(['一号库', '二号库'] as const)

let _warehouseOptions = warehouseFallbackOptions

export function warehouseOptions() {
  return _warehouseOptions
}

import { fetchWarehouseOptions } from '@/api/warehouse-options'

fetchWarehouseOptions().then((data) => {
  if (data.length > 0) {
    _warehouseOptions = data
  }
})

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
