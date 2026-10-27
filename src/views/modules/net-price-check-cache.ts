import { fetchPricingQuoteResolution } from '@/api/market/pricing-quote-resolutions'
import {
  fetchMaterialPriceMatches,
  type MaterialPriceMatch,
} from '@/api/market/steel-quotes'
import {
  fetchProjectOptions,
  fetchProjectQuoteConfig,
} from '@/api/master/project-options'
import {
  fetchProjectPriceRules,
  type ProjectPriceRule,
} from '@/api/master/project-price-rules'
import { queryClient } from '@/lib/query-client'
import type { NetPriceQuoteSource } from '@/views/modules/net-price-check'

/**
 * 网价核查的**上游数据缓存**（只服务只读详情面的自动核查）。
 *
 * <p><b>为什么要缓存</b>：只读详情面（详情弹窗 / 列表行「+」展开）每次展开都会跑一遍核查，
 * 而核查要打 4~5 个 GET，其中最重的 `fetchMaterialPriceMatches` 还要**翻页拉整段行情**
 * （每页 200 行，最多 51 页）。同一张单反复展开、或者同一天多张单（取价日/时段相同）
 * 都会把这批数据重拉一遍 —— 这是纯浪费，因为同一取价日/时段的行情在同一时段内是稳定的。</p>
 *
 * <p><b>缓存放什么</b>：只缓存**上游输入**（行情行、取价日解析、项目取价配置、价格规定、
 * 项目下拉），不缓存"这张单的匹配结论"。结论仍然每次由
 * `computeNetPriceEntries(行, 索引, 规则)` 现算 —— 口径依旧只有一处实现，缓存不会让
 * "同一业务口径出现第二份算法"。行内容一变，`contextKey` 就变，结论自然重算。</p>
 *
 * <p><b>TTL 取值依据</b>（都不是随手写的）：</p>
 * <ul>
 *   <li>行情行 2 分钟：网价按「取价日 + 时段（上午/下午）」发布，同一时段内稳定；
 *     但当天下午可能再出价，所以不做长缓存，2 分钟后重新拉。</li>
 *   <li>取价日解析 60 秒：`resolveQuote` 依赖"今天是哪天、现在哪个时段"，
 *     跨过时段/零点必须重新解析，宁可短。</li>
 *   <li>项目取价配置 / 价格规定 / 项目下拉 5 分钟：主数据，改动频率低。</li>
 * </ul>
 *
 * <p>并发去重交给 react-query 本身（同一 key 在飞时 `fetchQuery` 复用同一个 promise），
 * 因此上层不再需要自己维护"同一份数据只请求一次"的登记表。</p>
 */

/** 缓存键命名空间：与其它业务查询隔离，测试里可以按前缀整体清理。 */
const NET_PRICE_CACHE_ROOT = 'net-price-check'

export const NET_PRICE_QUOTE_INDEX_STALE_MS = 2 * 60_000
export const NET_PRICE_QUOTE_RESOLUTION_STALE_MS = 60_000
export const NET_PRICE_MASTER_DATA_STALE_MS = 5 * 60_000

export const netPriceCheckQueryKeys = {
  root: [NET_PRICE_CACHE_ROOT] as const,
  quoteRows: (args: {
    quoteDate: string
    period?: string
    source?: NetPriceQuoteSource
    region?: string
  }) =>
    [
      NET_PRICE_CACHE_ROOT,
      'quote-rows',
      args.quoteDate,
      args.period ?? '',
      args.source ?? '',
      args.region ?? '',
    ] as const,
  quoteResolution: (args: {
    projectId: string
    orderDate?: string
    deliveryDate?: string
  }) =>
    [
      NET_PRICE_CACHE_ROOT,
      'quote-resolution',
      args.projectId,
      args.orderDate ?? '',
      args.deliveryDate ?? '',
    ] as const,
  quoteConfig: (projectId: string) =>
    [NET_PRICE_CACHE_ROOT, 'quote-config', projectId] as const,
  priceRules: (projectId: string) =>
    [NET_PRICE_CACHE_ROOT, 'price-rules', projectId] as const,
  customerProjects: (customerId: string) =>
    [NET_PRICE_CACHE_ROOT, 'customer-projects', customerId] as const,
}

/** 同步读缓存：`undefined` = 未缓存，`[]` = 已缓存且确实为空（两者语义不同，不能合并）。 */
function readCached<T>(
  queryKey: readonly unknown[],
  staleTimeMs: number,
): T | undefined {
  const state = queryClient.getQueryState(queryKey)
  if (!state || state.status !== 'success') return undefined
  // 必须同时判过期：只判 success 会让"曾经缓存过"变成"永远可用"
  if (!state.dataUpdatedAt) return undefined
  if (Date.now() - state.dataUpdatedAt >= staleTimeMs) return undefined
  return queryClient.getQueryData<T>(queryKey)
}

