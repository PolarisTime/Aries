import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QUERY_KEYS } from '@/constants/query-keys'
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
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import { cloneLineItems } from '@/utils/clone-utils'
import { getStoredUser } from '@/utils/storage'
import { asString } from '@/utils/type-narrowing'
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
import { resolveDefaultTaxRateValue } from '@/views/system/general-settings-view-utils'

interface AuditTarget {
  key: string
  value: string
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

function normalizeOptionalString(value: unknown) {
  return asString(value).trim()
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
  useSnowflakeBusinessNo: boolean
  primaryNoKey?: string
  draftRecord: ModuleRecord
  savedRecord?: ModuleRecord
}) {
  const {
    isEdit,
    useSnowflakeBusinessNo,
    primaryNoKey,
    draftRecord,
    savedRecord,
  } = args

  if (isEdit || !useSnowflakeBusinessNo || !primaryNoKey) {
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
      title: '单据已保存，系统已重新生成单号',
      content:
        actualPrimaryNo || actualId
          ? `这张单据已经保存成功，但系统未使用当前页面显示的预生成单号，已自动改为实际单号：${actualPrimaryNo || actualId}。请以实际保存后的单号为准。`
          : '这张单据已经保存成功，但系统未使用当前页面显示的预生成单号，已自动改为新的实际单号。请以保存结果为准。',
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
    title: '单据已保存，实际单号已更新',
    content: `当前页面预生成的单号是 ${expectedIdentityNo}，但系统最终保存的实际单号是 ${actualPrimaryNo || actualId || '未知'}。请以实际保存后的单号为准。`,
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
  const [primaryNoLoading, setPrimaryNoLoading] = useState(false)
  const [parentSelectorOpen, setParentSelectorOpen] = useState(false)
  const [parentImporting, setParentImporting] = useState(false)
  const [items, setItems] = useState<ModuleLineItem[]>([])
  const { t } = useTranslation()
  const [saveResult, setSaveResult] = useState<{
    status: 'success' | 'error' | 'warning'
    message: string
    traceId?: string
    record?: ModuleRecord
  } | null>(null)
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const isEdit = !!record
  const { data: systemSettings = [] } = useQuery({
    queryKey: QUERY_KEYS.generalSetting,
    queryFn: listSystemSettings,
  })
  const { data: clientSettings = [] } = useQuery({
    queryKey: QUERY_KEYS.clientSettings,
    queryFn: listClientSettings,
    staleTime: 30_000,
  })
  const useSnowflakeBusinessNo = isDisplaySwitchEnabled(
    clientSettings,
    DISPLAY_SWITCH_CODES.useSnowflakeBusinessNo,
  )

  const sumLineItemsBy = useCallback(
    (nextItems: ModuleLineItem[], key: string) =>
      nextItems.reduce((sum, item) => sum + Number(item[key] || 0), 0),
    [],
  )

  const getCurrentOperatorName = useCallback(() => {
    const user = getStoredUser()
    if (user) {
      return String(user.userName || user.loginName || '当前用户')
    }
    return '当前用户'
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    let active = true

    if (record) {
      form.setFieldsValue(normalizeRecordForEditor(config, record))
      setItems((record.items as ModuleLineItem[]) || [])
      setPrimaryNoLoading(false)
    } else {
      form.resetFields()
      const defaultDraft: ModuleRecord = {} as ModuleRecord
      applyModuleDefaultEditorDraft(
        moduleKey,
        defaultDraft,
        getCurrentOperatorName(),
      )
      form.setFieldsValue(defaultDraft)
      setItems(
        autoInsertBlankItemOnCreate
          ? [buildDefaultEditorLineItem(undefined, moduleKey)]
          : [],
      )
      if (config.primaryNoKey) {
        setPrimaryNoLoading(true)
        if (useSnowflakeBusinessNo) {
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
                err instanceof Error ? err.message : t('common.preallocateNoFailed'),
              )
            })
            .finally(() => {
              if (active) {
                setPrimaryNoLoading(false)
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
                err instanceof Error ? err.message : t('common.generateNoFailed'),
              )
            })
            .finally(() => {
              if (active) {
                setPrimaryNoLoading(false)
              }
            })
        }
      } else {
        setPrimaryNoLoading(false)
      }
    }
    setParentSelectorOpen(false)

    return () => {
      active = false
    }
  }, [
    autoInsertBlankItemOnCreate,
    config,
    form,
    getCurrentOperatorName,
    moduleKey,
    open,
    record,
    useSnowflakeBusinessNo,
  ])

  useEffect(() => {
    if (!open || !config.itemColumns?.length) {
      return
    }
    syncEditorFormValues({
      config,
      form,
      moduleKey,
      items,
      sumLineItemsBy,
      systemSettings,
    })
  }, [config, form, items, moduleKey, open, sumLineItemsBy, systemSettings])

  const handleFormValuesChange = useCallback(
    (changedValues: FormChangedValues) => {
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
    },
    [config, form, items, moduleKey, open, sumLineItemsBy, systemSettings],
  )

  const handleSave = useCallback(
    async (audit = false) => {
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
            useSnowflakeBusinessNo && config.primaryNoKey
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
            !record && useSnowflakeBusinessNo
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
          useSnowflakeBusinessNo,
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
      } finally {
        setSaving(false)
      }
    },
    [
      config,
      editorAuditTarget,
      form,
      getCurrentOperatorName,
      isEdit,
      items,
      moduleKey,

      onSaved,
      primaryNoLoading,
      record,
      refreshModuleQueries,
      sumLineItemsBy,
      useSnowflakeBusinessNo,
    ],
  )

  const handleImportParentRecord = useCallback(
    async (selectedRecords: ModuleRecord[]) => {
      const parentImportConfig = config.parentImport
      if (!parentImportConfig) {
        return
      }
      if (!selectedRecords.length) {
        message.warning(t('common.pleaseSelectWith', { label: parentImportConfig.label }))
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
            throw new Error(validationError)
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

        syncEditorFormValues({
          config,
          form,
          moduleKey,
          items: nextItems,
          sumLineItemsBy,
          changedValues: nextValues,
          systemSettings,
        })
        setItems(nextItems)
        setParentSelectorOpen(false)
        message.success(
          importedParentCount > 1
            ? t('common.importParentSuccess', { parentCount: importedParentCount, itemCount: importedItemCount })
            : t('common.importParentSuccessSimple', { itemCount: importedItemCount }),
        )
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('common.importParentFailed'))
      } finally {
        setParentImporting(false)
      }
    },
    [config, form, items, systemSettings, sumLineItemsBy, moduleKey],
  )

  const openParentSelector = useCallback(() => {
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
    setParentSelectorOpen(true)
  }, [config.parentImport, form])

  const addItem = useCallback(() => {
    const newItem = buildDefaultEditorLineItem(undefined, moduleKey)
    setItems((prev) => [...prev, newItem])
  }, [moduleKey])

  return {
    addItem,
    closeParentSelector: useCallback(() => setParentSelectorOpen(false), []),
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector,
    parentImporting,
    parentSelectorOpen,
    primaryNoLoading,
    saveResult,
    clearSaveResult: useCallback(() => setSaveResult(null), []),
    saving,
    setItems,
    handleFormValuesChange,
  }
}
