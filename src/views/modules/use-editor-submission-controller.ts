import { createElement, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  saveAndAuditBusinessModule,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { createIdempotencyKey } from '@/api/core/idempotency'
import { readRequestError } from '@/api/core/request-errors'
import { saveAndCompleteSalesOrder } from '@/api/sales/document-flow-commands'
import { fetchSalesOrderContractCheck } from '@/api/sales/sales-contracts'
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
import {
  getModulePageBehavior,
  isDeliveryVerificationStatus,
} from '@/module-system/behavior/module-page-behaviors'
import { usesSnowflakeBusinessNo } from '@/module-system/core/business-no-policy'
import type { ModuleKey } from '@/module-system/core/module-key'
import { hasMaterialSelection } from '@/module-system/editor/module-editor-shared'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'
import type {
  ModuleDetailRecordFor,
  PersistedModuleEditorDraftFor,
} from '@/types/module-record'
import { message, modal } from '@/utils/antd-app'
import { confirmDanger } from '@/utils/confirm-danger'
import {
  focusFirstInvalidField,
  readAntdFormValidationErrorFields,
} from '@/utils/form-control-a11y'
import { asString } from '@/utils/type-narrowing'
import { withFinally } from '@/utils/with-finally'
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
import { runSalesOrderContractCheck } from '@/views/modules/sales-order-contract-check'

/**
 * 保存回执里的主单号：主单号字段由各模块配置声明（如 freight-bill 的 billNo），
 * 回执对象是各模块 DTO 的联合类型，没有统一索引签名，因此在这里做一次安全读取。
 */
function readSavedDocumentNo(
  record: unknown,
  primaryNoKey: string | undefined,
): string {
  if (!primaryNoKey || !record || typeof record !== 'object') {
    return ''
  }
  return asString((record as Record<string, unknown>)[primaryNoKey]).trim()
}

export interface EditorSaveResult<Key extends ModuleKey> {
  status: 'success' | 'error' | 'warning'
  message: string
  traceId?: string
  errorCode?: number
  record?: ModuleDetailRecordFor<Key>
  /**
   * 本次提交是「保存草稿 / 保存并审核 / 核定并审核」中的哪一种。
   *
   * <p>回执页要按「从哪来、单据变成什么状态」渲染标题与按钮，光看 status 区分不出来：
   * 三种动作都是 success。缺省表示未知来源，回执退回通用成功文案（兼容旧调用）。</p>
   */
  action?: SubmissionAction
  /**
   * 「保存并审核」这一类动作的具体种类：动作词与编辑器主按钮同源，
   * 因此客户对账单（按钮「保存并确认」）的回执不会写成「提交审核」。
   */
  auditActionKind?: StatusChangeActionKind
  /** 保存后单据所处的状态（后端回执里的 status），用于文案里点明「草稿 / 已审核」。 */
  resultStatus?: string
  /** 保存后单据的主单号，回执文案带上它，便于用户确认「刚存的是哪一张」。 */
  documentNo?: string
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
    const pageBehavior = getModulePageBehavior(moduleKey)
    const confirmDeliveryVerification =
      audit &&
      isDeliveryVerificationStatus(moduleKey, asString(record?.status).trim())
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

    // try/finally 交给 withFinally: React Compiler 不支持带 finally 的 TryStatement,
    // 命中后整个 Hook 会失去自动记忆化。包一层箭头函数后, 内部的提前 return 依旧会执行收尾。
    await withFinally(
      async () => {
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

          // 数量单位真源为商品主数据 quantityUnit: 缺失时禁止保存并提示补全, 不做静默回落
          const itemMissingQuantityUnit = trimmedItems.find(
            (item) =>
              hasMaterialSelection(item) && !asString(item.quantityUnit).trim(),
          )
          if (itemMissingQuantityUnit) {
            message.warning(
              t('modules.editor.missingQuantityUnit', {
                material:
                  asString(itemMissingQuantityUnit.materialName) ||
                  asString(itemMissingQuantityUnit.materialCode) ||
                  asString(itemMissingQuantityUnit.material) ||
                  '--',
              }),
            )
            invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
            return
          }

          const zeroPriceItemCount = pageBehavior?.confirmsZeroPriceItems
            ? trimmedItems.filter(
                (item) => !item.unitPrice || Number(item.unitPrice) === 0,
              ).length
            : 0
          if (zeroPriceItemCount > 0) {
            const confirmed = await new Promise<boolean>((resolve) => {
              modal.confirm({
                title: t('moduleEditor.pricePendingTitle'),
                content: t('moduleEditor.pricePendingContent', {
                  count: zeroPriceItemCount,
                }),
                okText: t('moduleEditor.continueSave'),
                cancelText: t('moduleEditor.backToEdit'),
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
              resolveStatusChangeActionLabelKey(
                editorAuditActionKind || 'audit',
              ),
            )
            /*
             * 「保存并审核 / 确认发货核验」会把单据推到不可回退的状态，属破坏性操作：
             * 走 confirmDanger 保证默认焦点在「取消」，回车不会直接推进状态。
             */
            const confirmed = await new Promise<boolean>((resolve) => {
              confirmDanger({
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

          if (moduleKey === 'sales-order') {
            const contractDecision = await runSalesOrderContractCheck(
              draftRecord,
              t,
              {
                fetchCheck: (params) => fetchSalesOrderContractCheck(params),
                confirm: (options) =>
                  new Promise<boolean>((resolve) => {
                    modal.confirm({
                      title: options.title,
                      content: createElement(
                        'div',
                        { style: { whiteSpace: 'pre-line' } },
                        options.content.join('\n'),
                      ),
                      okText: options.okText,
                      cancelText: options.cancelText,
                      onOk: () => resolve(true),
                      onCancel: () => resolve(false),
                    })
                  }),
                warn: (text) => message.warning(text),
              },
            )
            if (contractDecision === 'abort') {
              invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
              return
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
            // 把「本次是保存草稿还是保存并审核」带进回执：三种动作都是 success，
            // 不带这个信息回执只能给一套通用文案与按钮。
            action: submissionAction,
            // 与主按钮同一个取值来源（下方 editorAuditActionKind 即按钮文案所用）。
            auditActionKind: editorAuditActionKind || 'audit',
            resultStatus: asString(savedRecord?.status).trim(),
            documentNo: readSavedDocumentNo(savedRecord, config.primaryNoKey),
          })
        } catch (error) {
          if (!mutationAttempted) {
            invalidateSubmissionIntent(submissionRef.current, idempotencyKey)
          }
          if (isAntdFormValidationError(error)) {
            // Form 已内联展示校验错误，不重复提示。
            const validationErrorFields =
              readAntdFormValidationErrorFields(error)
            if (validationErrorFields) {
              focusFirstInvalidField(form, validationErrorFields)
            }
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
        }
      },
      () => {
        submissionRef.current.inFlight = false
        setSaving(false)
      },
    )
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
    }
    // 不用 try/finally: React Compiler 不支持该语法(react-hooks-js/todo), 命中后组件会失去自动记忆化;
    // 此处无提前 return, 清理语句跟在 try/catch 之后即可保持等价。
    setSaving(false)
  }

  return {
    clearSaveResult: () => setSaveResult(null),
    handleSave,
    reloadAfterConflict,
    saveResult,
    saving,
  }
}
