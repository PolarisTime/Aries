import { useQueries } from '@tanstack/react-query'
import { useState } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
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

interface DetailTarget<Key extends ModuleKey> {
  recordId: string
  fallbackRecord: ModuleDetailRecordFor<Key> | null
  enabled: boolean
}

interface DetailQueryState<Key extends ModuleKey> {
  data: ModuleDetailRecordFor<Key> | undefined
  isLoading: boolean
  error: unknown
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

function toDetailItem<Key extends ModuleKey>(
  target: DetailTarget<Key>,
  query: DetailQueryState<Key>,
): DetailItem<Key> {
  return {
    recordId: target.recordId,
    record: query.error != null ? null : (query.data ?? target.fallbackRecord),
    loading: query.isLoading,
    error: query.error,
  }
}

export function useDetailSupport<Key extends ModuleKey>({
  moduleKey,
  config,
}: Options<Key>): DetailSupportResult<Key> {
  const [detailTargets, setDetailTargets] = useState<DetailTarget<Key>[]>([])
  const [inlineTargets, setInlineTargets] = useState<DetailTarget<Key>[]>([])

  const detailQueries = useQueries({
    queries: detailTargets.map((target) => ({
      queryKey: QUERY_KEYS.businessGridDetail(moduleKey, target.recordId),
      queryFn: async ({ signal }) => {
        const record = await getBusinessModuleDetail(
          moduleKey,
          target.recordId,
          signal,
        )
        signal.throwIfAborted()
        return record
      },
      enabled: target.enabled,
      staleTime: STALE_REALTIME,
    })),
  })

  const inlineQueries = useQueries({
    queries: inlineTargets.map((target) => ({
      queryKey: QUERY_KEYS.businessGridDetail(moduleKey, target.recordId),
      queryFn: async ({ signal }) => {
        const record = await getBusinessModuleDetail(
          moduleKey,
          target.recordId,
          signal,
        )
        signal.throwIfAborted()
        return record
      },
      enabled: target.enabled,
      staleTime: STALE_REALTIME,
    })),
  })

  const detailItems = detailTargets.map((target, index) =>
    toDetailItem(target, detailQueries[index]),
  )
  const inlineDetailItems = inlineTargets.map((target, index) =>
    toDetailItem(target, inlineQueries[index]),
  )
  const inlineExpandedRowKeys = inlineTargets.map((item) => item.recordId)

  const openDetail = (
    target: string | ModuleListRecordFor<Key>,
  ): Promise<void> => {
    const fallbackRecord = typeof target === 'string' ? null : target
    const recordId =
      typeof target === 'string' ? target : String(target.id || '')
    if (!recordId) {
      return Promise.resolve()
    }

    const endpointConfig = getModuleConfig(moduleKey)
    const requiresDetailFetch = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )
    const shouldLoad = !(
      (endpointConfig.readOnly && !endpointConfig.supportsDetail) ||
      (fallbackRecord &&
        !isMainFlowModuleKey(moduleKey) &&
        (!requiresDetailFetch || hasModuleRecordItems(fallbackRecord)))
    )

    setDetailTargets((prev) => {
      if (prev.some((item) => item.recordId === recordId)) return prev
      return [
        ...prev,
        {
          recordId,
          fallbackRecord: resolveDetailFallback(moduleKey, fallbackRecord),
          enabled: shouldLoad,
        },
      ]
    })

    return Promise.resolve()
  }

  const retryDetail = (recordId: string) => {
    const index = detailTargets.findIndex((item) => item.recordId === recordId)
    if (index < 0) return
    void detailQueries[index].refetch()
  }

  const openInlineDetail = (
    target: ModuleListRecordFor<Key>,
  ): Promise<void> => {
    const recordId = String(target.id || '')
    if (!recordId) {
      return Promise.resolve()
    }

    const endpointConfig = getModuleConfig(moduleKey)
    const hasConfiguredItemColumns = Boolean(
      config?.detailItemColumns?.length || config?.itemColumns?.length,
    )
    const shouldLoad = !(
      (endpointConfig.readOnly &&
        !endpointConfig.supportsDetail &&
        !isMainFlowModuleKey(moduleKey)) ||
      (!isMainFlowModuleKey(moduleKey) &&
        (!hasConfiguredItemColumns || hasModuleRecordItems(target)))
    )

    setInlineTargets((prev) => {
      if (prev.some((item) => item.recordId === recordId)) return prev
      return [
        ...prev,
        {
          recordId,
          fallbackRecord: resolveDetailFallback(moduleKey, target),
          enabled: shouldLoad,
        },
      ]
    })

    return Promise.resolve()
  }

  const retryInlineDetail = (recordId: string) => {
    const index = inlineTargets.findIndex((item) => item.recordId === recordId)
    if (index < 0) return
    void inlineQueries[index].refetch()
  }

  const closeInlineDetail = (recordId?: string) => {
    if (recordId) {
      setInlineTargets((prev) =>
        prev.filter((item) => item.recordId !== recordId),
      )
      return
    }
    setInlineTargets([])
  }

  const closeDetail = (recordId: string) => {
    setDetailTargets((prev) =>
      prev.filter((item) => item.recordId !== recordId),
    )
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
