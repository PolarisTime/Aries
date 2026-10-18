import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { listBusinessModule } from '@/api/business/business-listing'
import { QUERY_KEYS } from '@/constants/query-keys'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { SearchParams } from '@/types/api-raw'
import type { ModuleListRecordFor } from '@/types/module-record'

interface Props<Key extends ModuleKey> {
  moduleKey: Key
  filters: SearchParams
  enabled: boolean
  currentPage: number
  pageSize: number
  /**
   * 服务端排序(字段 + 方向)。缺省时由后端接口自行决定默认排序。
   *
   * <p>`buildQueryParams` 早已支持 `sortBy`/`sortDirection`（→ `sortBy`/`direction`
   * 查询参数），后端 `PageSortFieldCatalog` 也按模块白名单了可排序字段 —— 能力一直存在，
   * 只是这个 hook 没有透传，于是所有业务列表都用后端默认排序（`/operation-log` 因此
   * 26 万条里最新日志落在最后一页）。这里只负责转交，不做任何排序判断。</p>
   */
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

interface BusinessItemsResult<RecordType> {
  records: RecordType[]
  total: number
  responseCode: number
  errorMessage: string
  hasError: boolean
  isLoading: boolean
  isFetching: boolean
  /**
   * 首次加载/重试失败后，react-query 正在自动重试（`retry: 1`）的窗口。
   *
   * <p>这段时间里 `error` 仍是 `undefined`、`data` 也是 `undefined`，页面只看
   * `isLoading` 会以为"查完了、就是空"，于是先渲染出「暂无数据 / 共 0 条」的假空态，
   * 约 1.2 秒后才切成错误态。用本标志把"还在重试"与"确实为空"分开。</p>
   */
  isRetrying: boolean
  retry: ReturnType<typeof useQuery>['refetch']
}

export function useInfiniteBusinessItems<Key extends ModuleKey>({
  moduleKey,
  filters,
  enabled,
  currentPage,
  pageSize,
  sortBy,
  sortDirection,
}: Props<Key>): BusinessItemsResult<ModuleListRecordFor<Key>> {
  const { data, error, isFetching, isLoading, refetch, failureCount } =
    useQuery({
      // 排序进 queryKey: 排序变化必须触发新查询, 否则会命中旧排序的缓存
      queryKey: [
        ...QUERY_KEYS.businessGridList(
          moduleKey,
          filters,
          currentPage,
          pageSize,
        ),
        sortBy ?? '',
        sortDirection ?? '',
      ] as const,
      queryFn: ({ signal }) =>
        listBusinessModule(
          moduleKey,
          filters,
          {
            currentPage,
            pageSize,
            ...(sortBy ? { sortBy } : {}),
            ...(sortDirection ? { sortDirection } : {}),
          },
          { signal },
        ),
      enabled: enabled && !!moduleKey,
      staleTime: 5_000,
      placeholderData: keepPreviousData,
    })

  const responseCode = Number(data?.code ?? 0)
  const hasError = error != null || responseCode !== 0
  const errorMessage =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : responseCode !== 0
        ? String(data?.message || '').trim()
        : ''
  const records: ModuleListRecordFor<Key>[] = hasError
    ? []
    : (data?.data?.rows ?? [])
  const total = hasError ? 0 : (data?.data?.total ?? 0)
  /*
   * 重试窗口：已经失败过（failureCount > 0）但 error 还没暴露、且请求仍在跑。
   * 此时不能把 records=[]/total=0 当成"确实为空"渲染空态。
   */
  const isRetrying = !hasError && failureCount > 0 && (isFetching || isLoading)

  return {
    records,
    total,
    responseCode,
    errorMessage,
    hasError,
    isLoading,
    isFetching,
    isRetrying,
    retry: refetch,
  }
}
