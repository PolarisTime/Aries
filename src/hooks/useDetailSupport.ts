import { useRef, useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import type { ModuleKey } from '@/module-system/core/module-key'
import { hasModuleRecordItems } from '@/module-system/record/module-record-fields'
import { isMainFlowModuleKey } from '@/shared/schemas/module-record'
import type { ModulePageConfig } from '@/types/module-page'
import type {
  ModuleDetailRecordFor,
  ModuleListRecordFor,
} from '@/types/module-record'

interface Options<Key extends ModuleKey> {
  moduleKey: Key
  config?: ModulePageConfig
}

interface DetailRequest {
  recordId: string
}

interface DetailSupportResult<Key extends ModuleKey> {
  detailOpen: boolean
  detailRecord: ModuleDetailRecordFor<Key> | null
  detailLoading: boolean
  detailError: unknown
  openDetail: (target: string | ModuleListRecordFor<Key>) => Promise<void>
  inlineExpandedRowKeys: string[]
  inlineDetailRecord: ModuleDetailRecordFor<Key> | null
  inlineDetailLoading: boolean
  inlineDetailError: unknown
  openInlineDetail: (target: ModuleListRecordFor<Key>) => Promise<void>
  closeInlineDetail: (recordId?: string) => void
  retryDetail: () => void
  retryInlineDetail: () => void
  closeDetail: () => void
}

function resolveDetailFallback<Key extends ModuleKey>(
  moduleKey: Key,
  record: ModuleListRecordFor<Key> | null,
): ModuleDetailRecordFor<Key> | null
function resolveDetailFallback(
  moduleKey: ModuleKey,
  record: ModuleListRecordFor<ModuleKey> | null,
): object | null {
  return isMainFlowModuleKey(moduleKey) ? null : record
}

export function useDetailSupport<Key extends ModuleKey>({
  moduleKey,
  config,
}: Options<Key>): DetailSupportResult<Key> {
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] =
    useState<ModuleDetailRecordFor<Key> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<unknown>(null)
  const [inlineExpandedRowKeys, setInlineExpandedRowKeys] = useState<string[]>(
    [],
  )
  const [inlineDetailRecord, setInlineDetailRecord] =
    useState<ModuleDetailRecordFor<Key> | null>(null)
  const [inlineDetailLoading, setInlineDetailLoading] = useState(false)
  const [inlineDetailError, setInlineDetailError] = useState<unknown>(null)
  const requestVersionRef = useRef(0)
  const lastRequestRef = useRef<DetailRequest | null>(null)
  const inlineRequestVersionRef = useRef(0)
  const inlineLastRequestRef = useRef<DetailRequest | null>(null)

  const loadDetail = async (request: DetailRequest) => {
    const requestVersion = ++requestVersionRef.current
    setDetailLoading(true)
    setDetailError(null)
    setDetailRecord(null)
    try {
      const record = await getBusinessModuleDetail(moduleKey, request.recordId)
      if (requestVersion === requestVersionRef.current) {
        setDetailRecord(record)
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

  const openDetail = async (target: string | ModuleListRecordFor<Key>) => {
    requestVersionRef.current += 1
    const fallbackRecord = typeof target === 'string' ? null : target
    const recordId =
      typeof target === 'string' ? target : String(target.id || '')
    const endpointConfig = getModuleConfig(moduleKey)
    const requiresDetailFetch = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )

    setDetailOpen(true)
    setDetailRecord(resolveDetailFallback(moduleKey, fallbackRecord))
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
      !isMainFlowModuleKey(moduleKey) &&
      (!requiresDetailFetch || hasModuleRecordItems(fallbackRecord))
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

  const openInlineDetail = async (target: ModuleListRecordFor<Key>) => {
    const recordId = String(target.id || '')
    if (!recordId) {
      return
    }

    const requestVersion = ++inlineRequestVersionRef.current
    setInlineExpandedRowKeys([recordId])
    setInlineDetailLoading(true)
    setInlineDetailError(null)
    setInlineDetailRecord(resolveDetailFallback(moduleKey, target))
    inlineLastRequestRef.current = { recordId }

    const endpointConfig = getModuleConfig(moduleKey)
    if (
      endpointConfig.readOnly &&
      !endpointConfig.supportsDetail &&
      !isMainFlowModuleKey(moduleKey)
    ) {
      setInlineDetailLoading(false)
      return
    }

    const hasConfiguredItemColumns = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )
    if (
      !isMainFlowModuleKey(moduleKey) &&
      (!hasConfiguredItemColumns || hasModuleRecordItems(target))
    ) {
      setInlineDetailLoading(false)
      return
    }

    try {
      const record = await getBusinessModuleDetail(moduleKey, recordId)
      if (requestVersion === inlineRequestVersionRef.current) {
        setInlineDetailRecord(record)
      }
    } catch (error) {
      if (requestVersion === inlineRequestVersionRef.current) {
        setInlineDetailRecord(null)
        setInlineDetailError(error)
      }
    } finally {
      if (requestVersion === inlineRequestVersionRef.current) {
        setInlineDetailLoading(false)
      }
    }
  }

  const retryInlineDetail = () => {
    const request = inlineLastRequestRef.current
    if (!request) {
      return
    }
    const target = { id: request.recordId } as ModuleListRecordFor<Key>
    void openInlineDetail(target)
  }

  const closeInlineDetail = (recordId?: string) => {
    if (
      recordId &&
      inlineExpandedRowKeys.length > 0 &&
      inlineExpandedRowKeys[0] !== recordId
    ) {
      return
    }
    inlineRequestVersionRef.current += 1
    inlineLastRequestRef.current = null
    setInlineExpandedRowKeys([])
    setInlineDetailRecord(null)
    setInlineDetailError(null)
    setInlineDetailLoading(false)
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
    inlineExpandedRowKeys,
    inlineDetailRecord,
    inlineDetailLoading,
    inlineDetailError,
    openInlineDetail,
    closeInlineDetail,
    retryDetail,
    retryInlineDetail,
    closeDetail,
  }
}
