import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

export interface NormalizeDraftContext {
  primaryNoKey?: string
  generatePrimaryNo: () => string
  currentOperatorName: string
  sumLineItemsBy: (items: ModuleLineItem[], key: string) => number
}

export interface ModuleBehaviorConfig {
  defaultStatus?: string
  auditStatus?: string
  lockedAuditStatus?: string
  actionKindsByLabel?: Record<string, string>
  actionKindsByKey?: Record<string, string>
  defaultDraftValues?: Record<string, unknown>
  supportsLineItems?: boolean
  computesAmounts?: boolean
  editableLockedFields?: string[]
  editableLockedItemColumns?: string[]
  readonlyEditorFields?: string[]
  defaultOperatorField?: string
  locksLineItemsWhenRecordLocked?: boolean
  lineItemLockSourceModule?: string
  lineItemLockSourceField?: string
  lineItemLockTargetField?: string
  lineItemLockStatuses?: string[]
  lockedLineItemsNotice?: string
  allowsManualLineItems?: boolean
  readonlyLineItems?: boolean
  lineItemTrimStrategy?: 'purchaseOrderBlank' | 'positiveWeightOrAmount'
  supportsParentImport?: boolean
  supportsStatements?: boolean
  supportsInvoiceSync?: boolean
  supportsFreightPickup?: boolean
  supportsMaterialImport?: boolean
  statementLinkType?: 'supplier' | 'customer' | 'freight'
  normalizeDraftRecord?: (
    record: ModuleRecord,
    items: ModuleLineItem[],
    ctx: NormalizeDraftContext,
  ) => void
  syncEditorForm?: (editorForm: Record<string, unknown>) => void
  savePayloadLineItems?: boolean
  extraScalarFields?: string[]
  includeAttachmentIds?: boolean
  supportsStatementLinking?: 'receipt' | 'payment'
  showRoleLink?: boolean
  isSettingsModule?: boolean
  hasUploadRuleExpandedRow?: boolean
  alertActionLink?: { text: string; to: string }
  permissionCodesByActionKey?: Record<string, string[]>
}
