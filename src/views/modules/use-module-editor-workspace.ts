import { useQuery } from '@tanstack/react-query'
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
  allocateBusinessPrimaryNo,
  generateBusinessPrimaryNo,
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
  saveBusinessModule,
} from '@/api/business'
import {
  DISPLAY_SWITCH_CODES,
  isDisplaySwitchEnabled,
  listClientSettings,
  listSystemSettings,
} from '@/api/system-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import {
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
} from '@/module-system/module-adapter-parent-import'
import {
  getModuleRecordPrimaryNo,
  parseParentRelationNos,
} from '@/module-system/module-adapter-shared'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { cloneLineItems } from '@/utils/clone-utils'
import { getStoredUser } from '@/utils/storage'
import { asString } from '@/utils/type-narrowing'
import { resolveDefaultTaxRateValue } from '@/views/system/general-settings-view-utils'

const SNOWFLAKE_BUSINESS_NO_SWITCH_CODE =
  DISPLAY_SWITCH_CODES.useSnowflakeBusinessNo

interface AuditTarget {
  key: string
  value: string
}

interface EditorWorkspaceState {
  items: ModuleLineItem[]
  primaryNoLoading: boolean
}

interface WorkspaceFormApi {
  validateFields: () => Promise<ModuleRecord>
  getFieldsValue: (all?: boolean) => ModuleRecord
  setFieldsValue: (values: ModuleRecord) => void
  resetFields: () => void
}

type FormChangedValues = ModuleRecord

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
  if (!config.formFields?.length) {
    return record
  }

  const normalized: ModuleRecord = {
    ...record,
  }

  for (const field of config.formFields) {
    if (field.type !== 'date') {
      continue
    }
    const rawValue = normalized[field.key]
    if (rawValue == null || rawValue === '' || dayjs.isDayjs(rawValue)) {
      continue
    }

    const parsed = dayjs(asString(rawValue))
    normalized[field.key] = parsed.isValid() ? parsed : undefined
  }

  return normalized
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
  systemSettings?: ModuleRecord[]
}) {
  const {
    config,
    form,
    moduleKey,
    items,
    sumLineItemsBy,
    changedValues,
    systemSettings,
  } = args
  const currentValues = form.getFieldsValue(true)
  const changedKeys = new Set(Object.keys(changedValues || {}))
  const nextValues = syncDerivedEditorFormValuesForModule({
    moduleKey,
    record: { ...currentValues, ...changedValues },
    items,
    sumLineItemsBy,
    changedKeys,
  })
  if (moduleKey === 'invoice-receipt' || moduleKey === 'invoice-issue') {
    const defaultTaxRate = resolveDefaultTaxRateValue(systemSettings || [])
    nextValues.taxRate = defaultTaxRate
    nextValues.taxAmount = Number(
      (Number(nextValues.amount || 0) * defaultTaxRate).toFixed(2),
    )
  }
  form.setFieldsValue(normalizeRecordForEditor(config, nextValues))
}

function buildPreallocatedIdWarning(args: {
  isEdit: boolean
  snowflakeBusinessNoEnabled: boolean
  primaryNoKey?: string
  draftRecord: ModuleRecord
  savedRecord?: ModuleRecord
}) {
  const {
    isEdit,
    snowflakeBusinessNoEnabled,
    primaryNoKey,
    draftRecord,
    savedRecord,
  } = args

  if (isEdit || !snowflakeBusinessNoEnabled || !primaryNoKey) {
    return null
  }

  const expectedPreallocatedId = normalizeOptionalString(
    draftRecord._preallocatedId,
  )
  const expectedPrimaryNo = normalizeOptionalString(draftRecord[primaryNoKey])
  const actualPrimaryNo = savedRecord
    ? normalizeOptionalString(
        getModuleRecordPrimaryNo(savedRecord, primaryNoKey),
      )
    : ''
  const actualId = savedRecord ? normalizeOptionalString(savedRecord.id) : ''

  if (!expectedPreallocatedId) {
    return {
      title: i18next.t('modules.editorWorkspace.preallocatedNoMismatchTitle'),
      content:
        actualPrimaryNo || actualId
          ? i18next.t('modules.editorWorkspace.preallocatedNoMismatchContent', {
              primaryNo: actualPrimaryNo || actualId,
            })
          : i18next.t(
              'modules.editorWorkspace.preallocatedNoMismatchContentNoNo',
            ),
    }
  }

  const expectedIdentityNo = expectedPrimaryNo || expectedPreallocatedId
  const primaryNoMismatch =
    Boolean(actualPrimaryNo) && actualPrimaryNo !== expectedIdentityNo
  const entityIdMismatch =
    Boolean(actualId) && actualId !== expectedPreallocatedId

  if (!primaryNoMismatch && !entityIdMismatch) {
    return null
  }

  return {
    title: i18next.t('modules.editorWorkspace.preallocatedNoUpdatedTitle'),
    content: i18next.t('modules.editorWorkspace.preallocatedNoUpdatedContent', {
      expected: expectedIdentityNo,
      actual: actualPrimaryNo || actualId || '未知',
    }),
  }
}

