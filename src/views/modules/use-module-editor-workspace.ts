import dayjs from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { getBusinessModuleDetail, saveBusinessModule } from '@/api/business'
import { listSystemSettings } from '@/api/system-settings'
import { useModuleQueryRefresh } from '@/hooks/useModuleQueryRefresh'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecord,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { cloneLineItems } from '@/utils/clone-utils'
import { getStoredUser } from '@/utils/storage'
import { resolveDefaultTaxRateValue } from '@/views/system/general-settings-view-utils'
import {
  applyModuleDefaultEditorDraft,
  buildDefaultEditorLineItem,
  getEditorValidationMessage,
  normalizeDraftRecordForModule,
  syncDerivedEditorFormValuesForModule,
  trimEditorItemsForModule,
} from '@/views/modules/module-adapter-editor'
import { buildParentImportState } from '@/views/modules/module-adapter-parent-import'
import {
  getModuleRecordPrimaryNo,
  parseParentRelationNos,
} from '@/views/modules/module-adapter-shared'

interface AuditTarget {
  key: string
  value: string
}

interface WorkspaceFormApi {
  validateFields: () => Promise<Record<string, unknown>>
  getFieldsValue: (all?: boolean) => Record<string, unknown>
  setFieldsValue: (values: Record<string, unknown>) => void
  resetFields: () => void
}

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

    const parsed = dayjs(String(rawValue))
    normalized[field.key] = parsed.isValid() ? parsed : undefined
  }

  return normalized
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
  const [parentSelectorOpen, setParentSelectorOpen] = useState(false)
  const [parentImporting, setParentImporting] = useState(false)
  const [items, setItems] = useState<ModuleLineItem[]>([])
  const { refreshModuleQueries } = useModuleQueryRefresh(moduleKey)
  const isEdit = !!record
  const { data: systemSettings = [] } = useQuery({
    queryKey: ['general-setting'],
    queryFn: listSystemSettings,
  })

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

    if (record) {
      form.setFieldsValue(normalizeRecordForEditor(config, record))
      setItems((record.items as ModuleLineItem[]) || [])
    } else {
      form.resetFields()
      const defaultDraft: Record<string, unknown> = {}
      applyModuleDefaultEditorDraft(
        moduleKey,
        defaultDraft,
        getCurrentOperatorName(),
      )
      form.setFieldsValue(defaultDraft)
      setItems(
        autoInsertBlankItemOnCreate ? [buildDefaultEditorLineItem()] : [],
      )
    }
    setParentSelectorOpen(false)
  }, [
    autoInsertBlankItemOnCreate,
    config,
    form,
    getCurrentOperatorName,
    moduleKey,
    open,
    record,
  ])

  useEffect(() => {
    if (!open || !config.itemColumns?.length) {
      return
    }

    const currentValues = form.getFieldsValue(true) as ModuleRecord
    const nextValues = syncDerivedEditorFormValuesForModule({
      moduleKey,
      record: { ...currentValues },
      items,
      sumLineItemsBy,
    })
    if (moduleKey === 'invoice-receipt' || moduleKey === 'invoice-issue') {
      const defaultTaxRate = resolveDefaultTaxRateValue(systemSettings)
      nextValues.taxRate = defaultTaxRate
      nextValues.taxAmount = Number(
        (Number(nextValues.amount || 0) * defaultTaxRate).toFixed(2),
      )
    }
    form.setFieldsValue(normalizeRecordForEditor(config, nextValues))
  }, [config, form, items, moduleKey, open, sumLineItemsBy, systemSettings])

  const handleSave = useCallback(
    async (audit = false) => {
      try {
        const values = await form.validateFields()
        const trimmedItems = trimEditorItemsForModule(moduleKey, items)
        const validationMessage = getEditorValidationMessage({
          moduleKey,
          fields: config.formFields || [],
          editorForm: values,
          hasItemColumns: Boolean(config.itemColumns?.length),
          itemColumns: config.itemColumns,
          items: trimmedItems,
          itemCount: trimmedItems.length,
          parentImportConfig: config.parentImport,
          occupiedParentMap: {},
          getPrimaryNo: (candidate) =>
            getModuleRecordPrimaryNo(candidate, config.primaryNoKey),
        })
        if (validationMessage) {
          message.warning(validationMessage)
          return
        }

        setSaving(true)
        const draftRecord: ModuleRecord = {
          ...values,
          id: record?.id || '',
          items: trimmedItems,
        }

        normalizeDraftRecordForModule({
          moduleKey,
          record: draftRecord,
          items: trimmedItems,
          primaryNoKey: config.primaryNoKey,
          generatePrimaryNo: () => `TEMP-${Date.now()}`,
          currentOperatorName: getCurrentOperatorName(),
          sumLineItemsBy,
        })

        if (audit && editorAuditTarget) {
          draftRecord[editorAuditTarget.key] = editorAuditTarget.value
        }

        await saveBusinessModule(moduleKey, draftRecord)
        message.success(isEdit ? '更新成功' : '创建成功')
        await refreshModuleQueries()
        onSaved()
        onClose()
      } catch (err) {
        if (err instanceof Error) {
          message.error(err.message || '保存失败')
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
      onClose,
      onSaved,
      record,
      refreshModuleQueries,
      sumLineItemsBy,
    ],
  )

  const handleImportParentRecord = useCallback(
    async (selectedRecord: ModuleRecord) => {
      const parentImportConfig = config.parentImport
      if (!parentImportConfig) {
        return
      }

      setParentImporting(true)
      try {
        const parentDetail = await getBusinessModuleDetail(
          parentImportConfig.parentModuleKey,
          String(selectedRecord.id),
        )
        const parentRecord = parentDetail.data
        const currentValues = form.getFieldsValue(true) as ModuleRecord
        const currentParentNos = parseParentRelationNos(
          currentValues[parentImportConfig.parentFieldKey],
        )
        const importState = buildParentImportState({
          parentImportConfig,
          parentRecord,
          currentParentNos,
          currentItems: items,
          cloneLineItems,
        })

        const nextValues: ModuleRecord = {
          ...currentValues,
          [parentImportConfig.parentFieldKey]: importState.parentNosText,
        }
        if (importState.shouldApplyMappedValues) {
          Object.assign(nextValues, importState.mappedValues)
        }

        form.setFieldsValue(normalizeRecordForEditor(config, nextValues))
        setItems(importState.nextItems)
        setParentSelectorOpen(false)
        message.success(
          `已导入 ${importState.parentNo} 的 ${importState.importedItemCount} 条明细`,
        )
      } catch (err) {
        message.error(err instanceof Error ? err.message : '导入上级单据失败')
      } finally {
        setParentImporting(false)
      }
    },
    [config, form, items],
  )

  const addItem = useCallback(() => {
    const newItem = buildDefaultEditorLineItem()
    setItems((prev) => [...prev, newItem])
  }, [])

  return {
    addItem,
    closeParentSelector: useCallback(() => setParentSelectorOpen(false), []),
    handleImportParentRecord,
    handleSave,
    isEdit,
    items,
    openParentSelector: useCallback(() => setParentSelectorOpen(true), []),
    parentImporting,
    parentSelectorOpen,
    saving,
    setItems,
  }
}
