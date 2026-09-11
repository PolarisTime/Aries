import { useNavigate } from '@tanstack/react-router'
import { createElement, useCallback, useRef, useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { findServerFilteredBusinessModuleRow } from '@/api/business/business-listing'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import { useDetailSupport } from '@/hooks/useDetailSupport'
import { useRequestError } from '@/hooks/useRequestError'
import { getBehaviorValue } from '@/module-system/behavior/module-behavior-registry'
import type { ModuleKey } from '@/module-system/core/module-key'
import { isDeletedModuleRecord } from '@/module-system/record/module-record-deletion'
import {
  hasModuleRecordItems,
  readModuleRecordField,
} from '@/module-system/record/module-record-fields'
import { isMainFlowModuleKey } from '@/shared/schemas/module-record'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
  ModuleRecord,
} from '@/types/module-page'
import type {
  ModuleListRecordFor,
  PersistedModuleEditorDraftFor,
} from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import { ModuleRecordDetailInline } from '@/views/modules/components/ModuleRecordDetailInline'
import {
  toEditorDraft,
  toLegacyEditorDraft,
} from '@/views/modules/module-editor-draft-adapter'

interface Props {
  moduleKey: ModuleKey
  config: ModulePageConfig | undefined
  resolvedConfig: ModulePageConfig
}

interface OpenEditorOptions {
  parentImportSource?: ModuleParentImportSource | null
  initialValues?: Record<string, unknown>
}

interface ResolveEditorRecordOptions {
  moduleKey: ModuleKey
  record: ModuleListRecordFor<ModuleKey>
  requiresDetailFetch: boolean
}

function resolveEditorRecord(
  options: ResolveEditorRecordOptions,
): Promise<PersistedModuleEditorDraftFor<ModuleKey>>
async function resolveEditorRecord({
  moduleKey,
  record,
  requiresDetailFetch,
}: ResolveEditorRecordOptions): Promise<object> {
  if (isMainFlowModuleKey(moduleKey)) {
    const detail = await getBusinessModuleDetail(moduleKey, String(record.id))
    return toEditorDraft(moduleKey, detail)
  }

  const endpointConfig = getModuleConfig(moduleKey)
  if (
    endpointConfig.readOnly ||
    !requiresDetailFetch ||
    hasModuleRecordItems(record)
  ) {
    return toLegacyEditorDraft(record)
  }

  const recordId = String(record.id || '')
  if (!recordId) {
    return toLegacyEditorDraft(record)
  }

  const detail = await getBusinessModuleDetail(moduleKey, recordId)
  return toLegacyEditorDraft(detail)
}

