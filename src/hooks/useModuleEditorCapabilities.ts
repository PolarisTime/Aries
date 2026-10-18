import {
  resolveBulkActionAvailability,
  resolveEditorAuditPlan,
  resolveLineItemsLocked,
  resolveListAuditPlan,
} from '@/hooks/module-editor-capabilities-utils'
import {
  canManageEditorLineItems,
  canReorderEditorLineItems,
} from '@/module-system/adapter/module-adapter-editor'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import type {
  ModuleFilterDefinition,
  ModuleFormFieldDefinition,
  ModuleRecord,
} from '@/types/module-page'

interface Props {
  moduleKey: string
  formFields: ModuleFormFieldDefinition[]
  listStatusFields?: Array<ModuleFormFieldDefinition | ModuleFilterDefinition>
  lineItemLockRelatedRows: ModuleRecord[]
  lineItemsLockedOverride?: boolean
  currentStatus?: string
  canEditLineItems: boolean
  canSaveCurrentEditor: boolean
  canAuditRecords: boolean
  canPrintRecords: boolean
  canDeleteRecords: boolean
  isReadOnly: boolean
  resolveModuleStatusOptions: (
    statusField: ModuleFormFieldDefinition | undefined,
  ) => string[]
}

export function useModuleEditorCapabilities({
  moduleKey,
  formFields,
  listStatusFields,
  lineItemLockRelatedRows,
  lineItemsLockedOverride,
  currentStatus,
  canEditLineItems,
  canSaveCurrentEditor,
  canAuditRecords,
  canPrintRecords,
  canDeleteRecords,
  isReadOnly,
  resolveModuleStatusOptions,
}: Props) {
  // 四块派生计算分别由 module-editor-capabilities-utils.ts 的纯函数承担:
  // 这里只做「调用 + 汇总」, 不再让锁行判定/审核目标/批量可用性共享同一个分支体。
  const lineItemsLocked = resolveLineItemsLocked({
    moduleKey,
    lineItemsLockedOverride,
    currentStatus,
    lineItemLockRelatedRows,
  })

  const { editorAuditTarget, editorAuditActionKind } = resolveEditorAuditPlan({
    moduleKey,
    formFields,
    currentStatus,
    resolveModuleStatusOptions,
  })

  const {
    listStatusOptions,
    listAuditTarget,
    listReverseAuditTarget,
    listAuditSourceStatuses,
    listAuditActionKind,
    listReverseAuditActionKind,
  } = resolveListAuditPlan({ moduleKey, formFields, listStatusFields })

  const {
    canUseBulkAuditAction,
    canUseBulkReverseAuditAction,
    canUseBulkPrintActions,
    canUseBulkDeleteActions,
  } = resolveBulkActionAvailability({
    isReadOnly,
    canAuditRecords,
    canPrintRecords,
    canDeleteRecords,
    listAuditTarget,
    listReverseAuditTarget,
  })

  const canAuditEditor = Boolean(editorAuditTarget)
  const canSaveAndAuditCurrentEditor =
    canSaveCurrentEditor && canAuditRecords && canAuditEditor

  const canManageEditorItems = canManageEditorLineItems(
    moduleKey,
    canEditLineItems,
    canSaveCurrentEditor,
    lineItemsLocked,
  )
  /*
   * 行序可调**独立于**行内字段可编辑: 交付核定这类锁定态锁的是字段值(单价等),
   * 而拖动只重排数组下标、不改字段, 服务端按 line_no = 下标 + 1 重编。
   * 详见 canReorderEditorLineItems 的注释。
   */
  const canReorderEditorItems = canReorderEditorLineItems(
    moduleKey,
    canEditLineItems,
    canSaveCurrentEditor,
  )
  const canAddManualEditorItems =
    canManageEditorItems &&
    getBehaviorValue(moduleKey, 'allowsManualLineItems') !== false
  const lockedLineItemsNotice = lineItemsLocked
    ? String(getBehaviorValue(moduleKey, 'lockedLineItemsNotice') || '')
    : ''

  return {
    canAddManualEditorItems,
    canAuditEditor,
    canManageEditorItems,
    canReorderEditorItems,
    canSaveAndAuditCurrentEditor,
    canUseBulkAuditAction,
    canUseBulkReverseAuditAction,
    canUseBulkDeleteActions,
    canUseBulkPrintActions,
    editorAuditActionKind,
    editorAuditTarget,
    lineItemsLocked,
    listAuditActionKind,
    listAuditTarget,
    listReverseAuditActionKind,
    listReverseAuditTarget,
    listAuditSourceStatuses,
    listStatusOptions,
    lockedLineItemsNotice,
  }
}