export function useModuleEditorWorkspace({
  open,
  config,
  record,
  moduleKey,
  editorAuditTarget,
  form,
  onSaved,
  autoInsertBlankItemOnCreate,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [parentSelectorSessionKey, setParentSelectorSessionKey] = useState<
    string | null
  >(null)
  const [parentImporting, setParentImporting] = useState(false)
  const [workspaceState, setWorkspaceState] = useReducer(
    editorWorkspaceReducer,
    {
      items: [],
      primaryNoLoading: false,
    },
  )
  const { items, primaryNoLoading } = workspaceState
  const { t } = useTranslation()
  const [saveResult, setSaveResult] = useState<{
    status: 'success' | 'error' | 'warning'
    message: string
    traceId?: string
    record?: ModuleRecord
  } | null>(null)
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const isEdit = !!record
  const editorSessionKey = `${moduleKey}:${String(record?.id || 'new')}:${String(open)}`
  const parentSelectorOpen = parentSelectorSessionKey === editorSessionKey
  const { data: systemSettings = [] } = useQuery({
    queryKey: QUERY_KEYS.generalSetting,
    queryFn: listSystemSettings,
  })
  const { data: clientSettings = [] } = useQuery({
    queryKey: QUERY_KEYS.clientSettings,
    queryFn: listClientSettings,
    staleTime: 30_000,
  })
  const snowflakeBusinessNoEnabled = isDisplaySwitchEnabled(
    clientSettings,
    SNOWFLAKE_BUSINESS_NO_SWITCH_CODE,
  )

  const sumLineItemsBy = (nextItems: ModuleLineItem[], key: string) =>
    nextItems.reduce((sum, item) => sum + Number(item[key] || 0), 0)

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true

    if (record) {
      form.setFieldsValue(normalizeRecordForEditor(config, record))
      setWorkspaceState({
        items: (record.items as ModuleLineItem[]) || [],
        primaryNoLoading: false,
      })
    } else {
      form.resetFields()
      const defaultDraft: ModuleRecord = {} as ModuleRecord
      applyModuleDefaultEditorDraft(
        moduleKey,
        defaultDraft,
        getCurrentOperatorName(),
      )
      form.setFieldsValue(defaultDraft)
      const draftItems = autoInsertBlankItemOnCreate
        ? [buildDefaultEditorLineItem(undefined, moduleKey)]
        : []
      if (config.primaryNoKey) {
        setWorkspaceState({ items: draftItems, primaryNoLoading: true })
        if (snowflakeBusinessNoEnabled) {
          void allocateBusinessPrimaryNo(moduleKey)
            .then(({ generatedNo, generatedId }) => {
              if (!active) {
                return
              }
              form.setFieldsValue({
                ...defaultDraft,
                _preallocatedId: generatedId || '',
                [asString(config.primaryNoKey)]: generatedNo,
              })
            })
            .catch((err) => {
              if (!active) {
                return
              }
              message.error(
                err instanceof Error
                  ? err.message
                  : t('common.preallocateNoFailed'),
              )
            })
            .finally(() => {
              if (active) {
                setWorkspaceState({ primaryNoLoading: false })
              }
            })
        } else {
          void generateBusinessPrimaryNo(moduleKey)
            .then((generatedNo) => {
              if (!active) {
                return
              }
              form.setFieldsValue({
                ...defaultDraft,
                [asString(config.primaryNoKey)]: generatedNo,
              })
            })
            .catch((err) => {
              if (!active) {
                return
              }
              message.error(
                err instanceof Error
                  ? err.message
                  : t('common.generateNoFailed'),
              )
            })
            .finally(() => {
              if (active) {
                setWorkspaceState({ primaryNoLoading: false })
              }
            })
        }
      } else {
        setWorkspaceState({ items: draftItems, primaryNoLoading: false })
      }
    }
    return () => {
      active = false
    }
  }, [
    autoInsertBlankItemOnCreate,
    config,
    form,
    moduleKey,
    open,
    record,
    snowflakeBusinessNoEnabled,
    t,
  ])

  const handleFormValuesChange = (changedValues: FormChangedValues) => {
    if (!open) {
      return
    }
    if (!Object.keys(changedValues).length) {
      return
    }
    syncEditorFormValues({
      config,
      form,
      moduleKey,
      items,
      sumLineItemsBy,
      changedValues,
      systemSettings,
    })
  }

  const handleSave = async (audit = false) => {
    try {
      if (primaryNoLoading) {
        message.warning(t('common.primaryNoGenerating'))
        return
      }

      const values = await form.validateFields()
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
          snowflakeBusinessNoEnabled && config.primaryNoKey
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
        ...values,
        id: record?.id || '',
        _preallocatedId:
          !record && snowflakeBusinessNoEnabled
            ? asString(values._preallocatedId)
            : undefined,
        items: trimmedItems,
      }

      normalizeDraftRecordForModule({
        moduleKey,
        record: draftRecord,
        items: trimmedItems,
        primaryNoKey: config.primaryNoKey,
        currentOperatorName: getCurrentOperatorName(),
        sumLineItemsBy,
      })

      if (audit && editorAuditTarget) {
        draftRecord[editorAuditTarget.key] = editorAuditTarget.value
      }

      const savedResult = await saveBusinessModule(moduleKey, draftRecord)
      const preallocatedIdWarning = buildPreallocatedIdWarning({
        isEdit,
        snowflakeBusinessNoEnabled,
        primaryNoKey: config.primaryNoKey,
        draftRecord,
        savedRecord: savedResult.data,
      })
      await refreshModuleQueries()
      onSaved()
      if (preallocatedIdWarning) {
        setSaveResult({
          status: 'warning',
          message: preallocatedIdWarning.content,
          record: savedResult.data,
        })
      } else {
        setSaveResult({
          status: 'success',
          message: isEdit ? t('common.editSuccess') : t('common.addSuccess'),
          record: savedResult.data,
        })
      }
      setSaving(false)
    } catch (err) {
      if (isAntdFormValidationError(err)) {
        // Form 已内联展示校验错误，不重复提示
      } else if (err instanceof Error) {
        const traceId = (err as Error & { traceId?: string }).traceId
        setSaveResult({
          status: 'error',
          message: err.message || t('common.saveFailed'),
          traceId,
        })
      } else {
        setSaveResult({ status: 'error', message: t('common.saveFailedRetry') })
      }
      setSaving(false)
    }
  }

  const handleImportParentRecord = async (selectedRecords: ModuleRecord[]) => {
    const parentImportConfig = config.parentImport
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
        selectedRecords.map((selectedRecord) =>
          getBusinessModuleDetail(
            parentImportConfig.parentModuleKey,
            String(selectedRecord.id),
          ),
        ),
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
        systemSettings,
      })
      setWorkspaceState({ items: nextItems })
      setParentSelectorSessionKey(null)
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
    setParentSelectorSessionKey(editorSessionKey)
  }

  const addItem = () => {
    const newItem = buildDefaultEditorLineItem(undefined, moduleKey)
    const nextItems = [...items, newItem]
    setWorkspaceState({ items: nextItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: nextItems,
        sumLineItemsBy,
        systemSettings,
      })
    }
  }

  const updateItems: Dispatch<SetStateAction<ModuleLineItem[]>> = (
    nextItems,
  ) => {
    const resolvedItems =
      typeof nextItems === 'function' ? nextItems(items) : nextItems
    setWorkspaceState({ items: resolvedItems })
    if (open && config.itemColumns?.length) {
      syncEditorFormValues({
        config,
        form,
        moduleKey,
        items: resolvedItems,
        sumLineItemsBy,
        systemSettings,
      })
    }
  }

  return {
    addItem,
    closeParentSelector: () => setParentSelectorSessionKey(null),
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorOpen,
    primaryNoLoading,
    saveResult,
    clearSaveResult: () => setSaveResult(null),
    saving,
    setItems: updateItems,
    handleFormValuesChange,
  }
}
