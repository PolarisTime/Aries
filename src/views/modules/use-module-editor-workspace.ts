import dayjs from 'dayjs'
import i18next from 'i18next'
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useReducer,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
  saveAndAuditBusinessModule,
  saveBusinessModule,
  updateBusinessModuleStatus,
} from '@/api/business'
import {
  fetchSettlementCompanyOptions,
  getCompanySettingProfile,
} from '@/api/company-settings'
import { readRequestError } from '@/api/request-errors'
import { ERROR_CODE } from '@/constants/error-codes'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import { usesSnowflakeBusinessNo } from '@/module-system/business-no-policy'
import {
  applyFormFieldDefaultDraftValues,
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  syncDerivedEditorFormValuesForModule,
  trimEditorItemsForModule,
} from '@/module-system/module-adapter-editor'
import {
  buildOccupiedParentMap,
  buildParentImportState,
  resolveParentImportDefinition,
} from '@/module-system/module-adapter-parent-import'
import {
  getModuleRecordPrimaryNo,
  parseParentRelationNos,
} from '@/module-system/module-adapter-shared'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { cloneLineItems } from '@/utils/clone-utils'
import { parseDateTimeValue } from '@/utils/formatters'
import { getStoredUser } from '@/utils/storage'
import { asString } from '@/utils/type-narrowing'

function sumLineItemsBy(nextItems: ModuleLineItem[], key: string) {
  return nextItems.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

interface AuditTarget {
  key: string
  value: string
}

interface EditorWorkspaceState {
  items: ModuleLineItem[]
  authoritativePrimaryNo: string
}

interface WorkspaceFormApi {
  validateFields: () => Promise<ModuleRecord>
  getFieldsValue: (all?: boolean) => ModuleRecord
  setFieldsValue: (values: Partial<ModuleRecord>) => void
  resetFields: () => void
}

type FormChangedValues = Partial<ModuleRecord>

interface Props {
  open: boolean
  config: ModulePageConfig
  record: ModuleRecord | null
  moduleKey: string
  editorAuditTarget: AuditTarget | null
  form: WorkspaceFormApi
  onClose: () => void
  onSaved: () => void
  autoInsertBlankItemOnCreate: boolean
}

function normalizeRecordForEditor(
  config: ModulePageConfig,
  record: ModuleRecord,
): ModuleRecord {
  let normalized: ModuleRecord = {
    ...record,
  }

  const normalizeEditorRecord = getBehaviorValue(
    config.key,
    'normalizeEditorRecord',
  )
  if (normalizeEditorRecord) {
    normalized = normalizeEditorRecord(normalized)
  }

  hydrateFinanceStatementSource(config.key, normalized)

  for (const [key, value] of Object.entries(normalized)) {
    normalized[key] = normalizeLabeledValueObject(value)
  }

  for (const field of config.formFields || []) {
    if (
      field.type === 'select' ||
      field.type === 'multiSelect' ||
      field.type === 'autoComplete'
    ) {
      normalized[field.key] = normalizeSelectLikeValue(normalized[field.key])
      continue
    }

    if (field.type !== 'date') {
      continue
    }
    const rawValue = normalized[field.key]
    if (rawValue == null || rawValue === '' || dayjs.isDayjs(rawValue)) {
      continue
    }

    const parsed = parseDateTimeValue(rawValue)
    normalized[field.key] = parsed ?? undefined
  }

  return normalized
}

function hydrateFinanceStatementSource(
  moduleKey: string,
  record: ModuleRecord,
) {
  if (moduleKey === 'ledger-adjustment') {
    record.customerId =
      record.counterpartyType === '客户' ? record.counterpartyId : undefined
  }

  const firstItem = Array.isArray(record.items) ? record.items[0] : undefined
  if (!firstItem) {
    return
  }

  if (moduleKey === 'receipt' && !record.sourceCustomerStatementId) {
    record.sourceCustomerStatementId =
      firstItem.sourceCustomerStatementId ?? firstItem.sourceStatementId
    return
  }

  if (moduleKey !== 'payment') {
    return
  }

  if (!record.sourceFreightStatementId && firstItem.sourceFreightStatementId) {
    record.sourceFreightStatementId = firstItem.sourceFreightStatementId
  }

  if (!record.sourceFreightStatementId && firstItem.sourceStatementId) {
    record.sourceFreightStatementId = firstItem.sourceStatementId
  }
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeSelectLikeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSelectLikeValue(item))
  }
  if (isRecordLike(value) && 'value' in value) {
    return asString(value.value)
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return asString(value)
  }
  return value
}

