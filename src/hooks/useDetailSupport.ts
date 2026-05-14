import { useCallback, useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Options {
  moduleKey: string
  config?: ModulePageConfig
}

export function useDetailSupport({ moduleKey, config }: Options) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<ModuleRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const openDetail = useCallback(
    async (target: string | ModuleRecord) => {
      const fallbackRecord = typeof target === 'string' ? null : target
      const recordId =
        typeof target === 'string' ? target : String(target.id || '')
      const endpointConfig = getModuleConfig(moduleKey)
      const requiresDetailFetch = Boolean(config?.itemColumns?.length)

      setDetailOpen(true)
      setDetailRecord(fallbackRecord)

      if (!recordId || endpointConfig.readOnly) {
        setDetailLoading(false)
        return
      }

      if (
        fallbackRecord &&
        (!requiresDetailFetch ||
          (Array.isArray(fallbackRecord.items) && fallbackRecord.items.length))
      ) {
        setDetailLoading(false)
        return
      }

      setDetailLoading(true)
      try {
        const record = await getBusinessModuleDetail(moduleKey, recordId)
        setDetailRecord(record.data)
      } catch {
        setDetailRecord(fallbackRecord)
      } finally {
        setDetailLoading(false)
      }
    },
    [config?.itemColumns, moduleKey],
  )

  const closeDetail = useCallback(() => {
    setDetailOpen(false)
    setDetailRecord(null)
  }, [])

  return { detailOpen, detailRecord, detailLoading, openDetail, closeDetail }
}
