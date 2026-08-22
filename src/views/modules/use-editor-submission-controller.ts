import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  saveAndAuditBusinessModule,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { createIdempotencyKey } from '@/api/core/idempotency'
import { readRequestError } from '@/api/core/request-errors'
import { saveAndCompleteSalesOrder } from '@/api/sales/document-flow-commands'
import { ERROR_CODE } from '@/constants/error-codes'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import {
  resolveStatusChangeActionLabelKey,
  type StatusChangeActionKind,
} from '@/module-system/adapter/module-adapter-actions'
import {
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  trimEditorItemsForModule,
} from '@/module-system/adapter/module-adapter-editor'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import { usesSnowflakeBusinessNo } from '@/module-system/core/business-no-policy'
import type { ModuleKey } from '@/module-system/core/module-key'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import type {
  ModuleDetailRecordFor,
  PersistedModuleEditorDraftFor,
} from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import { asString } from '@/utils/type-narrowing'
import type { DocumentChargeItemDraft } from '@/views/modules/module-editor-draft-adapter'
import {
  buildEditorSubmissionDraft,
  sumChargeItemAmount,
  toEditorFormState,
} from '@/views/modules/module-editor-draft-adapter'
import { mergeDateOnlyFieldTimesForSave } from '@/views/modules/module-editor-record-normalization'
import {
  applyAuthoritativePrimaryNo,
  type EditorAuditTarget,
  type EditorFormValues,
  getAuthoritativePrimaryNo,
  getCurrentOperatorName,
  invalidateSubmissionIntent,
  isAntdFormValidationError,
  type SubmissionAction,
  type SubmissionRef,
  sumLineItemsBy,
  type WorkspaceFormApi,
} from '@/views/modules/module-editor-workspace-support'

export interface EditorSaveResult<Key extends ModuleKey> {
  status: 'success' | 'error' | 'warning'
  message: string
  traceId?: string
  errorCode?: number
  record?: ModuleDetailRecordFor<Key>
}

interface SubmissionSession<Key extends ModuleKey> {
  moduleKey: Key
  config: ModulePageConfig
  record: PersistedModuleEditorDraftFor<Key> | null
  isEdit: boolean
  editorAuditActionKind: StatusChangeActionKind | null
  editorAuditTarget: EditorAuditTarget | null
}

interface SubmissionWorkspace {
  items: ModuleLineItem[]
  expenseItems: DocumentChargeItemDraft[]
  authoritativePrimaryNo: string
  submissionRef: SubmissionRef
}

interface SubmissionCallbacks {
  onClose: () => void
  onSaved: () => void
}

interface Options<Key extends ModuleKey> {
  session: SubmissionSession<Key>
  form: WorkspaceFormApi
  workspace: SubmissionWorkspace
  callbacks: SubmissionCallbacks
}

interface ExecuteSubmissionOptions {
  action: SubmissionAction
  values: EditorFormValues
  items: ModuleLineItem[]
  idempotencyKey: string
  chargeItems?: DocumentChargeItemDraft[]
}

function executeEditorSubmission<Key extends ModuleKey>(
  moduleKey: Key,
  options: ExecuteSubmissionOptions,
): Promise<ModuleDetailRecordFor<Key>>
async function executeEditorSubmission(
  moduleKey: ModuleKey,
  options: ExecuteSubmissionOptions,
): Promise<ModuleDetailRecordFor<ModuleKey>> {
  const { action, values, items, chargeItems, idempotencyKey } = options
  if (action === 'save-and-complete') {
    return saveAndCompleteSalesOrder(
      buildEditorSubmissionDraft('sales-order', values, items, chargeItems),
      idempotencyKey,
    )
  }

  const draft = buildEditorSubmissionDraft(
    moduleKey,
    values,
    items,
    chargeItems,
  )
  return action === 'save-and-audit'
    ? saveAndAuditBusinessModule(moduleKey, draft, idempotencyKey)
    : saveBusinessModule(moduleKey, draft, idempotencyKey)
}

