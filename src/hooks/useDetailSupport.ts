import { useState } from 'react'
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

  const openDetail = async (target: string | ModuleRecord) => {
    const fallbackRecord = typeof target === 'string' ? null : target
    const recordId =
      typeof target === 'string' ? target : String(target.id || '')
    const endpointConfig = getModuleConfig(moduleKey)
    const requiresDetailFetch = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )

    setDetailOpen(true)
    setDetailRecord(fallbackRecord)

    if (!recordId || (endpointConfig.readOnly && !endpointConfig.supportsDetail)) {
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
      setDetailLoading(false)
    } catch {
      setDetailRecord(fallbackRecord)
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailOpen(false)
    setDetailRecord(null)
  }

  return { detailOpen, detailRecord, detailLoading, openDetail, closeDetail }
}
