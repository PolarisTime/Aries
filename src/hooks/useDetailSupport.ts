import { useState, useCallback } from 'react'
import { getBusinessModuleDetail } from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'

export function useDetailSupport(moduleKey: string) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<ModuleRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetail = useCallback(async (recordId: string) => {
    setDetailLoading(true)
    setDetailOpen(true)
    try {
      const record = await getBusinessModuleDetail(moduleKey, recordId)
      setDetailRecord(record.data)
    } catch {
      setDetailRecord(null)
    } finally { setDetailLoading(false) }
  }, [moduleKey])

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailRecord(null)
  }, [])

  return { detailOpen, detailRecord, detailLoading, openDetail, closeDetail }
}
