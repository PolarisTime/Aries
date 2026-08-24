import i18next from 'i18next'
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useReducer,
  useRef,
} from 'react'
import { fetchGeneratedMasterDataCode } from '@/api/master/master-data-codes'
import {
  fetchSettlementCompanyOptions,
  getCompanySettingProfile,
} from '@/api/system/company-settings'
import type { StatusChangeActionKind } from '@/module-system/adapter/module-adapter-actions'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
} from '@/module-system/adapter/module-adapter-editor'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import type { ModuleKey } from '@/module-system/core/module-key'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleParentImportSource,
} from '@/types/module-page'
import type { PersistedModuleEditorDraftFor } from '@/types/module-record'
import { message } from '@/utils/antd-app'
import {
  type DocumentChargeItemDraft,
  sumChargeItemAmount,
  toEditorFormState,
} from '@/views/modules/module-editor-draft-adapter'
import {
  normalizeLineItemsForEditor,
  normalizeRecordForEditor,
} from '@/views/modules/module-editor-record-normalization'
import {
  type EditorAuditTarget,
  type EditorFormValues,
  type FormChangedValues,
  getAuthoritativePrimaryNo,
  getCurrentOperatorName,
  invalidateSubmissionIntent,
  type SubmissionState,
  syncEditorFormValues,
  type WorkspaceFormApi,
} from '@/views/modules/module-editor-workspace-support'
import { useEditorSubmissionController } from '@/views/modules/use-editor-submission-controller'
import { useParentImportController } from '@/views/modules/use-parent-import-controller'

interface EditorWorkspaceState {
  items: ModuleLineItem[]
  expenseItems: DocumentChargeItemDraft[]
  authoritativePrimaryNo: string
}

interface Props<Key extends ModuleKey> {
  open: boolean
  config: ModulePageConfig
  record: PersistedModuleEditorDraftFor<Key> | null
  initialParentImportSource: ModuleParentImportSource | null
  initialEditorValues?: Record<string, unknown> | null
  moduleKey: Key
  editorAuditActionKind: StatusChangeActionKind | null
  editorAuditTarget: EditorAuditTarget | null
  form: WorkspaceFormApi
  onClose: () => void
  onDirty: () => void
  onSaved: () => void
  autoInsertBlankItemOnCreate: boolean
}

async function resolveDefaultSettlementCompany() {
  const currentProfile = await getCompanySettingProfile().catch(() => null)
  const currentId = currentProfile?.id?.trim()
  if (currentProfile?.companyName && currentId) {
    return {
      settlementCompanyId: currentId,
      settlementCompanyName: currentProfile.companyName,
    }
  }

  const options = await fetchSettlementCompanyOptions()
  const firstOption = options[0]
  if (!firstOption) {
    return {}
  }
  return {
    settlementCompanyId: firstOption.value,
    settlementCompanyName: firstOption.companyName,
  }
}

function applyPurchaseOrderDefaultSettlementCompany(
  moduleKey: string,
  form: WorkspaceFormApi,
  isActive: () => boolean,
) {
  if (moduleKey !== 'purchase-order') {
    return
  }

  void resolveDefaultSettlementCompany()
    .then((defaults) => {
      if (!isActive() || !defaults.settlementCompanyId) {
        return
      }
      const currentValues = form.getFieldsValue(true)
      if (currentValues.settlementCompanyId) {
        return
      }
      form.setFieldsValue(defaults)
    })
    .catch(() => {
      // 结算主体默认值不是创建草稿的硬依赖，保留必填校验兜底。
    })
}

function editorWorkspaceReducer(
  state: EditorWorkspaceState,
  patch: Partial<EditorWorkspaceState>,
): EditorWorkspaceState {
  return { ...state, ...patch }
}

