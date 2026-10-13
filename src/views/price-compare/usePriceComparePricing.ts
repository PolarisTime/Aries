import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchMaterialPriceMatches,
  fetchSteelQuoteCalendars,
} from '@/api/market/steel-quotes'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_STATIC } from '@/constants/query-policies'
import { message } from '@/utils/antd-app'
import { formatDate } from '@/utils/formatters'
import { logger } from '@/utils/logger'
import type { PriceData, PriceSheet } from './types'

/** 网价日历查询窗口: 近 120 天 ~ 未来 14 天。 */
const AVAILABILITY_PAST_DAYS = 120
const AVAILABILITY_FUTURE_DAYS = 14
const DAY_MS = 86400000
type AvailabilityRange = { from: string; to: string }
type AvailabilityMap = Record<string, string[]>

/**
 * 日历窗口按首次渲染时刻计算。
 * `Date.now()` 不能出现在组件/Hook 里(渲染期调用不纯函数, 用 useMemo 掩盖同样属于渲染期),
 * 因此把取值整体放到组件外的普通函数, 再由 useState 惰性初始化调用一次。
 */
function buildAvailabilityRange(): AvailabilityRange {
  const now = Date.now()
  // 本地时区日期, 避免 UTC 偏移导致边界日期错位
  const iso = (ms: number) => dayjs(ms).format('YYYY-MM-DD')
  return {
    from: iso(now - AVAILABILITY_PAST_DAYS * DAY_MS),
    to: iso(now + AVAILABILITY_FUTURE_DAYS * DAY_MS),
  }
}

/** 日历时段优先; 日历未加载时回退单据自身含有的时段。 */
function resolveCalendarPeriods(
  activeRefDate: string,
  availability: AvailabilityMap,
  data: PriceData,
): string[] {
  if (!activeRefDate) return []
  if (availability[activeRefDate]?.length) return availability[activeRefDate]
  return Object.keys(data[activeRefDate] ?? {})
}

/** 最终参照时段: 日历里有该时段就沿用, 否则取日历首个时段; 日历缺失时用单据自身时段。 */
function resolveRefPeriod(
  activeRefDate: string,
  activeRefPeriod: string,
  calendarPeriods: string[],
): string {
  if (!activeRefDate) return ''
  if (!calendarPeriods.length) return activeRefPeriod
  if (activeRefPeriod && calendarPeriods.includes(activeRefPeriod)) {
    return activeRefPeriod
  }
  return calendarPeriods[0] ?? ''
}

/** 参照日期对应的可选时段列表。 */
function resolveRefPeriods(
  refDate: string | undefined,
  availability: AvailabilityMap,
  data: PriceData,
): string[] {
  if (!refDate) return []
  return availability[refDate] ?? Object.keys(data[refDate] ?? {})
}

export function usePriceComparePricing({
  active,
  data,
  isAuthenticated,
  quoteSource,
  quoteRegion,
}: {
  active: PriceSheet | undefined
  data: PriceData
  isAuthenticated: boolean
  quoteSource?: 'MYSTEEL' | 'STEELX'
  quoteRegion?: string
}) {
  const { t } = useTranslation()
  const [refreshing, setRefreshing] = useState(false)

  const [availabilityRange] = useState(() => buildAvailabilityRange())

  const availabilityQuery = useQuery({
    // 日历按数据源/地区区分: 西本仅上午, 不能复用 Mysteel 的时段缓存。
    queryKey: QUERY_KEYS.priceCompare.steelQuoteCalendars(
      availabilityRange.from,
      availabilityRange.to,
      quoteSource,
      quoteRegion,
    ),
    queryFn: ({ signal }) =>
      fetchSteelQuoteCalendars(
        availabilityRange.from,
        availabilityRange.to,
        signal,
        quoteSource,
        quoteRegion,
      ),
    enabled: isAuthenticated,
    staleTime: STALE_STATIC,
    retry: 1,
  })

  const availability = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const row of availabilityQuery.data ?? [])
      map[row.quoteDate] = row.periods
    return map
  }, [availabilityQuery.data])

  const activeSheetId = active?.id ?? ''
  const activeRefDate = active?.refDate ?? ''
  const activeRefPeriod = active?.refPeriod ?? ''
  const isLatestRef = Boolean(active) && !activeRefDate
  const calendarPeriods = resolveCalendarPeriods(
    activeRefDate,
    availability,
    data,
  )
  // 日历尚未加载(如切换数据源后重新拉取)时回退单据自身时段, 避免发出空时段请求。
  const resolvedRefPeriod = resolveRefPeriod(
    activeRefDate,
    activeRefPeriod,
    calendarPeriods,
  )
  const hasResolvedPriceData = Boolean(
    activeRefDate &&
      resolvedRefPeriod &&
      Object.keys(data[activeRefDate]?.[resolvedRefPeriod] ?? {}).length,
  )

  const matchesQuery = useQuery({
    queryKey: QUERY_KEYS.priceCompare.materialPriceMatches(
      activeRefDate,
      resolvedRefPeriod,
      quoteSource,
      quoteRegion,
    ),
    queryFn: ({ signal }) =>
      fetchMaterialPriceMatches(
        activeRefDate,
        activeRefDate ? resolvedRefPeriod : undefined,
        { source: quoteSource, region: quoteRegion },
        signal,
      ),
    enabled:
      isAuthenticated &&
      Boolean(activeSheetId) &&
      (isLatestRef || (Boolean(resolvedRefPeriod) && !hasResolvedPriceData)),
    staleTime: STALE_STATIC,
    retry: 1,
  })

  const refPeriods = resolveRefPeriods(active?.refDate, availability, data)

  /** 刷新失败的统一提示: 手动判定出的错误与网络异常走同一条路径。 */
  const reportRefreshFailure = (error: unknown) => {
    logger.error('读取网价失败', error)
    message.error(
      t('priceCompare.pricing.refreshFailed', {
        message:
          error instanceof Error
            ? error.message
            : t('priceCompare.pricing.retryLater'),
      }),
    )
  }

  /** 刷新读取: 重新拉取当前参照日期/时段的后端网价(不对后端做同步操作)。 */
  const onRefreshPrice = async () => {
    if (!isAuthenticated) {
      message.error(t('priceCompare.pricing.loginRequired'))
      return
    }
    setRefreshing(true)
    try {
      await availabilityQuery.refetch()
      // 参照对象已失效时不再提示, 但下面的收尾照旧执行(与原来的 finally 等价)。
      if (active) {
        const result = await matchesQuery.refetch()
        if (result.error) {
          // 不用 throw: try 内抛错会命中「ThrowStatement inside of try/catch」,
          // 也会让这个 Hook 无法被编译器优化。
          reportRefreshFailure(result.error)
        } else if (!activeRefDate) {
          message.success(t('priceCompare.pricing.refreshedLatest'))
        } else {
          message.success(
            t('priceCompare.pricing.refreshedWithRef', {
              ref: `${formatDate(activeRefDate)}${resolvedRefPeriod ? ` ${resolvedRefPeriod}` : ''}`,
            }),
          )
        }
      }
    } catch (error) {
      reportRefreshFailure(error)
    }
    // 不用 try/finally: React Compiler 不支持带 finally 的 TryStatement(react-hooks-js/todo)。
    setRefreshing(false)
  }

  return {
    activeRefDate,
    activeRefPeriod,
    activeSheetId,
    availability,
    isLatestRef,
    matchesData: matchesQuery.data,
    onRefreshPrice,
    refPeriods,
    refreshing,
    resolvedRefPeriod,
  }
}
