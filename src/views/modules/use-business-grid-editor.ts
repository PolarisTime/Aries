import { useCallback, useRef, useState } from 'react'
import {
  findServerFilteredBusinessModuleRow,
  getBusinessModuleDetail,
} from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import { useRequestError } from '@/hooks/useRequestError'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import type { ModuleKey } from '@/module-system/module-key'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import {
  hasModuleRecordItems,
  readModuleRecordField,
} from '@/module-system/module-record-fields'
import { isMainFlowModuleKey } from '@/shared/schemas/module-record'
import type { ModulePageConfig } from '@/types/module-page'
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
  editorLockLoading: boolean
  editorLockRelatedRows: ModuleListRecordFor<ModuleKey>[]
  editorOpen: boolean
  openEditor: (record: ModuleListRecordFor<Key> | null) => Promise<void>
  closeEditor: () => void
  handleSaved: () => void
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
    return toEditorDraft(moduleKey, detail.data)
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
  return toLegacyEditorDraft(detail.data)
}

export function useBusinessGridEditor<Key extends ModuleKey>({
  moduleKey,
  config,
}: Props<Key>): BusinessGridEditorResult<Key> {
  const { showError } = useRequestError()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editRecord, setEditRecord] =
    useState<PersistedModuleEditorDraftFor<Key> | null>(null)
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

  const openEditor = async (record: ModuleListRecordFor<Key> | null) => {
    if (!record && config.allowManualCreate === false) {
      return
    }
    if (!record) {
      openVersionRef.current += 1
      setEditorLockRelatedRows([])
      setEditRecord(null)
      setEditorOpen(true)
      setEditorLockLoading(false)
      return
    }

    const version = ++openVersionRef.current
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
    setEditorLockRelatedRows([])
    setEditorLockLoading(false)
  }, [])

  const handleSaved = () => {
    setEditorLockRelatedRows([])
  }

  return {
    editRecord,
    editorLockLoading,
    editorLockRelatedRows,
    editorOpen,
    openEditor,
    closeEditor,
    handleSaved,
  }
}
