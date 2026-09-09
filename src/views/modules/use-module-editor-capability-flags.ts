import { useTranslation } from 'react-i18next'
import { useModuleEditorCapabilities } from '@/hooks/useModuleEditorCapabilities'
import { resolveStatusChangeActionLabelKey } from '@/module-system/adapter/module-adapter-actions'
import { isDeliveryVerificationStatus } from '@/module-system/behavior/module-page-behaviors'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type {
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'

interface Options {
  moduleKey: string
  config: ModulePageConfig
  formFields: ModuleFormFieldDefinition[]
  record: object | null
  lineItemsLocked: boolean
  canSave: boolean
  canAudit: boolean
}

/**
 * 编辑器保存/审核能力标记与底部按钮文案的单一来源：
 * 状态字段、当前状态、交付核定特例与各操作开关都在这里收敛。
 */
export function useModuleEditorCapabilityFlags({
  moduleKey,
  config,
  formFields,
  record,
  lineItemsLocked,
  canSave,
  canAudit,
}: Options) {
  const { t } = useTranslation()
  const statusField = formFields.find((field) => field.key === 'status')
  const statusOptions = Array.isArray(statusField?.options)
    ? statusField.options.map((option) => String(option.value))
    : []
  const currentStatus = String(
    readModuleRecordField(record, 'status') || '',
  ).trim()
  const isDeliveryVerification = isDeliveryVerificationStatus(
    moduleKey,
    currentStatus,
  )
  const canEditLineItems = Boolean(config.itemColumns?.length)
  // oxlint-disable react-doctor/no-event-handler -- These are capability inputs, not event handlers.
  const {
    canAddManualEditorItems,
    canManageEditorItems,
    canSaveAndAuditCurrentEditor,
    editorAuditActionKind,
    editorAuditTarget,
  } = useModuleEditorCapabilities({
    moduleKey,
    formFields,
    lineItemLockRelatedRows: [],
    lineItemsLockedOverride: lineItemsLocked,
    currentStatus: currentStatus || undefined,
    canEditLineItems,
    canSaveCurrentEditor: canSave,
    canAuditRecords: canAudit,
    canPrintRecords: false,
    canDeleteRecords: false,
    isReadOnly: Boolean(config.readOnly),
    resolveModuleStatusOptions: () => statusOptions,
  })
  // oxlint-enable react-doctor/no-event-handler

  const canConfirmDeliveryVerification =
    isDeliveryVerification && canSave && canAudit
  const editorAuditLabel = canConfirmDeliveryVerification
    ? t('modules.editorFooter.confirmDeliveryVerification')
    : t('modules.editorFooter.saveAndAction', {
        action: t(
          resolveStatusChangeActionLabelKey(editorAuditActionKind || 'audit'),
        ),
      })
  const canSaveAndAuditInEditor =
    canSaveAndAuditCurrentEditor || canConfirmDeliveryVerification

  return {
    canAddManualItems: canAddManualEditorItems,
    canConfirmDeliveryVerification,
    canEditItemColumns: canSave && Boolean(config.itemColumns?.length),
    canManageItems: canManageEditorItems,
    canSaveAndAuditInEditor,
    currentStatus,
    editorAuditActionKind,
    editorAuditLabel,
    editorAuditTarget,
  }
}
