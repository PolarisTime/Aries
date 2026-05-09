import { useCallback, useMemo, useState } from 'react'
import { getBusinessModuleDetail, listAllBusinessModuleRows } from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import type { ModuleRecord } from '@/types/module-page'
import type { ModulePageConfig } from '@/types/module-page'
import { getBehaviorValue } from '@/views/modules/module-behavior-registry'

interface Props {
  moduleKey: string
  config: ModulePageConfig
}

export function useBusinessGridEditor({ moduleKey, config }: Props) {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editRecord, setEditRecord] = useState<ModuleRecord | null>(null)
  const [editorLockRelatedRows, setEditorLockRelatedRows] = useState<
    ModuleRecord[]
  >([])
  const [editorLockLoading, setEditorLockLoading] = useState(false)

  const lineItemLockSourceModule = useMemo(
    () => String(getBehaviorValue(moduleKey, 'lineItemLockSourceModule') || ''),
    [moduleKey],
  )
  const lineItemLockSourceField = useMemo(
    () => String(getBehaviorValue(moduleKey, 'lineItemLockSourceField') || ''),
    [moduleKey],
  )
  const lineItemLockTargetField = useMemo(
    () => String(getBehaviorValue(moduleKey, 'lineItemLockTargetField') || ''),
    [moduleKey],
  )
  const requiresDetailFetch = Boolean(config.itemColumns?.length)

  const resolveEditorLockRelatedRows = useCallback(
    async (record: ModuleRecord | null) => {
      if (
        !record ||
        !lineItemLockSourceModule ||
        !lineItemLockSourceField ||
        !lineItemLockTargetField
      ) {
        return []
      }
      const targetValue = String(record[lineItemLockTargetField] || '').trim()
      if (!targetValue) {
        return []
      }
      return listAllBusinessModuleRows(lineItemLockSourceModule, {
        [lineItemLockSourceField]: targetValue,
      })
    },
    [
      lineItemLockSourceField,
      lineItemLockSourceModule,
      lineItemLockTargetField,
    ],
  )

  const resolveEditorRecord = useCallback(
    async (record: ModuleRecord | null) => {
      if (!record) {
        return null
      }

      const endpointConfig = getModuleConfig(moduleKey)
      if (endpointConfig.readOnly) {
        return record
      }

      if (
        !requiresDetailFetch ||
        (Array.isArray(record.items) && record.items.length > 0)
      ) {
        return record
      }

      const recordId = String(record.id || '')
      if (!recordId) {
        return record
      }

      const detail = await getBusinessModuleDetail(moduleKey, recordId)
      return detail.data
    },
    [moduleKey, requiresDetailFetch],
  )

  const openEditor = useCallback(
    async (record: ModuleRecord | null) => {
      setEditorLockLoading(true)
      try {
        const lockRelatedRows = await resolveEditorLockRelatedRows(record)
        const resolvedRecord = await resolveEditorRecord(record)
        setEditorLockRelatedRows(lockRelatedRows)
        setEditRecord(resolvedRecord)
        setEditorOpen(true)
      } finally {
        setEditorLockLoading(false)
      }
    },
    [resolveEditorLockRelatedRows, resolveEditorRecord],
  )

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setEditRecord(null)
    setEditorLockRelatedRows([])
  }, [])

  const handleSaved = useCallback(() => {
    setEditorLockRelatedRows([])
  }, [])

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