export function useModuleEditorWorkspace<Key extends ModuleKey>({
  open,
  config,
  record,
  initialParentImportSource,
  initialEditorValues,
  moduleKey,
  editorAuditActionKind,
  editorAuditTarget,
  form,
  onClose,
  onDirty,
  onSaved,
  autoInsertBlankItemOnCreate,
}: Props<Key>) {
  const submissionRef = useRef<SubmissionState>({
    action: null,
    idempotencyKey: null,
    inFlight: false,
    sessionKey: null,
  })
  const autoImportedParentRef = useRef('')
  const [workspaceState, dispatchWorkspaceState] = useReducer(
    editorWorkspaceReducer,
    {
      items: [],
      expenseItems: [],
      authoritativePrimaryNo: '',
    },
  )
  const { items, expenseItems, authoritativePrimaryNo } = workspaceState
  const isEdit = !!record
  const editorSessionKey = `${moduleKey}:${String(record?.id || 'new')}:${String(open)}`
  const {
    clearSaveResult,
    handleSave,
    reloadAfterConflict,
    saveResult,
    saving,
  } = useEditorSubmissionController({
    session: {
      moduleKey,
      config,
      record,
      isEdit,
      editorAuditActionKind,
      editorAuditTarget,
    },
    form,
    workspace: { items, expenseItems, authoritativePrimaryNo, submissionRef },
    callbacks: { onClose, onSaved },
  })
  const {
    closeParentSelector,
    handleImportParentRecord,
    openParentSelector,
    parentImporting,
    parentSelectorDisplayFieldKey,
    parentSelectorFilters,
    parentSelectorModuleKey,
    parentSelectorOpen,
  } = useParentImportController({
    session: { editorSessionKey, moduleKey, config },
    form,
    workspace: {
      items,
      replaceItems: (nextItems) => dispatchWorkspaceState({ items: nextItems }),
      invalidateSubmission: () =>
        invalidateSubmissionIntent(submissionRef.current),
      onDirty,
    },
  })

  useEffect(() => {
    const submission = submissionRef.current
    if (submission.sessionKey !== editorSessionKey) {
      invalidateSubmissionIntent(submission)
      submission.sessionKey = editorSessionKey
    }
    if (!open) {
      return
    }

    let active = true
    const initializeEditor = () => {
      if (!active) {
        return
      }

      if (record) {
        const editorFormState = toEditorFormState(record)
        const nextAuthoritativePrimaryNo = getAuthoritativePrimaryNo(
          moduleKey,
          config.primaryNoKey,
          record,
        )
        form.setFieldsValue(
          normalizeRecordForEditor(config, editorFormState.values),
        )
        dispatchWorkspaceState({
          items: normalizeLineItemsForEditor(editorFormState.items),
          expenseItems: editorFormState.chargeItems,
          authoritativePrimaryNo: nextAuthoritativePrimaryNo,
        })
        return
      }

      form.resetFields()
      const defaultDraft: EditorFormValues = {}
      applyFormFieldDefaultDraftValues(defaultDraft, config.formFields)
      applyModuleDefaultEditorDraft(
        moduleKey,
        defaultDraft,
        getCurrentOperatorName(),
      )
      form.setFieldsValue({ ...defaultDraft, ...(initialEditorValues || {}) })
      if (config.showGeneratedPrimaryNoOnCreate && config.primaryNoKey) {
        const primaryNoKey = config.primaryNoKey
        void fetchGeneratedMasterDataCode(moduleKey)
          .then((generatedCode) => {
            if (!active) {
              return
            }
            form.setFieldsValue({ [primaryNoKey]: generatedCode })
          })
          .catch(() => {
            if (!active) {
              return
            }
            message.error(
              i18next.t(
                'modules.editorWorkspace.masterDataCodeGenerationFailed',
              ),
            )
          })
      }
      applyPurchaseOrderDefaultSettlementCompany(moduleKey, form, () => active)
      const draftItems = autoInsertBlankItemOnCreate
        ? [buildDefaultEditorLineItem(undefined, moduleKey)]
        : []
      dispatchWorkspaceState({
        items: draftItems,
        expenseItems: [],
        authoritativePrimaryNo: '',
      })
    }

    initializeEditor()

    return () => {
      active = false
    }
  }, [
    autoInsertBlankItemOnCreate,
    config,
    editorSessionKey,
    form,
    moduleKey,
    open,
    record,
    initialEditorValues,
  ])

  useEffect(() => {
    if (
      !open ||
      record ||
      !initialParentImportSource ||
      initialParentImportSource.parentModuleKey !==
        config.parentImport?.parentModuleKey
    ) {
      return
    }

    const importKey = `${initialParentImportSource.parentModuleKey}:${initialParentImportSource.parentRecordId}`
    if (autoImportedParentRef.current === importKey) {
      return
    }

    autoImportedParentRef.current = importKey
    void handleImportParentRecord([
      { id: initialParentImportSource.parentRecordId },
    ])
  }, [
    config.parentImport?.parentModuleKey,
    handleImportParentRecord,
    initialParentImportSource,
    open,
    record,
  ])

  const handleFormValuesChange = (changedValues: FormChangedValues) => {
    if (!open || !Object.keys(changedValues).length) {
      return
    }
    invalidateSubmissionIntent(submissionRef.current)
    onDirty()
    const changedKeys = new Set(Object.keys(changedValues))
    if (config.parentImport?.resolveParentSelector) {
      closeParentSelector()
    }
    const effectiveChangedValues = { ...changedValues }
    const clearEditorFields = getBehaviorValue(
      moduleKey,
      'clearEditorFieldsOnFieldChange',
    )
    for (const changedKey of changedKeys) {
      for (const fieldKey of clearEditorFields?.[changedKey] || []) {
        effectiveChangedValues[fieldKey] = ''
      }
    }
    const shouldClearLineItems = (
      getBehaviorValue(moduleKey, 'clearLineItemsOnFieldChange') || []
    ).some((fieldKey) => changedKeys.has(fieldKey))
    const nextItems = shouldClearLineItems ? [] : items
    if (shouldClearLineItems && items.length) {
      dispatchWorkspaceState({ items: [], expenseItems: [] })
    }
    syncEditorFormValues({
      config,
      form,
      moduleKey,
      items: nextItems,
      changedValues: effectiveChangedValues,
      // 行项目随字段联动清空时费用通道同步清空，本次重算按 0 计。
      chargeTotal: shouldClearLineItems ? 0 : sumChargeItemAmount(expenseItems),
    })
  }

  const addItem = () => {
    const nextItems = [
      ...items,
      buildDefaultEditorLineItem(undefined, moduleKey),
    ]
    invalidateSubmissionIntent(submissionRef.current)
    onDirty()
    dispatchWorkspaceState({ items: nextItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        chargeTotal: sumChargeItemAmount(expenseItems),
      })
    }
  }

  const updateExpenseItems: Dispatch<
    SetStateAction<DocumentChargeItemDraft[]>
  > = (nextExpenseItems) => {
    const resolved =
      typeof nextExpenseItems === 'function'
        ? nextExpenseItems(expenseItems)
        : nextExpenseItems
    if (resolved === expenseItems) {
      return
    }
    invalidateSubmissionIntent(submissionRef.current)
    onDirty()
    dispatchWorkspaceState({ expenseItems: resolved })
    // 费用行增删改同步叠加进 totalAmount（货物 + 费用），与行项目联动保持同一口径。
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items,
        chargeTotal: sumChargeItemAmount(resolved),
      })
    }
  }

  const updateItems: Dispatch<SetStateAction<ModuleLineItem[]>> = (
    nextItems,
  ) => {
    const resolvedItems =
      typeof nextItems === 'function' ? nextItems(items) : nextItems
    if (resolvedItems === items) {
      return
    }
    invalidateSubmissionIntent(submissionRef.current)
    onDirty()
    dispatchWorkspaceState({ items: resolvedItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: resolvedItems,
        chargeTotal: sumChargeItemAmount(expenseItems),
      })
    }
  }

  return {
    addItem,
    authoritativePrimaryNo,
    expenseItems,
    updateExpenseItems,
    clearSaveResult,
    closeParentSelector,
    handleFormValuesChange,
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorDisplayFieldKey,
    parentSelectorFilters,
    parentSelectorModuleKey,
    parentSelectorOpen,
    reloadAfterConflict,
    saveResult,
    saving,
    setItems: updateItems,
  }
}