export function useEditorSubmissionController<Key extends ModuleKey>({
  session,
  form,
  workspace,
  callbacks,
}: Options<Key>) {
  const {
    moduleKey,
    config,
    record,
    isEdit,
    editorAuditActionKind,
    editorAuditTarget,
  } = session
  const { items, expenseItems, authoritativePrimaryNo, submissionRef } =
    workspace
  const { onClose, onSaved } = callbacks
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<EditorSaveResult<Key> | null>(
    null,
  )
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const { t } = useTranslation()

  const handleSave = async (audit = false) => {
    const confirmDeliveryVerification =
      audit &&
      moduleKey === 'sales-order' &&
      asString(record?.status).trim() === '交付核定'
    const submissionAction: SubmissionAction = confirmDeliveryVerification
      ? 'save-and-complete'
      : audit && editorAuditTarget
        ? 'save-and-audit'
        : 'save'
    const submission = submissionRef.current
    if (submission.inFlight) {
      return
    }
    if (submission.action !== submissionAction || !submission.idempotencyKey) {
      submission.action = submissionAction
      submission.idempotencyKey = createIdempotencyKey()
    }
    const idempotencyKey = submission.idempotencyKey
    submission.inFlight = true
    setSaving(true)
    let mutationAttempted = false

    try {
      const effectiveAuthoritativePrimaryNo =
        authoritativePrimaryNo ||
        getAuthoritativePrimaryNo(moduleKey, config.primaryNoKey, record)

      if (config.primaryNoKey && effectiveAuthoritativePrimaryNo) {
        form.setFieldsValue({
          [config.primaryNoKey]: effectiveAuthoritativePrimaryNo,
        })
      }

      const validatedFields = await form.validateFields()
      const validatedValues = applyAuthoritativePrimaryNo(
        { ...form.getFieldsValue(true), ...validatedFields },
        config.primaryNoKey,
        effectiveAuthoritativePrimaryNo,
      )
      const values = mergeDateOnlyFieldTimesForSave(
        config,
        validatedValues,
        record,
      )
      const trimmedItems = trimEditorItemsForModule(moduleKey, items)

      const validationMessage = getEditorValidationMessage({
        moduleKey,
        fields: config.formFields || [],
        editorForm: values,
        hasItemColumns: Boolean(config.itemColumns?.length),
        itemColumns: config.itemColumns,
        items: trimmedItems,
        itemCount: trimmedItems.length,
        skipRequiredFieldKeys:
          config.primaryNoKey &&
          usesSnowflakeBusinessNo(moduleKey, config.primaryNoKey)
            ? [config.primaryNoKey]
            : [],
        collectAll: true,
      })
      if (validationMessage) {
        message.warning(validationMessage)
        invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
        return
      }

      const zeroPriceItemCount =
        moduleKey === 'sales-order'
          ? trimmedItems.filter(
              (item) => !item.unitPrice || Number(item.unitPrice) === 0,
            ).length
          : 0
      if (zeroPriceItemCount > 0) {
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: '价格待定提醒',
            content: `当前 ${zeroPriceItemCount} 条明细单价为 0，将以「待定价」状态保存。确认继续吗？`,
            okText: '继续保存',
            cancelText: '返回修改',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) {
          invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
          return
        }
      }

      if (confirmDeliveryVerification || (audit && editorAuditTarget)) {
        const statusActionLabel = t(
          resolveStatusChangeActionLabelKey(editorAuditActionKind || 'audit'),
        )
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: confirmDeliveryVerification
              ? t('modules.editorFooter.confirmDeliveryVerification')
              : t('modules.editorFooter.saveAndAction', {
                  action: statusActionLabel,
                }),
            content: confirmDeliveryVerification
              ? t('modules.editorFooter.confirmDeliveryVerificationContent')
              : t('modules.editorFooter.statusActionConfirm', {
                  action: statusActionLabel,
                  targetStatus: editorAuditTarget?.value || '',
                }),
            okText: confirmDeliveryVerification
              ? t('modules.editorFooter.confirmDeliveryVerification')
              : t('modules.editorFooter.confirmStatusAction', {
                  action: statusActionLabel,
                }),
            cancelText: t('common.cancel'),
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) {
          invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
          return
        }
      }

      const draftRecord: EditorFormValues = {
        ...(record ? toEditorFormState(record).values : {}),
        ...values,
        id: record?.id || '',
        items: trimmedItems,
      }
      applyAuthoritativePrimaryNo(
        draftRecord,
        config.primaryNoKey,
        effectiveAuthoritativePrimaryNo,
      )

      normalizeDraftRecordForModule({
        moduleKey,
        record: draftRecord,
        items: trimmedItems,
        primaryNoKey: config.primaryNoKey,
        currentOperatorName: getCurrentOperatorName(),
        sumLineItemsBy,
        formFields: config.formFields,
        chargeTotal: sumChargeItemAmount(expenseItems),
      })

      if (audit && editorAuditTarget && !confirmDeliveryVerification) {
        const submittedStatus = asString(
          draftRecord[editorAuditTarget.key],
        ).trim()
        if (submittedStatus === editorAuditTarget.value) {
          const existingStatus = asString(
            readModuleRecordField(record, editorAuditTarget.key),
          ).trim()
          const defaultStatus = getBehaviorValue(moduleKey, 'defaultStatus')
          const draftStatus =
            existingStatus && existingStatus !== editorAuditTarget.value
              ? existingStatus
              : typeof defaultStatus === 'string'
                ? defaultStatus.trim()
                : ''
          if (draftStatus) {
            draftRecord[editorAuditTarget.key] = draftStatus
          } else {
            delete draftRecord[editorAuditTarget.key]
          }
        }
      }

      mutationAttempted = true
      const savedResult = await executeEditorSubmission(moduleKey, {
        action: submissionAction,
        values: draftRecord,
        items: trimmedItems,
        chargeItems: expenseItems,
        idempotencyKey,
      })
      invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
      const savedRecord = savedResult
      try {
        await refreshModuleQueries()
      } catch (refreshError) {
        message.error(
          refreshError instanceof Error
            ? refreshError.message
            : t('common.loadFailed'),
        )
      }
      onSaved()
      setSaveResult({
        status: 'success',
        message: isEdit ? t('common.editSuccess') : t('common.addSuccess'),
        record: savedRecord,
      })
    } catch (error) {
      if (!mutationAttempted) {
        invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
      }
      if (isAntdFormValidationError(error)) {
        // Form 已内联展示校验错误，不重复提示。
      } else if (error instanceof Error) {
        const { code, traceId } = readRequestError(error)
        const baseErrorMessage = error.message || t('common.saveFailed')
        setSaveResult({
          status: 'error',
          message: baseErrorMessage,
          traceId,
          ...(code !== undefined ? { errorCode: code } : {}),
        })
      } else {
        setSaveResult({
          status: 'error',
          message: t('common.saveFailedRetry'),
        })
      }
    } finally {
      submissionRef.current.inFlight = false
      setSaving(false)
    }
  }

  const reloadAfterConflict = async (): Promise<void> => {
    if (saveResult?.errorCode !== ERROR_CODE.CONCURRENT_MODIFICATION) {
      return
    }

    setSaving(true)
    try {
      await refreshModuleQueries()
      setSaveResult(null)
      onClose()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('common.loadFailed'),
      )
    } finally {
      setSaving(false)
    }
  }

  return {
    clearSaveResult: () => setSaveResult(null),
    handleSave,
    reloadAfterConflict,
    saveResult,
    saving,
  }
}
