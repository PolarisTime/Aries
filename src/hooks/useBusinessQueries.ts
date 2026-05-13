import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { listBusinessModule } from '@/api/business'
import { useBusinessListCache } from '@/hooks/useBusinessListCache'
import type { TableResponse } from '@/types/api'
import type { ModuleRecord } from '@/types/module-page'

const EMPTY_RECORDS: ModuleRecord[] = []

interface Props {
  moduleKey: string
  filters: Record<string, unknown>
  page: number
  pageSize: number
  enabled: boolean
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export function useBusinessQueries({
  moduleKey,
  filters,
  page,
  pageSize,
  enabled,
  sortBy,
  sortDirection,
}: Props) {
  const previousModuleKeyRef = useRef(moduleKey)
  const supportsSessionCache =
    moduleKey === 'purchase-order' ||
    moduleKey === 'sales-order' ||
    moduleKey === 'purchase-inbound' ||
    moduleKey === 'sales-outbound'
  const canReusePreviousData = previousModuleKeyRef.current === moduleKey

  const { cached, save } = useBusinessListCache({
    moduleKey,
    filters,
    page,
    pageSize,
    sortBy,
    sortDirection,
  })
  const placeholderData =
    cached ||
    (canReusePreviousData
      ? (keepPreviousData as (
          previousData: TableResponse<ModuleRecord> | undefined,
        ) => TableResponse<ModuleRecord> | undefined)
      : undefined)

  const listQuery = useQuery<TableResponse<ModuleRecord>>({
    queryKey: [
      'business-grid',
      moduleKey,
      filters,
      page,
      pageSize,
      sortBy || '',
      sortDirection || '',
    ],
    queryFn: ({ signal }) =>
      listBusinessModule(
        moduleKey,
        filters,
        {
          currentPage: page,
          pageSize,
          sortBy,
          sortDirection,
        },
        { signal },
      ),
    enabled: enabled && !!moduleKey,
    placeholderData,
    staleTime: supportsSessionCache ? 30_000 : 0,
    gcTime: supportsSessionCache ? 5 * 60_000 : 60_000,
  })

  useEffect(() => {
    previousModuleKeyRef.current = moduleKey
  }, [moduleKey])

  useEffect(() => {
    if (!supportsSessionCache || !listQuery.data) {
      return
    }
    save(listQuery.data)
  }, [listQuery.data, save, supportsSessionCache])

  const records: ModuleRecord[] = listQuery.data?.data?.rows || EMPTY_RECORDS
  const total = listQuery.data?.data?.total || 0
  const responseCode = Number(listQuery.data?.code ?? 0)
  const warningMessage =
    responseCode === 0 ? '' : String(listQuery.data?.message || '')

  return {
    listQuery,
    records,
    total,
    responseCode,
    warningMessage,
    isLoading: listQuery.isLoading,
    isFetching: listQuery.isFetching,
    error: listQuery.error,
  }
}
