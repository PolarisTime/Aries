import { useCallback, useRef, useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { findServerFilteredBusinessModuleRow } from '@/api/business/business-listing'
import { getModuleConfig } from '@/api/contracts/module-contracts'
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
} from '@/types/module-page'
import type {
  ModuleListRecordFor,
  PersistedModuleEditorDraftFor,
} from '@/types/module-record'
import { asString } from '@/utils/type-narrowing'
import {
  toEditorDraft,
  toLegacyEditorDraft,
} from '@/views/modules/module-editor-draft-adapter'

interface Props<Key extends ModuleKey> {
  moduleKey: Key
  config: ModulePageConfig
}

interface BusinessGridEditorResult<Key extends ModuleKey> {
  editRecord: PersistedModuleEditorDraftFor<Key> | null
  editorSessionKey: number
  initialParentImportSource: ModuleParentImportSource | null
  initialEditorValues: Record<string, unknown> | null
  editorLockLoading: boolean
  editorLockRelatedRows: ModuleListRecordFor<ModuleKey>[]
  editorOpen: boolean
  openEditor: (
    record: ModuleListRecordFor<Key> | null,
    options?: OpenEditorOptions,
  ) => Promise<void>
  closeEditor: () => void
  handleSaved: () => void
}

interface OpenEditorOptions {
  parentImportSource?: ModuleParentImportSource | null
  initialValues?: Record<string, unknown>
}

interface ResolveEditorRecordOptions<Key extends ModuleKey> {
  moduleKey: Key
  record: ModuleListRecordFor<Key>
  requiresDetailFetch: boolean
}

function resolveEditorRecord<Key extends ModuleKey>(
  options: ResolveEditorRecordOptions<Key>,
): Promise<PersistedModuleEditorDraftFor<Key>>
async function resolveEditorRecord({
  moduleKey,
  record,
  requiresDetailFetch,
}: ResolveEditorRecordOptions<ModuleKey>): Promise<object> {
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

export function useBusinessGridEditor<Key extends ModuleKey>({
  moduleKey,
  config,
}: Props<Key>): BusinessGridEditorResult<Key> {
  const { showError } = useRequestError()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const [editRecord, setEditRecord] =
    useState<PersistedModuleEditorDraftFor<Key> | null>(null)
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
  const requiresDetailFetch = Boolean(config.itemColumns?.length)

  const resolveEditorLockRelatedRows = async (
    record: ModuleListRecordFor<Key> | null,
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
    record: ModuleListRecordFor<Key> | null,
    options: OpenEditorOptions = {},
  ) => {
    if (!record && config.allowManualCreate === false) {
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
      if (version === openVersionRef.current) {
        setEditorLockLoading(false)
      }
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

  return {
    editRecord,
    editorSessionKey,
    initialParentImportSource,
    initialEditorValues,
    editorLockLoading,
    editorLockRelatedRows,
    editorOpen,
    openEditor,
    closeEditor,
    handleSaved,
  }
}