function normalizeLabeledValueObject(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeLabeledValueObject(item))
  }
  if (isRecordLike(value) && 'value' in value) {
    return asString(value.value)
  }
  return value
}

function normalizeLineItemsForEditor(items: ModuleLineItem[]) {
  return items.map((item) => ({
    ...item,
    materialCode: normalizeLabeledValueObject(item.materialCode),
    settlementMode: normalizeSelectLikeValue(item.settlementMode),
    warehouseName: normalizeSelectLikeValue(item.warehouseName),
    settlementCompanyId: normalizeSelectLikeValue(item.settlementCompanyId),
  }))
}

function hasExplicitTimePart(value: unknown): boolean {
  if (dayjs.isDayjs(value) || value instanceof Date) {
    return true
  }

  if (typeof value === 'number') {
    return String(Math.trunc(value)).length !== 8
  }

  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  return /\d{1,2}:\d{2}/.test(normalized) || /^\d{14}$/.test(normalized)
}

function parseValidDateTime(value: unknown) {
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null
  }
  return parseDateTimeValue(value)
}

function mergeDateOnlyFieldTimesForSave(
  config: ModulePageConfig,
  values: ModuleRecord,
  sourceRecord: ModuleRecord | null,
): ModuleRecord {
  if (!config.formFields?.length) {
    return values
  }

  const fallbackTime = dayjs()
  const next: ModuleRecord = { ...values }

  for (const field of config.formFields) {
    if (field.type !== 'date' || field.showTime === true) {
      continue
    }

    const value = next[field.key]
    if (!dayjs.isDayjs(value) || !value.isValid()) {
      continue
    }

    const sourceValue = sourceRecord?.[field.key]
    const sourceTime = hasExplicitTimePart(sourceValue)
      ? parseValidDateTime(sourceValue)
      : null
    const timeSource = sourceTime || fallbackTime
    next[field.key] = value
      .hour(timeSource.hour())
      .minute(timeSource.minute())
      .second(timeSource.second())
  }

  return next
}

function isAntdFormValidationError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false
  const obj = err as Record<string, unknown>
  return (
    Array.isArray(obj.errorFields) &&
    typeof obj.values === 'object' &&
    obj.values !== null
  )
}

function getCurrentOperatorName() {
  const user = getStoredUser()
  if (user) {
    return String(
      user.userName ||
        user.loginName ||
        i18next.t('modules.editorWorkspace.currentUserFallback'),
    )
  }
  return i18next.t('modules.editorWorkspace.currentUserFallback')
}

function normalizeOptionalString(value: unknown) {
  return asString(value).trim()
}

function getAuthoritativePrimaryNo(
  moduleKey: string,
  primaryNoKey: string | undefined,
  record: ModuleRecord | null | undefined,
) {
  if (
    !record ||
    !primaryNoKey ||
    !usesSnowflakeBusinessNo(moduleKey, primaryNoKey)
  ) {
    return ''
  }
  return normalizeOptionalString(record[primaryNoKey])
}

