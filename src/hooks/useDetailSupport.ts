import { useRef, useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business'
import { getModuleConfig } from '@/api/module-contracts'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'

interface Options {
  moduleKey: string
  config?: ModulePageConfig
}

interface DetailRequest {
  recordId: string
}

export function useDetailSupport({ moduleKey, config }: Options) {
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<ModuleRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<unknown>(null)
  const requestVersionRef = useRef(0)
  const lastRequestRef = useRef<DetailRequest | null>(null)

  const loadDetail = async (request: DetailRequest) => {
    const requestVersion = ++requestVersionRef.current
    setDetailLoading(true)
    setDetailError(null)
    setDetailRecord(null)
    try {
      const record = await getBusinessModuleDetail(moduleKey, request.recordId)
      if (requestVersion === requestVersionRef.current) {
        setDetailRecord(record.data)
      }
    } catch (error) {
      if (requestVersion === requestVersionRef.current) {
        setDetailRecord(null)
        setDetailError(error)
      }
    } finally {
      if (requestVersion === requestVersionRef.current) {
        setDetailLoading(false)
      }
    }
  }

  const openDetail = async (target: string | ModuleRecord) => {
    requestVersionRef.current += 1
    const fallbackRecord = typeof target === 'string' ? null : target
    const recordId =
      typeof target === 'string' ? target : String(target.id || '')
    const endpointConfig = getModuleConfig(moduleKey)
    const requiresDetailFetch = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )

    setDetailOpen(true)
    setDetailRecord(fallbackRecord)
    setDetailError(null)
    lastRequestRef.current = null

    if (
      !recordId ||
      (endpointConfig.readOnly && !endpointConfig.supportsDetail)
    ) {
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

    const request = { recordId }
    lastRequestRef.current = request
    await loadDetail(request)
  }

  const retryDetail = () => {
    const request = lastRequestRef.current
    if (request) {
      void loadDetail(request)
    }
  }

  const closeDetail = () => {
    requestVersionRef.current += 1
    lastRequestRef.current = null
    setDetailOpen(false)
    setDetailRecord(null)
    setDetailError(null)
    setDetailLoading(false)
  }

  return {
    detailOpen,
    detailRecord,
    detailLoading,
    detailError,
    openDetail,
    retryDetail,
    closeDetail,
  }
}
