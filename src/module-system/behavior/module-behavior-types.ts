import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModuleLineItem,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'

interface NormalizeDraftContext {
  primaryNoKey?: string
  currentOperatorName: string
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}

type ModuleDefaultDraftValues = ModuleRecordInput | (() => ModuleRecordInput)

interface SyncEditorFormContext {
  changedKeys: ReadonlySet<string>
}

export interface ModuleBehaviorConfig {
  defaultStatus?: string
  auditStatus?: string
  auditSourceStatuses?: string[]
  supportsReverseAudit?: boolean
  reverseAuditTargetsByStatus?: Record<string, string>
  protectedEditStatuses?: string[]
  partiallyEditableStatuses?: string[]
  protectedDeleteStatuses?: string[]
  actionKindsByLabel?: Record<string, string>
  actionKindsByKey?: Record<string, string>
  defaultDraftValues?: ModuleDefaultDraftValues
  supportsLineItems?: boolean
  computesAmounts?: boolean
  editableLockedFields?: string[]
  editableLockedItemColumns?: string[]
  readonlyItemColumns?: string[]
  readonlyEditorFields?: string[]
  parentImportedEditableFields?: string[]
  parentImportedItemEditableColumns?: string[]
  lockParentImportOnlyWhenPersisted?: boolean
  clearLineItemsOnFieldChange?: string[]
  clearEditorFieldsOnFieldChange?: Record<string, string[]>
  resolveReadonlyEditorFields?: (record: ModuleRecord) => string[]
  defaultOperatorField?: string
  locksLineItemsWhenRecordLocked?: boolean
  lineItemLockSourceModule?: ModuleKey
  lineItemLockSourceField?: string
  lineItemLockTargetField?: string
  lineItemLockStatuses?: string[]
  lockedLineItemsNotice?: string
  allowsManualLineItems?: boolean
  readonlyLineItems?: boolean
  lineItemTrimStrategy?: 'purchaseOrderBlank'
  supportsParentImport?: boolean
  supportsMaterialImport?: boolean
  normalizeDraftRecord?: (
    record: ModuleRecordInput,
    items: ModuleLineItem[],
    ctx: NormalizeDraftContext,
  ) => void
  normalizeEditorRecord?: (record: ModuleRecordInput) => ModuleRecordInput
  syncEditorForm?: (
    editorForm: ModuleRecordInput,
    ctx: SyncEditorFormContext,
  ) => void
  savePayloadLineItems?: boolean
  extraScalarFields?: string[]
  includeAttachmentIds?: boolean
  supportsStatementLinking?: 'receipt' | 'payment'
  isSettingsModule?: boolean
  alertActionLink?: { text: string; to: string }
  detailRoutePath?: string
}