function applyAuthoritativePrimaryNo(
  record: ModuleRecord,
  primaryNoKey: string | undefined,
  authoritativePrimaryNo: string,
) {
  if (!primaryNoKey || !authoritativePrimaryNo) {
    return record
  }
  record[primaryNoKey] = authoritativePrimaryNo
  return record
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

function syncEditorFormValues(args: {
  config: ModulePageConfig
  form: WorkspaceFormApi
  moduleKey: string
  items: ModuleLineItem[]
  sumLineItemsBy: (nextItems: ModuleLineItem[], key: string) => number
  changedValues?: FormChangedValues
}) {
  const { config, form, moduleKey, items, sumLineItemsBy, changedValues } = args
  const currentValues = form.getFieldsValue(true)
  const changedKeys = new Set(Object.keys(changedValues || {}))
  const nextValues = syncDerivedEditorFormValuesForModule({
    moduleKey,
    record: { ...currentValues, ...changedValues },
    items,
    sumLineItemsBy,
    changedKeys,
  })
  form.setFieldsValue(normalizeRecordForEditor(config, nextValues))
}

export function useModuleEditorWorkspace({
  open,
  config,
  record,
  moduleKey,
  editorAuditTarget,
  form,
  onClose,
  onSaved,
  autoInsertBlankItemOnCreate,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [parentSelectorSessionKey, setParentSelectorSessionKey] = useState<
    string | null
  >(null)
  const [parentSelectorFilters, setParentSelectorFilters] =
    useState<SearchParams>({})
  const [parentSelectorDefinition, setParentSelectorDefinition] =
    useState<ModuleParentImportDefinition | null>(null)
  const [parentImporting, setParentImporting] = useState(false)
  const [workspaceState, dispatchWorkspaceState] = useReducer(
    editorWorkspaceReducer,
    {
      items: [],
      authoritativePrimaryNo: '',
    },
  )
  const { items, authoritativePrimaryNo } = workspaceState
  const { t } = useTranslation()
  const [saveResult, setSaveResult] = useState<{
    status: 'success' | 'error' | 'warning'
    message: string
    traceId?: string
    errorCode?: number
    record?: ModuleRecord
  } | null>(null)
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const isEdit = !!record
  const editorSessionKey = `${moduleKey}:${String(record?.id || 'new')}:${String(open)}`
  const parentSelectorOpen = parentSelectorSessionKey === editorSessionKey
  useEffect(() => {
    if (!open) {
      return
    }

    let active = true
    const initializeEditor = () => {
      if (!active) {
        return
      }

      if (record) {
        const nextAuthoritativePrimaryNo = getAuthoritativePrimaryNo(
          moduleKey,
          config.primaryNoKey,
          record,
        )
        form.setFieldsValue(normalizeRecordForEditor(config, record))
        dispatchWorkspaceState({
          items: normalizeLineItemsForEditor(record.items || []),
          authoritativePrimaryNo: nextAuthoritativePrimaryNo,
        })
        return
      }

      form.resetFields()
      const defaultDraft: ModuleRecord = {} as ModuleRecord
      applyFormFieldDefaultDraftValues(defaultDraft, config.formFields)
      applyModuleDefaultEditorDraft(
        moduleKey,
        defaultDraft,
        getCurrentOperatorName(),
      )
      form.setFieldsValue(defaultDraft)
      applyPurchaseOrderDefaultSettlementCompany(moduleKey, form, () => active)
      const draftItems = autoInsertBlankItemOnCreate
        ? [buildDefaultEditorLineItem(undefined, moduleKey)]
        : []
      dispatchWorkspaceState({
        items: draftItems,
        authoritativePrimaryNo: '',
      })
    }

    initializeEditor()

    return () => {
      active = false
    }
  }, [autoInsertBlankItemOnCreate, config, form, moduleKey, open, record])

  const handleFormValuesChange = (changedValues: FormChangedValues) => {
    if (!open) {
      return
    }
    if (!Object.keys(changedValues).length) {
      return
    }
    const changedKeys = new Set(Object.keys(changedValues))
    if (config.parentImport?.resolveParentSelector) {
      setParentSelectorSessionKey(null)
      setParentSelectorDefinition(null)
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
      dispatchWorkspaceState({ items: [] })
    }
    syncEditorFormValues({
      config,
      form,
      moduleKey,
      items: nextItems,
      sumLineItemsBy,
      changedValues: effectiveChangedValues,
    })
  }

  const handleSave = async (audit = false) => {
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

      let occupiedParentMap: Record<string, ModuleRecord> = {}
      if (config.parentImport?.enforceUniqueRelation) {
        try {
          const existingRows = await listAllBusinessModuleRows(moduleKey, {})
          occupiedParentMap = buildOccupiedParentMap(
            existingRows,
            config.parentImport.parentFieldKey,
            record?.id ? String(record.id) : undefined,
          )
        } catch {
          // non-critical — skip uniqueness check if fetch fails
        }
      }

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
        parentImportConfig: config.parentImport,
        occupiedParentMap,
        getPrimaryNo: (candidate) =>
          getModuleRecordPrimaryNo(candidate, config.primaryNoKey),
        collectAll: true,
      })
      if (validationMessage) {
        message.warning(validationMessage)
        return
      }

      // 销售订单独有提示: 明细 unitPrice 为 0 时提醒「价格待定」
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
        if (!confirmed) return
      }

      if (audit && editorAuditTarget) {
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: t('common.saveAndAudit'),
            content: t('common.auditConfirm'),
            okText: t('common.confirmAudit'),
            cancelText: t('common.cancel'),
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) return
      }

      setSaving(true)
      const draftRecord: ModuleRecord = {
        ...(record || {}),
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
      })

      if (audit && editorAuditTarget) {
        const submittedStatus = asString(
          draftRecord[editorAuditTarget.key],
        ).trim()
        if (submittedStatus === editorAuditTarget.value) {
          const existingStatus = asString(
            record?.[editorAuditTarget.key],
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

      const usesAtomicSaveAndAudit =
        audit &&
        editorAuditTarget != null &&
        (moduleKey === 'freight-bill' || moduleKey === 'freight-statement')
      const savedResult = usesAtomicSaveAndAudit
        ? await saveAndAuditBusinessModule(moduleKey, draftRecord)
        : await saveBusinessModule(moduleKey, draftRecord)
      let savedRecord = savedResult.data
      if (audit && editorAuditTarget && !usesAtomicSaveAndAudit) {
        const savedId = String(savedRecord?.id || draftRecord.id || '').trim()
        if (!savedId) {
          throw new Error('保存成功但未返回单据 ID，无法完成审核')
        }
        const statusResult = await updateBusinessModuleStatus(
          moduleKey,
          savedId,
          editorAuditTarget.value,
        )
        savedRecord = statusResult.data || savedRecord
      }
      setSaveResult({
        status: 'success',
        message: isEdit ? t('common.editSuccess') : t('common.addSuccess'),
        record: savedRecord,
      })
      onSaved()
      try {
        await refreshModuleQueries()
      } catch (refreshError) {
        message.error(
          refreshError instanceof Error
            ? refreshError.message
            : t('common.loadFailed'),
        )
      }
      setSaving(false)
    } catch (err) {
      if (isAntdFormValidationError(err)) {
        // Form 已内联展示校验错误，不重复提示
      } else if (err instanceof Error) {
        const { code, traceId } = readRequestError(err)
        const baseErrorMessage = err.message || t('common.saveFailed')
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

  const handleImportParentRecord = async (selectedRecords: ModuleRecord[]) => {
    const parentImportConfig =
      parentSelectorDefinition ||
      (config.parentImport
        ? resolveParentImportDefinition(
            config.parentImport,
            form.getFieldsValue(true),
          )
        : undefined)
    if (!parentImportConfig) {
      return
    }
    if (!selectedRecords.length) {
      message.warning(
        t('common.pleaseSelectWith', { label: parentImportConfig.label }),
      )
      return
    }

    setParentImporting(true)
    try {
      const parentDetails = await Promise.all(
        selectedRecords.map(async (selectedRecord) => ({
          data: parentImportConfig.resolveParentRecord
            ? await parentImportConfig.resolveParentRecord(selectedRecord)
            : (
                await getBusinessModuleDetail(
                  parentImportConfig.parentModuleKey,
                  String(selectedRecord.id),
                )
              ).data,
        })),
      )

      let nextValues = form.getFieldsValue(true)
      let nextItems = items
      let importedParentCount = 0
      let importedItemCount = 0
      let importValidationError = ''

      for (const parentDetail of parentDetails) {
        const parentRecord = parentDetail.data
        const currentParentNos = parseParentRelationNos(
          nextValues[parentImportConfig.parentFieldKey],
        )
        const validationError = parentImportConfig.validateParentImport?.({
          currentRecord: nextValues,
          currentItems: nextItems,
          currentParentNos,
          parentRecord,
        })
        if (validationError) {
          importValidationError = validationError
          break
        }
        const importState = buildParentImportState({
          parentImportConfig,
          parentRecord,
          currentParentNos,
          currentItems: nextItems,
          cloneLineItems,
        })

        nextValues = {
          ...nextValues,
          [parentImportConfig.parentFieldKey]: importState.parentNosText,
        }
        if (importState.shouldApplyMappedValues) {
          Object.assign(nextValues, importState.mappedValues)
        }
        nextItems = importState.nextItems
        importedParentCount += importState.hasImportedCurrentParent ? 0 : 1
        importedItemCount += importState.importedItemCount
      }

      if (importValidationError) {
        message.error(importValidationError)
        setParentImporting(false)
        return
      }

      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        sumLineItemsBy,
        changedValues: nextValues,
      })
      dispatchWorkspaceState({ items: nextItems })
      setParentSelectorSessionKey(null)
      setParentSelectorDefinition(null)
      message.success(
        importedParentCount > 1
          ? t('common.importParentSuccess', {
              parentCount: importedParentCount,
              itemCount: importedItemCount,
            })
          : t('common.importParentSuccessSimple', {
              itemCount: importedItemCount,
            }),
      )
      setParentImporting(false)
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : t('common.importParentFailed'),
      )
      setParentImporting(false)
    }
  }

  const openParentSelector = () => {
    const parentImportConfig = config.parentImport
    if (!parentImportConfig) {
      return
    }
    const currentValues = form.getFieldsValue(true)
    const validationError =
      parentImportConfig.validateBeforeOpen?.(currentValues)
    if (validationError) {
      message.warning(validationError)
      return
    }
    const effectiveParentImportConfig = resolveParentImportDefinition(
      parentImportConfig,
      currentValues,
    )
    const nextParentFilters =
      effectiveParentImportConfig.buildParentFilters?.(currentValues) || {}
    setParentSelectorFilters(nextParentFilters)
    setParentSelectorDefinition(effectiveParentImportConfig)
    setParentSelectorSessionKey(editorSessionKey)
  }

  const addItem = () => {
    const newItem = buildDefaultEditorLineItem(undefined, moduleKey)
    const nextItems = [...items, newItem]
    dispatchWorkspaceState({ items: nextItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        sumLineItemsBy,
      })
    }
  }

  const updateItems: Dispatch<SetStateAction<ModuleLineItem[]>> = (
    nextItems,
  ) => {
    const resolvedItems =
      typeof nextItems === 'function' ? nextItems(items) : nextItems
    dispatchWorkspaceState({ items: resolvedItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: resolvedItems,
        sumLineItemsBy,
      })
    }
  }

  return {
    addItem,
    closeParentSelector: () => {
      setParentSelectorSessionKey(null)
      setParentSelectorDefinition(null)
    },
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorFilters,
    parentSelectorModuleKey:
      parentSelectorDefinition?.parentModuleKey ||
      config.parentImport?.parentModuleKey,
    parentSelectorOpen,
    parentSelectorDisplayFieldKey:
      parentSelectorDefinition?.parentDisplayFieldKey ||
      config.parentImport?.parentDisplayFieldKey,
    authoritativePrimaryNo,
    saveResult,
    clearSaveResult: () => setSaveResult(null),
    reloadAfterConflict,
    saving,
    setItems: updateItems,
    handleFormValuesChange,
  }
}
