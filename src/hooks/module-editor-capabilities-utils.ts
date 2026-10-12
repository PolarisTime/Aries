import {
  buildEditorAuditTarget,
  buildListAuditTargets,
  resolveStatusChangeActionKind,
  resolveStatusOptions,
} from '@/module-system/adapter/module-adapter-actions'
import { isModuleLineItemsLocked } from '@/module-system/adapter/module-adapter-editor'
import type {
  ModuleFilterDefinition,
  ModuleFormFieldDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

/**
 * useModuleEditorCapabilities 的纯派生计算。
 *
 * <p>抽出原因：该 hook 同时承担「锁行判定」「编辑器审核目标」「列表审核目标」
 * 「批量动作可用性」四件事，内联后控制流复杂度越过 react-doctor 阈值
 * (no-high-complexity-react-function)。四块都没有 React 依赖, 只是把配置与
 * 当前状态映射成能力标志, 因此搬成纯函数; hook 只负责把它们的返回值汇总。</p>
 */

export interface LineItemsLockedInput {
  moduleKey: string
  lineItemsLockedOverride?: boolean
  currentStatus?: string
  lineItemLockRelatedRows: ModuleRecord[]
}

/** 显式覆盖优先于按状态推导, 保持「调用方可以硬性关闭锁行」的既有语义。 */
export function resolveLineItemsLocked({
  moduleKey,
  lineItemsLockedOverride,
  currentStatus,
  lineItemLockRelatedRows,
}: LineItemsLockedInput) {
  if (typeof lineItemsLockedOverride === 'boolean') {
    return lineItemsLockedOverride
  }
  return isModuleLineItemsLocked(moduleKey, [
    currentStatus ? asString(currentStatus) : '',
    ...lineItemLockRelatedRows.map((record) => asString(record.status)),
  ])
}

export interface EditorAuditPlanInput {
  moduleKey: string
  formFields: ModuleFormFieldDefinition[]
  currentStatus?: string
  resolveModuleStatusOptions: (
    statusField: ModuleFormFieldDefinition | undefined,
  ) => string[]
}

/** 编辑器「保存并审核」的目标与动作类型: 无可用目标时动作类型为 null。 */
export function resolveEditorAuditPlan({
  moduleKey,
  formFields,
  currentStatus,
  resolveModuleStatusOptions,
}: EditorAuditPlanInput) {
  const statusField = formFields.find((field) => field.key === 'status')
  const auditTarget = buildEditorAuditTarget(
    moduleKey,
    resolveModuleStatusOptions(statusField),
    currentStatus,
  )
  return {
    editorAuditTarget: auditTarget,
    editorAuditActionKind: auditTarget
      ? resolveStatusChangeActionKind(auditTarget.value)
      : null,
  }
}

export interface ListAuditPlanInput {
  moduleKey: string
  formFields: ModuleFormFieldDefinition[]
  listStatusFields?: Array<ModuleFormFieldDefinition | ModuleFilterDefinition>
}

/** 列表批量审核的目标、来源状态与动作类型。 */
export function resolveListAuditPlan({
  moduleKey,
  formFields,
  listStatusFields,
}: ListAuditPlanInput) {
  const effectiveListStatusFields = listStatusFields || formFields
  const listStatusField = effectiveListStatusFields.find(
    (field) => field.key === 'status',
  )
  const listStatusOptions = resolveStatusOptions({
    fields: effectiveListStatusFields,
  })
  const listPreferredStatus =
    listStatusField && 'defaultValue' in listStatusField
      ? listStatusField.defaultValue
      : undefined
  const {
    auditTarget: listAuditTarget,
    reverseAuditTarget: listReverseAuditTarget,
    auditSourceStatuses: listAuditSourceStatuses,
  } = buildListAuditTargets({
    moduleKey,
    statusOptions: listStatusOptions,
    preferredStatus: listPreferredStatus,
  })

  return {
    listStatusOptions,
    listAuditTarget,
    listReverseAuditTarget,
    listAuditSourceStatuses,
    listAuditActionKind: listAuditTarget
      ? resolveStatusChangeActionKind(listAuditTarget.value)
      : null,
    listReverseAuditActionKind: listReverseAuditTarget
      ? resolveStatusChangeActionKind(listReverseAuditTarget.value, true)
      : null,
  }
}

export interface BulkActionAvailabilityInput {
  isReadOnly: boolean
  canAuditRecords: boolean
  canPrintRecords: boolean
  canDeleteRecords: boolean
  listAuditTarget?: unknown
  listReverseAuditTarget?: unknown
}

/** 批量动作可用性: 只读时审核/删除一律不可用, 打印权限不受只读影响。 */
export function resolveBulkActionAvailability({
  isReadOnly,
  canAuditRecords,
  canPrintRecords,
  canDeleteRecords,
  listAuditTarget,
  listReverseAuditTarget,
}: BulkActionAvailabilityInput) {
  return {
    canUseBulkAuditAction:
      !isReadOnly && canAuditRecords && Boolean(listAuditTarget),
    canUseBulkReverseAuditAction:
      !isReadOnly && canAuditRecords && Boolean(listReverseAuditTarget),
    canUseBulkPrintActions: canPrintRecords,
    canUseBulkDeleteActions: !isReadOnly && canDeleteRecords,
  }
}
