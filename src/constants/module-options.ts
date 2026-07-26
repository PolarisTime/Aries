// NOTE: These are fallback/default values for dropdown selects.
// Supplier and carrier options intentionally have no fallback: business modules
// must use master-data APIs so stale hardcoded names cannot be saved.
//
// This file contains PURE data only — no API imports, no mutable runtime state.
// Query-backed option resolvers are re-exported below for backward compatibility.

function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: value, value }))
}

const enabledStatusValues = ['正常', '禁用'] as const
export const enabledStatusOptions = createOptionList(enabledStatusValues)

const statementStatusValues = ['待确认', '已确认'] as const
export const statementStatusOptions = createOptionList(statementStatusValues)

const deletedDocumentStatusOption = {
  label: '已删除',
  value: '已删除',
} as const

export function withDeletedDocumentStatus<
  T extends { label: string; value: string },
>(options: readonly T[]) {
  return [...options, deletedDocumentStatusOption]
}

export function buildDocumentStatusOptions(...values: string[]) {
  return withDeletedDocumentStatus(createOptionList(values))
}

// Re-export Query-backed option resolvers for backward compatibility.
// All existing imports from '@/constants/module-options' continue to work.
export {
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
} from '@/module-system/module-option-resolvers'
