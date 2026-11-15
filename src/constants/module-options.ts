// NOTE: These are fallback/default values for dropdown selects.
// Supplier and carrier options intentionally have no fallback: business modules
// must use master-data APIs so stale hardcoded names cannot be saved.
//
// This file contains PURE data only — no API imports, no mutable runtime state.
// Query-backed option resolvers live in '@/module-system/core/module-option-resolvers'.
import {
  DOCUMENT_STATUS,
  STATUS,
  statusLabel,
} from '@/constants/status-constants'

/**
 * 值列表 → 下拉选项。
 *
 * <p>状态选项的推导规则：**value 是 code**（提交/比较用的稳定值），
 * **label 是中文**（展示，唯一出口 `statusLabel`）。因此 `label: value` 的旧写法
 * 在 code 迁移后会直接把 `DRAFT` 摆给用户，必须走这里统一映射。</p>
 */
export function createOptionList(values: readonly string[]) {
  return values.map((value) => ({ label: statusLabel(value), value }))
}

const enabledStatusValues = [STATUS.NORMAL, STATUS.DISABLED] as const
export const enabledStatusOptions = createOptionList(enabledStatusValues)

const statementStatusValues = [
  DOCUMENT_STATUS.PENDING_CONFIRM,
  DOCUMENT_STATUS.CONFIRMED,
] as const
export const statementStatusOptions = createOptionList(statementStatusValues)

const deletedDocumentStatusOption = {
  label: statusLabel(DOCUMENT_STATUS.DELETED),
  value: DOCUMENT_STATUS.DELETED,
} as const

export function withDeletedDocumentStatus<
  T extends { label: string; value: string },
>(options: readonly T[]) {
  return [...options, deletedDocumentStatusOption]
}

export function buildDocumentStatusOptions(...values: string[]) {
  return withDeletedDocumentStatus(createOptionList(values))
}
