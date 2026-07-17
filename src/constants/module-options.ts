// NOTE: These are fallback/default values for dropdown selects.
// Supplier and carrier options intentionally have no fallback: business modules
// must use master-data APIs so stale hardcoded names cannot be saved.
//
// This file contains PURE data only — no API imports, no mutable runtime state.
// API-backed option resolvers have been moved to src/api/option-resolvers.ts
// and are re-exported below for backward compatibility.

function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

export const enabledStatusValues = ['正常', '禁用'] as const
export const enabledStatusOptions = createOptionList(enabledStatusValues)

const statementStatusValues = ['待确认', '已确认'] as const
export const statementStatusOptions = createOptionList(statementStatusValues)

export const roleTypeValues = [
  '平台角色',
  '系统角色',
  '业务角色',
  '财务角色',
] as const

export function buildValueOptions(...values: string[]) {
  return createOptionList(values)
}

// Re-export API-backed option resolvers for backward compatibility.
// All existing imports from '@/constants/module-options' continue to work.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- intentional barrel for backward compat
export {
  customerOptions,
  getCarrierOptions,
  getCarrierVehiclePlateOptions,
  getCustomerOptions,
  getCustomerProjectOptions,
  getMaterialCategoryOptions,
  getSettlementCompanyOptions,
  getSupplierOptions,
  getWarehouseOptions,
  isPurchaseWeighRequiredCategory,
  materialCategoryOptions,
  materialGradeOptions,
} from '@/api/option-resolvers'