export function useBusinessGridEditor({
  moduleKey,
  config,
  resolvedConfig,
}: Props) {
  const { showError } = useRequestError()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const [editRecord, setEditRecord] =
    useState<PersistedModuleEditorDraftFor<ModuleKey> | null>(null)
  const [initialParentImportSource, setInitialParentImportSource] =
    useState<ModuleParentImportSource | null>(null)
  const [initialEditorValues, setInitialEditorValues] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [editorLockRelatedRows, setEditorLockRelatedRows] = useState<
    ModuleListRecordFor<ModuleKey>[]
  >([])
  const [editorLockLoading, setEditorLockLoading] = useState(false)
  const openVersionRef = useRef(0)

  const [attachOpen, setAttachOpen] = useState(false)
  const [attachRecordId, setAttachRecordId] = useState('')
  const openAttachment = (record: ModuleRecord) => {
    setAttachRecordId(String(record.id || ''))
    setAttachOpen(true)
  }
  const closeAttachment = () => {
    setAttachOpen(false)
    setAttachRecordId('')
  }

  const lineItemLockSourceModule = getBehaviorValue(
    moduleKey,
    'lineItemLockSourceModule',
  )
  const lineItemLockSourceField = String(
    getBehaviorValue(moduleKey, 'lineItemLockSourceField') || '',
  )
  const lineItemLockTargetField = String(
    getBehaviorValue(moduleKey, 'lineItemLockTargetField') || '',
  )
  const requiresDetailFetch = Boolean(resolvedConfig.itemColumns?.length)

  const resolveEditorLockRelatedRows = async (
    record: ModuleListRecordFor<ModuleKey> | null,
  ) => {
    if (
      !record ||
      !lineItemLockSourceModule ||
      !lineItemLockSourceField ||
      !lineItemLockTargetField
    ) {
      return []
    }
    const targetValue = asString(
      readModuleRecordField(record, lineItemLockTargetField),
    ).trim()
    if (!targetValue) {
      return []
    }
    const lockStatuses =
      getBehaviorValue(moduleKey, 'lineItemLockStatuses') || []
    const rows = await Promise.all(
      lockStatuses.map((status) =>
        findServerFilteredBusinessModuleRow(
          lineItemLockSourceModule,
          { keyword: targetValue, status },
          lineItemLockSourceField,
          targetValue,
        ),
      ),
    )
    return rows.filter((row): row is ModuleListRecordFor<ModuleKey> =>
      Boolean(row && !isDeletedModuleRecord(row)),
    )
  }

  const openEditor = async (
    record: ModuleListRecordFor<ModuleKey> | null,
    options: OpenEditorOptions = {},
  ) => {
    if (!record && resolvedConfig.allowManualCreate === false) {
      return
    }
    if (!record) {
      openVersionRef.current += 1
      setEditorLockRelatedRows([])
      setEditRecord(null)
      setInitialParentImportSource(options.parentImportSource || null)
      setInitialEditorValues(options.initialValues || null)
      setEditorSessionKey((current) => current + 1)
      setEditorOpen(true)
      setEditorLockLoading(false)
      return
    }

    const version = ++openVersionRef.current
    setInitialParentImportSource(null)
    setInitialEditorValues(null)
    setEditorLockLoading(true)
    try {
      const [lockRelatedRows, resolvedRecord] = await Promise.all([
        resolveEditorLockRelatedRows(record),
        resolveEditorRecord({ moduleKey, record, requiresDetailFetch }),
      ])
      if (version !== openVersionRef.current) {
        return
      }
      setEditorLockRelatedRows(lockRelatedRows)
      setEditRecord(resolvedRecord)
      setEditorSessionKey((current) => current + 1)
      setEditorOpen(true)
    } catch (error) {
      if (version === openVersionRef.current) {
        showError(error)
      }
      return
    } finally {
      setEditorLockLoading((current) =>
        version === openVersionRef.current ? false : current,
      )
    }
  }

  const closeEditor = useCallback(() => {
    openVersionRef.current += 1
    setEditorOpen(false)
    setEditRecord(null)
    setInitialParentImportSource(null)
    setEditorLockRelatedRows([])
    setEditorLockLoading(false)
  }, [])

  const handleSaved = () => {
    setEditorLockRelatedRows([])
    setInitialParentImportSource(null)
  }

  const {
    detailItems,
    openDetail,
    retryDetail,
    closeDetail,
    inlineDetailItems,
    inlineExpandedRowKeys,
    openInlineDetail,
    closeInlineDetail,
    retryInlineDetail,
  } = useDetailSupport({ moduleKey, config: resolvedConfig })

  const navigate = useNavigate()
  const detailRoutePath = getBehaviorValue(moduleKey, 'detailRoutePath')

  const navigateToDetailRoute = (routePath: string, record: ModuleRecord) => {
    const path = routePath.replace(':projectId', String(record.projectId))
    void navigate({ to: path })
  }

  const shouldUseDetailAction = Boolean(
    detailRoutePath ||
      config?.detailActionLabel ||
      (config?.readOnly && config.detailFields.length > 0),
  )
  const shouldUseInlineDetail = Boolean(
    resolvedConfig.itemColumns?.length ||
      resolvedConfig.detailItemColumns?.length ||
      resolvedConfig.detailFields.length,
  )
  const toggleInlineDetail = (record: ModuleRecord) => {
    const recordId = String(record.id || '')
    if (inlineExpandedRowKeys.includes(recordId)) {
      closeInlineDetail(recordId)
      return
    }
    void openInlineDetail(record)
  }
  const handleInlineExpand = (expanded: boolean, record: ModuleRecord) => {
    const recordId = String(record.id || '')
    if (expanded) {
      if (!inlineExpandedRowKeys.includes(recordId)) {
        void openInlineDetail(record)
      }
    } else {
      closeInlineDetail(recordId)
    }
  }
  const renderInlineDetail = (record: ModuleRecord) => {
    const recordId = String(record.id || '')
    const detailItem = inlineDetailItems.find(
      (item) => item.recordId === recordId,
    )
    return createElement(ModuleRecordDetailInline, {
      config: resolvedConfig,
      record: detailItem?.record ?? null,
      loading: detailItem?.loading ?? false,
      error: detailItem?.error ?? null,
      onRetry: () => retryInlineDetail(recordId),
    })
  }

  const recordDetailAction: ((record: ModuleRecord) => void) | undefined =
    shouldUseDetailAction
      ? detailRoutePath
        ? (record) => navigateToDetailRoute(detailRoutePath, record)
        : shouldUseInlineDetail
          ? toggleInlineDetail
          : openDetail
      : undefined
  const openGridDetail = shouldUseInlineDetail
    ? toggleInlineDetail
    : (record: ModuleRecord) => {
        void openDetail(record)
      }

  return {
    shouldUseDetailAction,
    editRecord,
    editorSessionKey,
    initialParentImportSource,
    initialEditorValues,
    editorLockLoading,
    editorLockRelatedRows,
    editorOpen,
    openEditor,
    closeEditor,
    handleEditorSaved: handleSaved,
    overlays: {
      attachOpen,
      attachRecordId,
      openAttachment,
      closeAttachment,
    },
    detailItems,
    openDetail,
    retryDetail,
    closeDetail,
    inlineExpandedRowKeys,
    retryInlineDetail,
    toggleInlineDetail,
    handleInlineExpand,
    shouldUseInlineDetail,
    renderInlineDetail,
    recordDetailAction,
    openGridDetail,
  }
}
