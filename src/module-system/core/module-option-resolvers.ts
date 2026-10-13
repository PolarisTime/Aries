import type { MaterialCategoryOption } from '@/api/master/material-categories'
import type { MaterialGradeOption } from '@/api/master/material-grades'
import type { ProjectOption } from '@/api/master/project-options'
import { createOptionList } from '@/constants/module-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { tagMasterOptionRequirements } from '@/module-system/core/master-option-requirement-tag'
import {
  getCarrierOptions as rawCarrierOptions,
  getCarrierVehiclePlateOptions as rawCarrierVehiclePlateOptions,
} from '@/queries/master/carrier-options'
import { getCustomerOptions as rawCustomerOptions } from '@/queries/master/customer-options'
import { getSupplierOptions as rawSupplierOptions } from '@/queries/master/supplier-options'
import { getWarehouseOptions as rawWarehouseOptions } from '@/queries/master/warehouse-options'
import { getCachedQueryData } from '@/queries/query-cached-options'
import { getSettlementCompanyOptions as rawSettlementCompanyOptions } from '@/queries/system/company-settings'
import type { EntityId } from '@/types/entity-id'
import { parseOptionalEntityId } from '@/types/entity-id'
import type { ModuleRecordInput } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

// 每个解析器都带上「需要哪些主数据」的打包安全标记，避免只靠函数引用相等判定（见标记模块注释）。
export const getCarrierOptions = tagMasterOptionRequirements(
  rawCarrierOptions,
  ['carriers'],
)
export const getCarrierVehiclePlateOptions = tagMasterOptionRequirements(
  rawCarrierVehiclePlateOptions,
  ['carriers'],
)
export const getCustomerOptions = tagMasterOptionRequirements(
  rawCustomerOptions,
  ['customers'],
)
export const getSupplierOptions = tagMasterOptionRequirements(
  rawSupplierOptions,
  ['suppliers'],
)
export const getWarehouseOptions = tagMasterOptionRequirements(
  rawWarehouseOptions,
  ['warehouses'],
)
export const getSettlementCompanyOptions = tagMasterOptionRequirements(
  rawSettlementCompanyOptions,
  ['settlementCompanies'],
)

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
  return getCachedQueryData<T>(queryKey)
}

function optionalId(value: unknown, field: string): EntityId | undefined {
  try {
    return parseOptionalEntityId(value, field)
  } catch {
    return undefined
  }
}

function rawMaterialCategoryOptions(): MaterialCategoryOption[] {
  const options = cachedOptions<MaterialCategoryOption>(
    QUERY_KEYS.masterOptions.materialCategories,
  )
  return options.length ? options : materialCategoryFallbackOptions
}

export const materialCategoryOptions = tagMasterOptionRequirements(
  rawMaterialCategoryOptions,
  ['materialCategories'],
)

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

function rawMaterialGradeOptions(): MaterialGradeOption[] {
  const options = cachedOptions<MaterialGradeOption>(
    QUERY_KEYS.masterOptions.materialGrades,
  )
  return options.length ? options : materialGradeFallbackOptions
}

export const materialGradeOptions = tagMasterOptionRequirements(
  rawMaterialGradeOptions,
  ['materialGrades'],
)

function rawCustomerProjectOptions(
  form?: ModuleRecordInput,
  loadedOptions?: readonly ProjectOption[],
): ProjectOption[] {
  const customerIdentity =
    form?.customerId ??
    (asString(form?.counterpartyType).trim() === '客户'
      ? form?.counterpartyId
      : undefined)
  const customerId = optionalId(customerIdentity, 'customerId')
  if (!customerId) {
    return []
  }

  const options =
    loadedOptions ??
    cachedOptions<ProjectOption>(QUERY_KEYS.masterOptions.project(customerId))
  return options.filter((option) => option.customerId === customerId)
}

export const getCustomerProjectOptions = tagMasterOptionRequirements(
  rawCustomerProjectOptions,
  ['customers', 'projects'],
)

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

/** 财务单据资金账户字段的标识解析器；具体选项由编辑器按结算主体注入。 */
export function getSettlementAccountOptions() {
  return []
}
