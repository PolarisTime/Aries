import { keepPreviousData, useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { useCallback, useRef } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { buildFilterParamsFromContract } from '@/api/business/business-listing-filtering'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import {
  getParentCandidateFilterContract,
  type ParentCandidateFilterContract,
} from '@/api/contracts/parent-candidate-contracts'
import { listStatementCandidatePage } from '@/api/finance/statements'
import { listFreightSalesOrderCandidatePage } from '@/api/logistics/freight-bill-candidates'
import { listPurchaseOrderInboundImportCandidatePage } from '@/api/purchase/purchase-order-candidates'
import {
  listSalesOrderOutboundImportCandidatePage,
  listSalesOrderPurchaseSourceCandidatePage,
} from '@/api/sales/sales-order-candidates'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { PatchStateUpdater } from '@/hooks/usePatchState'
import type { SearchParams } from '@/types/api-raw'
import type {
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
} from '@/types/module-page'
import {
  compactParentSelectorFilters,
  filterImportableParentRecords,
  mergeParentSelectorFilters,
} from '../module-parent-selector-utils'

export const EMPTY_FIXED_FILTERS: SearchParams = {}
export const DEFAULT_PAGE_SIZE = 30

export type ParentSelectorInlineDetailItem = {
  record: ModuleRecord | null
  loading: boolean
  error: unknown
}

export interface ParentSelectorState {
  draftFilters: SearchParams
  submittedFilters: SearchParams
  page: number
  pageSize: number
  selectedRowKeys: string[]
  selectedRecordMap: Record<string, ModuleRecord>
  detailExpandedRowKeys: string[]
  inlineDetailItems: Record<string, ParentSelectorInlineDetailItem>
}

export const parentSelectorInitialState: ParentSelectorState = {
  draftFilters: {},
  submittedFilters: {},
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  selectedRowKeys: [],
  selectedRecordMap: {},
  detailExpandedRowKeys: [],
  inlineDetailItems: {},
}

export function needsParentDetail(record: ModuleRecord) {
  return !Array.isArray(record.items) || record.items.length === 0
}

export function resolveParentSelectorSourceModule(
  parentModuleKey: string,
  candidateStatementModuleKey?: string,
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType'],
) {
  if (candidateQueryType === 'purchase-order-import') {
    return 'purchase-order-import'
  }
  if (candidateQueryType === 'sales-order-purchase-source') {
    return 'sales-order-purchase-source'
  }
  if (candidateQueryType === 'sales-order-outbound-import') {
    return 'sales-order-outbound-import'
  }
  if (candidateQueryType === 'freight-sales-order-import') {
    return 'freight-sales-order-import'
  }
  return candidateStatementModuleKey || parentModuleKey
}

export function buildOverlayFilterConfig(
  parentModuleKey: string,
  pageConfig: ModulePageConfig,
  fixedFilters: SearchParams,
  candidateFilterContract?: ParentCandidateFilterContract,
): ModulePageConfig {
  const endpointConfig =
    candidateFilterContract || getModuleConfig(parentModuleKey)
  const nativeFilterKeys = new Set(endpointConfig.nativeFilterKeys || [])
  const dateRangeKeys = new Set(
    Object.keys(endpointConfig.dateRangeMapping || {}),
  )
  const fixedFilterKeys = new Set(
    Object.keys(compactParentSelectorFilters(fixedFilters)),
  )

  const supportedFilters = pageConfig.filters.filter((filter) => {
    if (fixedFilterKeys.has(filter.key)) {
      return false
    }
    if (filter.type === 'dateRange') {
      return dateRangeKeys.has(filter.key)
    }
    return nativeFilterKeys.has(filter.key)
  })

  if (!supportedFilters.some((filter) => filter.key === 'keyword')) {
    supportedFilters.unshift({
      key: 'keyword',
      label: i18next.t('modules.parentSelector.filter.keyword'),
      type: 'input',
      placeholder: i18next.t(
        'modules.parentSelector.filter.keywordPlaceholder',
      ),
    })
  }

  return {
    ...pageConfig,
    filters: supportedFilters,
  }
}

export interface UseParentSelectorDataParams {
  parentModuleKey: string
  candidateStatementModuleKey?: 'customer-statement' | 'freight-statement'
  candidateQueryType?: ModuleParentImportDefinition['candidateQueryType']
  fixedFilters: SearchParams
  state: ParentSelectorState
  setState: (patch: PatchStateUpdater<ParentSelectorState>) => void
}

export function useParentSelectorData({
  parentModuleKey,
  candidateStatementModuleKey,
  candidateQueryType,
  fixedFilters,
  state,
  setState,
}: UseParentSelectorDataParams) {
  const { draftFilters, submittedFilters, page, pageSize } = state
  const detailRequestSequenceRef = useRef(0)
  const detailRequestVersionsRef = useRef(new Map<string, number>())
  const detailModuleKey = candidateStatementModuleKey || parentModuleKey
  const effectiveFixedFilters = compactParentSelectorFilters(fixedFilters)
  const effectiveSubmittedFilters = mergeParentSelectorFilters(
    submittedFilters,
    effectiveFixedFilters,
  )
  const dedicatedCandidateSource =
    candidateQueryType || candidateStatementModuleKey
  const candidateFilterContract = dedicatedCandidateSource
    ? getParentCandidateFilterContract(dedicatedCandidateSource)
    : undefined
  const dedicatedCandidateFilters = candidateFilterContract
    ? buildFilterParamsFromContract(
        candidateFilterContract,
        effectiveSubmittedFilters,
      )
    : undefined

  const { data: parentPageConfig, isLoading: isConfigLoading } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorConfig(parentModuleKey),
    queryFn: () => loadBusinessPageConfig(parentModuleKey),
    enabled: !!parentModuleKey,
    staleTime: Infinity,
  })
  const overlayFilterConfig = parentPageConfig
    ? buildOverlayFilterConfig(
        parentModuleKey,
        parentPageConfig,
        effectiveFixedFilters,
        candidateFilterContract,
      )
    : undefined

  const { data, isLoading, isFetching } = useQuery({
    queryKey: QUERY_KEYS.parentSelectorList(
      resolveParentSelectorSourceModule(
        parentModuleKey,
        candidateStatementModuleKey,
        candidateQueryType,
      ),
      effectiveSubmittedFilters,
      page,
      pageSize,
    ),
    queryFn: ({ signal }) => {
      if (candidateStatementModuleKey) {
        return listStatementCandidatePage(
          candidateStatementModuleKey,
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'purchase-order-import') {
        return listPurchaseOrderInboundImportCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'sales-order-purchase-source') {
        return listSalesOrderPurchaseSourceCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'sales-order-outbound-import') {
        return listSalesOrderOutboundImportCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      if (candidateQueryType === 'freight-sales-order-import') {
        return listFreightSalesOrderCandidatePage(
          dedicatedCandidateFilters || {},
          Math.max(page - 1, 0),
          pageSize,
          signal,
        )
      }
      return listBusinessModule(
        parentModuleKey,
        effectiveSubmittedFilters,
        {
          currentPage: page,
          pageSize,
        },
        { signal },
      )
    },
    enabled: !!parentModuleKey,
    placeholderData: keepPreviousData,
  })

  const records = filterImportableParentRecords(
    parentModuleKey,
    data?.data?.rows || [],
    candidateStatementModuleKey,
    candidateQueryType,
  )
  const total = Number(data?.data?.total || 0)

  const updateFilter = (key: string, value: unknown) => {
    setState({
      draftFilters: {
        ...draftFilters,
        [key]: value,
      },
    })
  }

  const applyFilters = (nextFilters: SearchParams) => {
    setState({
      draftFilters: { ...nextFilters },
      submittedFilters: { ...nextFilters },
      page: 1,
    })
  }

  const resetFilters = () => {
    setState({
      draftFilters: {},
      submittedFilters: {},
      page: 1,
    })
  }

  const handlePageChange = (nextPage: number, nextPageSize: number) => {
    setState({
      page: nextPage,
      pageSize: nextPageSize !== pageSize ? nextPageSize : pageSize,
    })
  }

  const setInlineDetailItem = useCallback(
    (
      recordId: string,
      updater: (
        prev: ParentSelectorInlineDetailItem,
      ) => ParentSelectorInlineDetailItem,
    ) => {
      setState((prev) => ({
        inlineDetailItems: {
          ...prev.inlineDetailItems,
          [recordId]: updater(
            prev.inlineDetailItems[recordId] || {
              record: null,
              loading: false,
              error: null,
            },
          ),
        },
      }))
    },
    [setState],
  )

  const loadDetailRecord = useCallback(
    async (recordId: string) => {
      const requestVersion = ++detailRequestSequenceRef.current
      detailRequestVersionsRef.current.set(recordId, requestVersion)
      setInlineDetailItem(recordId, (prev) => ({
        ...prev,
        loading: true,
        error: null,
      }))
      try {
        const record = await getBusinessModuleDetail(detailModuleKey, recordId)
        if (detailRequestVersionsRef.current.get(recordId) !== requestVersion) {
          return
        }
        setInlineDetailItem(recordId, (prev) => ({
          ...prev,
          record,
          loading: false,
        }))
      } catch (error) {
        if (detailRequestVersionsRef.current.get(recordId) !== requestVersion) {
          return
        }
        setInlineDetailItem(recordId, (prev) => ({
          ...prev,
          record: null,
          loading: false,
          error,
        }))
      }
    },
    [detailModuleKey, setInlineDetailItem],
  )

  return {
    draftFilters,
    submittedFilters,
    page,
    pageSize,
    records,
    total,
    parentPageConfig,
    overlayFilterConfig,
    isLoading: isLoading || isFetching || isConfigLoading,
    updateFilter,
    applyFilters,
    resetFilters,
    handlePageChange,
    detailRequestVersionsRef,
    setInlineDetailItem,
    loadDetailRecord,
  }
}
