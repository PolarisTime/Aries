import {
  getCarrierOptions as apiGetCarrierOptions,
  getCarrierVehiclePlateOptions as apiGetCarrierVehiclePlateOptions,
} from '@/api/carrier-options'
import { getSettlementCompanyOptions as apiGetSettlementCompanyOptions } from '@/api/company-settings'
import { getCustomerOptions as apiGetCustomerOptions } from '@/api/customer-options'
import type { MaterialCategoryOption } from '@/api/material-categories'
import type { MaterialGradeOption } from '@/api/material-grades'
import type { ProjectOption } from '@/api/project-options'
import { getSupplierOptions as apiGetSupplierOptions } from '@/api/supplier-options'
import { getWarehouseOptions as apiGetWarehouseOptions } from '@/api/warehouse-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { queryClient } from '@/lib/query-client'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

const materialCategoryFallbackOptions: MaterialCategoryOption[] = [
  '螺纹钢',
  '盘螺',
  '线材',
].map((value) => ({
  label: value,
  value,
  purchaseWeighRequired: value === '盘螺' || value === '线材',
}))

const materialGradeFallbackOptions: MaterialGradeOption[] = createOptionList([
  'HRB400',
  'HRB500',
])

function cachedOptions<T>(queryKey: readonly unknown[]): T[] {
  return queryClient.getQueryData<T[]>(queryKey) || []
}

function optionalId(value: unknown, field: string): EntityId | undefined {
  try {
    return parseOptionalEntityId(value, field)
  } catch {
    return undefined
  }
}

export function materialCategoryOptions(): MaterialCategoryOption[] {
  const options = cachedOptions<MaterialCategoryOption>(
    QUERY_KEYS.masterOptions.materialCategories,
  )
  return options.length ? options : materialCategoryFallbackOptions
}

export const getMaterialCategoryOptions = materialCategoryOptions

export function isPurchaseWeighRequiredCategory(category: unknown): boolean {
  const normalized = asString(category).trim()
  if (!normalized) {
    return false
  }
  return materialCategoryOptions().some(
    (option) =>
      String(option.value || '').trim() === normalized &&
      Boolean(option.purchaseWeighRequired),
  )
}

export function materialGradeOptions(): MaterialGradeOption[] {
  const options = cachedOptions<MaterialGradeOption>(
    QUERY_KEYS.masterOptions.materialGrades,
  )
  return options.length ? options : materialGradeFallbackOptions
}

export function getSupplierOptions() {
  return apiGetSupplierOptions()
}

export function getCustomerOptions() {
  return apiGetCustomerOptions()
}

export function getCustomerProjectOptions(
  form?: ModuleRecordInput,
): ProjectOption[] {
  const customerIdentity =
    form?.customerId ??
    (asString(form?.counterpartyType).trim() === '客户'
      ? form?.counterpartyId
      : undefined)
  const customerId = optionalId(customerIdentity, 'customerId')
  return customerId
    ? cachedOptions<ProjectOption>(QUERY_KEYS.masterOptions.project(customerId))
    : []
}

export function findProjectOption(
  projectId: unknown,
  customerId: unknown,
): ProjectOption | undefined {
  const normalizedProjectId = optionalId(projectId, 'projectId')
  const normalizedCustomerId = optionalId(customerId, 'customerId')
  if (!normalizedProjectId || !normalizedCustomerId) {
    return undefined
  }
  return getCustomerProjectOptions({ customerId: normalizedCustomerId }).find(
    (row) =>
      row.id === normalizedProjectId && row.customerId === normalizedCustomerId,
  )
}

export function getCarrierOptions() {
  return apiGetCarrierOptions()
}

export function getCarrierVehiclePlateOptions(form?: ModuleRecordInput) {
  return apiGetCarrierVehiclePlateOptions(form)
}

export function getSettlementCompanyOptions() {
  return apiGetSettlementCompanyOptions()
}

export function getWarehouseOptions() {
  return apiGetWarehouseOptions()
}
