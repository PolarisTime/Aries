// NOTE: These are fallback/default values for dropdown selects.
// Supplier and carrier options intentionally have no fallback: business modules
// must use master-data APIs so stale hardcoded names cannot be saved.
//
// This file was extracted from constants/module-options.ts to decouple
// constants (pure data) from API dependencies and mutable runtime state.

import {
  getCarrierOptions as apiGetCarrierOptions,
  getCarrierVehiclePlateOptions as apiGetCarrierVehiclePlateOptions,
} from '@/api/carrier-options'
import {
  getCustomerOptions as apiGetCustomerOptions,
  getCustomerProjectOptions as apiGetCustomerProjectOptions,
} from '@/api/customer-options'
import type { MaterialCategoryOption } from '@/api/material-categories'

import { fetchMaterialCategories } from '@/api/material-categories'
import { fetchMaterialGrades } from '@/api/material-grades'
import { getSupplierOptions as apiGetSupplierOptions } from '@/api/supplier-options'
import { getWarehouseOptions as apiGetWarehouseOptions } from '@/api/warehouse-options'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

// ── Material Category ──────────────────────────────────────────────────────────

const materialCategoryValues = ['螺纹钢', '盘螺', '线材'] as const
const materialCategoryFallbackOptions: MaterialCategoryOption[] =
  materialCategoryValues.map((value) => ({
    label: value,
    value,
    purchaseWeighRequired: value === '盘螺' || value === '线材',
    purchaseWeighOverTolerancePercent: 5,
    purchaseWeighUnderTolerancePercent: 5,
  }))

let _categoryOptions: MaterialCategoryOption[] = materialCategoryFallbackOptions
let categoryOptionsLoading = false

function ensureMaterialCategoriesLoaded() {
  if (categoryOptionsLoading) {
    return
  }
  categoryOptionsLoading = true
  void fetchMaterialCategories().then((data) => {
    if (data.length > 0) {
      _categoryOptions = data
    }
  })
}

export function materialCategoryOptions() {
  ensureMaterialCategoriesLoaded()
  return _categoryOptions
}

export function getMaterialCategoryOptions() {
  ensureMaterialCategoriesLoaded()
  return _categoryOptions
}

export function replaceMaterialCategoryOptions(
  options: MaterialCategoryOption[],
) {
  _categoryOptions =
    options.length > 0 ? options : materialCategoryFallbackOptions
  categoryOptionsLoading = false
}

export function isPurchaseWeighRequiredCategory(category: unknown) {
  ensureMaterialCategoriesLoaded()
  const normalized = asString(category).trim()
  if (!normalized) {
    return false
  }
  return _categoryOptions.some(
    (option) =>
      String(option.value || '').trim() === normalized &&
      Boolean(option.purchaseWeighRequired),
  )
}

// ── Material Grade ─────────────────────────────────────────────────────────────

const materialGradeFallbackOptions = createOptionList([
  'HRB400',
  'HRB500',
] as const)

let _gradeOptions = materialGradeFallbackOptions
let gradeOptionsLoading = false

function ensureMaterialGradesLoaded() {
  if (gradeOptionsLoading) {
    return
  }
  gradeOptionsLoading = true
  void fetchMaterialGrades().then((data) => {
    if (data.length > 0) {
      _gradeOptions = data
    }
  })
}

export function materialGradeOptions() {
  ensureMaterialGradesLoaded()
  return _gradeOptions
}

export function replaceMaterialGradeOptions(
  options: ReturnType<typeof createOptionList>,
) {
  _gradeOptions = options.length > 0 ? options : materialGradeFallbackOptions
  gradeOptionsLoading = false
}

// ── Supplier ───────────────────────────────────────────────────────────────────

const supplierFallbackOptions: ReturnType<typeof createOptionList> = []

const _supplierOptions = supplierFallbackOptions

function supplierOptions() {
  const dynamic = apiGetSupplierOptions()
  return dynamic.length > 0 ? dynamic : _supplierOptions
}

export function getSupplierOptions() {
  return supplierOptions()
}

// ── Customer ───────────────────────────────────────────────────────────────────

const customerFallbackOptions: ReturnType<typeof createOptionList> = []

const _customerOptions = customerFallbackOptions

export function customerOptions() {
  const dynamic = apiGetCustomerOptions()
  return dynamic.length > 0 ? dynamic : _customerOptions
}

export function getCustomerOptions() {
  return customerOptions()
}

export function getCustomerProjectOptions(form?: ModuleRecordInput) {
  return apiGetCustomerProjectOptions(form)
}

// ── Carrier ────────────────────────────────────────────────────────────────────

const carrierFallbackOptions: ReturnType<typeof createOptionList> = []

const _carrierOptions = carrierFallbackOptions

export function getCarrierOptions() {
  const dynamic = apiGetCarrierOptions()
  return dynamic.length > 0 ? dynamic : _carrierOptions
}

export function getCarrierVehiclePlateOptions(form?: ModuleRecordInput) {
  return apiGetCarrierVehiclePlateOptions(form)
}

// ── Warehouse ──────────────────────────────────────────────────────────────────

const warehouseFallbackOptions = createOptionList(['一号库', '二号库'] as const)

const _warehouseOptions = warehouseFallbackOptions

export function getWarehouseOptions() {
  const dynamic = apiGetWarehouseOptions()
  return dynamic.length > 0 ? dynamic : _warehouseOptions
}
