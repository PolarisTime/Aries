import { keepPreviousData, useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { useCallback, useRef } from 'react'
import { getBusinessModuleDetail } from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { buildFilterParamsFromContract } from '@/api/business/business-listing-filtering'
import { getModuleConfig } from '@/api/contracts/module-contracts'
import {
  DEFAULT_SELECTOR_FILTER_OMISSIONS,
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

/**
 * 从上游列表页配置派生导入弹层的筛选区。
 *
 * <p><b>口径：默认全放行 + 显式排除（opt-out）</b>。上游列表页配了几个筛选，弹层就继承几个，
 * 只有三类会被剔除：</p>
 * <ol>
 *   <li><b>编辑器注入的固定筛选</b>（`fixedFilters`）：由 import 定义按当前单据算出来，
 *     不可见也不可改，因此既不进弹层 draft、也不占筛选格子。它与"用户可改筛选"必须分开。</li>
 *   <li><b>语义排除</b>（`selectorFilterOmissions`，缺省
 *     {@link DEFAULT_SELECTOR_FILTER_OMISSIONS}）：例如「被引用状态」——
 *     放在候选列表里会让人看不懂"候选为什么变少"。</li>
 *   <li><b>接口能力守卫</b>：候选接口根本不接受的 key。放行它等于给用户一个"改了没反应"的
 *     死筛选 —— 值会被 `buildFilterParamsFromContract` 丢掉，列表却毫无变化。
 *     权威来源是后端各候选接口的请求参数（如 `V2FreightBillController.salesOrderCandidates`
 *     只收 keyword / customerId / customerName / projectId / projectName /
 *     settlementCompanyId / startDate / endDate / currentRecordId，**没有 status**），
 *     前端这侧的镜像就是 `nativeFilterKeys` / `dateRangeMapping` 这份请求契约。</li>
 * </ol>
 *
 * <p><b>历史写法已废弃</b>：此前弹层按「允许清单」显示 —— 页面筛选必须同时出现在
 * `nativeFilterKeys` 里才放行，于是每加一个筛选要改两处，弹层筛选区长期比列表页少一半。</p>
 *
 * <p><b>三个布局特例</b>（结论都落在共享的 `ModuleFilterToolbar` 现有能力上，这里只锁定口径）：</p>
 * <ul>
 *   <li><b>segmented</b>（状态、被引用状态）：不是输入框，按 `ModuleFilterChip` 渲染 ——
 *     平时只是一个胶囊按钮，点开才是选项，因此窄工具行放得下；工具行的
 *     `.module-filter-chip-row` 是 `flex-wrap: wrap`，窄屏进一步变单列堆叠。
 *     选定 **折行**，不另做「更多筛选」折叠层：多一层抽屉会让"当前生效的筛选"更难看见，
 *     而筛选区本身只多了 1~2 个胶囊。</li>
 *   <li><b>dateRange</b>（送货日期）：整段区间作为**一个**胶囊（`.module-filter-pill-date`）
 *     参与折行 —— 不拆成"起/止"两个格子，否则折行时两个控件可能被切到两行，
 *     用户就看不出它们属于同一段区间。</li>
 *   <li><b>referencedBy</b>（被引用状态）：走语义排除，不进弹层（理由见
 *     `DEFAULT_SELECTOR_FILTER_OMISSIONS`）。</li>
 * </ul>
 */
export function buildOverlayFilterConfig(
  parentModuleKey: string,
  pageConfig: ModulePageConfig,
  fixedFilters: SearchParams,
  candidateFilterContract?: ParentCandidateFilterContract,
): ModulePageConfig {
  const requestContract =
    candidateFilterContract || getModuleConfig(parentModuleKey)
  const requestFilterKeys = new Set(requestContract.nativeFilterKeys || [])
  const requestDateRangeKeys = new Set(
    Object.keys(requestContract.dateRangeMapping || {}),
  )
  const omittedFilterKeys = new Set(
    candidateFilterContract?.selectorFilterOmissions ??
      DEFAULT_SELECTOR_FILTER_OMISSIONS,
  )
  const fixedFilterKeys = new Set(
    Object.keys(compactParentSelectorFilters(fixedFilters)),
  )

  // 默认全放行：先继承上游全部筛选，再按「固定条件 → 语义排除 → 接口能力」三步剔除。
  const supportedFilters = pageConfig.filters.filter((filter) => {
    if (fixedFilterKeys.has(filter.key)) {
      return false
    }
    if (omittedFilterKeys.has(filter.key)) {
      return false
    }
    return filter.type === 'dateRange'
      ? requestDateRangeKeys.has(filter.key)
      : requestFilterKeys.has(filter.key)
  })

  // 上游列表页若没配 keyword，补一个：候选检索的主要入口，六个候选接口都接受 keyword。
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
