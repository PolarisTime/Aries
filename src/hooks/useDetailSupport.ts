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
  inlineDetailItems: DetailItem<Key>[]
  inlineExpandedRowKeys: string[]
  openInlineDetail: (target: ModuleListRecordFor<Key>) => Promise<void>
  closeInlineDetail: (recordId?: string) => void
  retryDetail: (recordId: string) => void
  retryInlineDetail: (recordId: string) => void
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
  const [inlineDetailItems, setInlineDetailItems] = useState<DetailItem<Key>[]>(
    [],
  )
  const requestSequenceRef = useRef(0)
  const detailRequestVersionsRef = useRef(new Map<string, number>())
  const inlineRequestVersionsRef = useRef(new Map<string, number>())
  const inlineExpandedRowKeys = inlineDetailItems.map((item) => item.recordId)

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

  const updateInlineDetailItem = (
    recordId: string,
    updater: (item: DetailItem<Key>) => DetailItem<Key>,
  ) => {
    setInlineDetailItems((prev) =>
      prev.map((item) => (item.recordId === recordId ? updater(item) : item)),
    )
  }

  const loadInlineDetail = async (recordId: string) => {
    const requestVersion = ++requestSequenceRef.current
    inlineRequestVersionsRef.current.set(recordId, requestVersion)
    updateInlineDetailItem(recordId, (item) => ({
      ...item,
      loading: true,
      error: null,
    }))
    try {
      const record = await getBusinessModuleDetail(moduleKey, recordId)
      if (inlineRequestVersionsRef.current.get(recordId) === requestVersion) {
        updateInlineDetailItem(recordId, (item) => ({
          ...item,
          record,
          loading: false,
        }))
      }
    } catch (error) {
      if (inlineRequestVersionsRef.current.get(recordId) === requestVersion) {
        updateInlineDetailItem(recordId, (item) => ({
          ...item,
          record: null,
          error,
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

    setInlineDetailItems((prev) => {
      if (prev.some((item) => item.recordId === recordId)) return prev
      return [
        ...prev,
        {
          recordId,
          record: resolveDetailFallback(moduleKey, target),
          loading: false,
          error: null,
        },
      ]
    })

    const endpointConfig = getModuleConfig(moduleKey)
    if (
      endpointConfig.readOnly &&
      !endpointConfig.supportsDetail &&
      !isMainFlowModuleKey(moduleKey)
    ) {
      return
    }

    const hasConfiguredItemColumns = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )
    if (
      !isMainFlowModuleKey(moduleKey) &&
      (!hasConfiguredItemColumns || hasModuleRecordItems(target))
    ) {
      return
    }

    await loadInlineDetail(recordId)
  }

  const retryInlineDetail = (recordId: string) => {
    if (inlineDetailItems.some((item) => item.recordId === recordId)) {
      void loadInlineDetail(recordId)
    }
  }

  const closeInlineDetail = (recordId?: string) => {
    if (recordId) {
      inlineRequestVersionsRef.current.delete(recordId)
      setInlineDetailItems((prev) =>
        prev.filter((item) => item.recordId !== recordId),
      )
      return
    }
    inlineRequestVersionsRef.current.clear()
    setInlineDetailItems([])
  }

  const closeDetail = (recordId: string) => {
    detailRequestVersionsRef.current.delete(recordId)
    setDetailItems((prev) => prev.filter((item) => item.recordId !== recordId))
  }

  return {
    detailItems,
    openDetail,
    inlineDetailItems,
    inlineExpandedRowKeys,
    openInlineDetail,
    closeInlineDetail,
    retryDetail,
    retryInlineDetail,
    closeDetail,
  }
}
