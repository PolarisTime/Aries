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

export interface DetailItem<Key extends ModuleKey> {
  recordId: string
  record: ModuleDetailRecordFor<Key> | null
  loading: boolean
  error: unknown
}

interface DetailSupportResult<Key extends ModuleKey> {
  detailItems: DetailItem<Key>[]
  openDetail: (target: string | ModuleListRecordFor<Key>) => Promise<void>
  inlineExpandedRowKeys: string[]
  inlineDetailRecord: ModuleDetailRecordFor<Key> | null
  inlineDetailLoading: boolean
  inlineDetailError: unknown
  openInlineDetail: (target: ModuleListRecordFor<Key>) => Promise<void>
  closeInlineDetail: (recordId?: string) => void
  retryDetail: (recordId: string) => void
  retryInlineDetail: () => void
  closeDetail: (recordId: string) => void
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
  const [detailItems, setDetailItems] = useState<DetailItem<Key>[]>([])
  const [inlineExpandedRowKeys, setInlineExpandedRowKeys] = useState<string[]>(
    [],
  )
  const [inlineDetailRecord, setInlineDetailRecord] =
    useState<ModuleDetailRecordFor<Key> | null>(null)
  const [inlineDetailLoading, setInlineDetailLoading] = useState(false)
  const [inlineDetailError, setInlineDetailError] = useState<unknown>(null)
  const requestSequenceRef = useRef(0)
  const detailRequestVersionsRef = useRef(new Map<string, number>())
  const inlineRequestVersionRef = useRef(0)
  const inlineLastRequestRef = useRef<{ recordId: string } | null>(null)

  const updateDetailItem = (
    recordId: string,
    updater: (item: DetailItem<Key>) => DetailItem<Key>,
  ) => {
    setDetailItems((prev) =>
      prev.map((item) => (item.recordId === recordId ? updater(item) : item)),
    )
  }

  const loadDetail = async (recordId: string) => {
    const requestVersion = ++requestSequenceRef.current
    detailRequestVersionsRef.current.set(recordId, requestVersion)
    updateDetailItem(recordId, (item) => ({
      ...item,
      loading: true,
      error: null,
    }))
    try {
      const record = await getBusinessModuleDetail(moduleKey, recordId)
      if (detailRequestVersionsRef.current.get(recordId) === requestVersion) {
        updateDetailItem(recordId, (item) => ({
          ...item,
          record,
          loading: false,
        }))
      }
    } catch (error) {
      if (detailRequestVersionsRef.current.get(recordId) === requestVersion) {
        updateDetailItem(recordId, (item) => ({
          ...item,
          record: null,
          error,
          loading: false,
        }))
      }
    } finally {
      if (detailRequestVersionsRef.current.get(recordId) === requestVersion) {
        updateDetailItem(recordId, (item) => ({
          ...item,
          loading: false,
        }))
      }
    }
  }

  const openDetail = async (target: string | ModuleListRecordFor<Key>) => {
    const fallbackRecord = typeof target === 'string' ? null : target
    const recordId =
      typeof target === 'string' ? target : String(target.id || '')
    const endpointConfig = getModuleConfig(moduleKey)
    const requiresDetailFetch = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )

    if (!recordId) return

    setDetailItems((prev) => {
      if (prev.some((item) => item.recordId === recordId)) return prev
      return [
        ...prev,
        {
          recordId,
          record: resolveDetailFallback(moduleKey, fallbackRecord),
          loading: false,
          error: null,
        },
      ]
    })

    if (endpointConfig.readOnly && !endpointConfig.supportsDetail) {
      return
    }

    if (
      fallbackRecord &&
      !isMainFlowModuleKey(moduleKey) &&
      (!requiresDetailFetch || hasModuleRecordItems(fallbackRecord))
    ) {
      return
    }

    await loadDetail(recordId)
  }

  const retryDetail = (recordId: string) => {
    if (detailItems.some((item) => item.recordId === recordId)) {
      void loadDetail(recordId)
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

  const closeDetail = (recordId: string) => {
    detailRequestVersionsRef.current.delete(recordId)
    setDetailItems((prev) => prev.filter((item) => item.recordId !== recordId))
  }

  return {
    detailItems,
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
