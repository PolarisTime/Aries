import { useRef, useState } from 'react'
import {
  getBusinessModuleDetail,
  listAllBusinessModuleRows,
} from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import { getBehaviorValue } from '@/module-system/module-behavior-registry'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

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
  const openVersionRef = useRef(0)

  const lineItemLockSourceModule = String(
    getBehaviorValue(moduleKey, 'lineItemLockSourceModule') || '',
  )
  const lineItemLockSourceField = String(
    getBehaviorValue(moduleKey, 'lineItemLockSourceField') || '',
  )
  const lineItemLockTargetField = String(
    getBehaviorValue(moduleKey, 'lineItemLockTargetField') || '',
  )
  const requiresDetailFetch = Boolean(config.itemColumns?.length)

  const resolveEditorLockRelatedRows = async (record: ModuleRecord | null) => {
    if (
      !record ||
      !lineItemLockSourceModule ||
      !lineItemLockSourceField ||
      !lineItemLockTargetField
    ) {
      return []
    }
    const targetValue = asString(record[lineItemLockTargetField]).trim()
    if (!targetValue) {
      return []
    }
    return listAllBusinessModuleRows(lineItemLockSourceModule, {
      [lineItemLockSourceField]: targetValue,
    })
  }

  const resolveEditorRecord = async (record: ModuleRecord | null) => {
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
  }

  const openEditor = async (record: ModuleRecord | null) => {
    const version = ++openVersionRef.current
    setEditorLockLoading(true)
    return Promise.all([
      resolveEditorLockRelatedRows(record),
      resolveEditorRecord(record),
    ])
      .then(([lockRelatedRows, resolvedRecord]) => {
        if (version !== openVersionRef.current) {
          return
        }
        setEditorLockRelatedRows(lockRelatedRows)
        setEditRecord(resolvedRecord)
        setEditorOpen(true)
      })
      .catch((error: unknown) => {
        throw error
      })
      .then(() => {
        if (version === openVersionRef.current) {
          setEditorLockLoading(false)
        }
      })
  }

  const closeEditor = () => {
    setEditorOpen(false)
    setEditRecord(null)
    setEditorLockRelatedRows([])
  }

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