/* ---------- 行情行（最重的一份数据） ---------- */

export async function fetchNetPriceQuoteRows(
  args: {
    quoteDate: string
    period?: string
    source?: NetPriceQuoteSource
    region?: string
  },
  signal?: AbortSignal,
): Promise<MaterialPriceMatch[]> {
  return queryClient.fetchQuery({
    queryKey: netPriceCheckQueryKeys.quoteRows(args),
    queryFn: () =>
      fetchMaterialPriceMatches(
        args.quoteDate,
        args.period,
        { source: args.source, region: args.region },
        signal,
      ),
    staleTime: NET_PRICE_QUOTE_INDEX_STALE_MS,
  })
}

export function readCachedNetPriceQuoteRows(args: {
  quoteDate: string
  period?: string
  source?: NetPriceQuoteSource
  region?: string
}): MaterialPriceMatch[] | undefined {
  return readCached<MaterialPriceMatch[]>(
    netPriceCheckQueryKeys.quoteRows(args),
    NET_PRICE_QUOTE_INDEX_STALE_MS,
  )
}

/* ---------- 取价日/时段解析 ---------- */

export async function fetchNetPriceQuoteResolution(
  args: { projectId: string; orderDate?: string; deliveryDate?: string },
  signal?: AbortSignal,
) {
  return queryClient.fetchQuery({
    queryKey: netPriceCheckQueryKeys.quoteResolution(args),
    queryFn: () =>
      fetchPricingQuoteResolution(
        args.projectId,
        {
          ...(args.orderDate ? { orderDate: args.orderDate } : {}),
          ...(args.deliveryDate ? { deliveryDate: args.deliveryDate } : {}),
        },
        signal,
      ),
    staleTime: NET_PRICE_QUOTE_RESOLUTION_STALE_MS,
  })
}

export function readCachedNetPriceQuoteResolution(args: {
  projectId: string
  orderDate?: string
  deliveryDate?: string
}) {
  return readCached<Awaited<ReturnType<typeof fetchPricingQuoteResolution>>>(
    netPriceCheckQueryKeys.quoteResolution(args),
    NET_PRICE_QUOTE_RESOLUTION_STALE_MS,
  )
}

/* ---------- 主数据 ---------- */

export async function fetchNetPriceQuoteConfig(
  projectId: string,
  signal?: AbortSignal,
) {
  return queryClient.fetchQuery({
    queryKey: netPriceCheckQueryKeys.quoteConfig(projectId),
    queryFn: () => fetchProjectQuoteConfig(projectId, signal),
    staleTime: NET_PRICE_MASTER_DATA_STALE_MS,
  })
}

export function readCachedNetPriceQuoteConfig(projectId: string) {
  return readCached<Awaited<ReturnType<typeof fetchProjectQuoteConfig>>>(
    netPriceCheckQueryKeys.quoteConfig(projectId),
    NET_PRICE_MASTER_DATA_STALE_MS,
  )
}

export async function fetchNetPricePriceRules(
  projectId: string,
  signal?: AbortSignal,
): Promise<ProjectPriceRule[]> {
  return queryClient.fetchQuery({
    queryKey: netPriceCheckQueryKeys.priceRules(projectId),
    queryFn: () => fetchProjectPriceRules(projectId, signal),
    staleTime: NET_PRICE_MASTER_DATA_STALE_MS,
  })
}

export function readCachedNetPricePriceRules(
  projectId: string,
): ProjectPriceRule[] | undefined {
  return readCached<ProjectPriceRule[]>(
    netPriceCheckQueryKeys.priceRules(projectId),
    NET_PRICE_MASTER_DATA_STALE_MS,
  )
}

export async function fetchNetPriceCustomerProjects(
  customerId: string,
): Promise<Awaited<ReturnType<typeof fetchProjectOptions>>> {
  return queryClient.fetchQuery({
    queryKey: netPriceCheckQueryKeys.customerProjects(customerId),
    queryFn: () => fetchProjectOptions(customerId),
    staleTime: NET_PRICE_MASTER_DATA_STALE_MS,
  })
}

export function readCachedNetPriceCustomerProjects(customerId: string) {
  return readCached<Awaited<ReturnType<typeof fetchProjectOptions>>>(
    netPriceCheckQueryKeys.customerProjects(customerId),
    NET_PRICE_MASTER_DATA_STALE_MS,
  )
}

/**
 * 清掉本模块的缓存（仅供测试 / 需要强制重算时使用）。
 *
 * <p>注意：行情缓存被多张单共享，因此"重新展开另一张单"不应该清理它 —— 生产路径里
 * 只有"手动刷新"这类显式动作才需要调用。</p>
 */
export function clearNetPriceCheckCache(): void {
  queryClient.removeQueries({ queryKey: [NET_PRICE_CACHE_ROOT] })
}
