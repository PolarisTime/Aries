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
import { logger } from '@/utils/logger'
import type { PriceData, PriceSheet } from './types'

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

  const availabilityRange = useMemo(() => {
    const now = Date.now()
    // 本地时区日期, 避免 UTC 偏移导致边界日期错位
    const iso = (ms: number) => dayjs(ms).format('YYYY-MM-DD')
    return {
      from: iso(now - 120 * 86400000),
      to: iso(now + 14 * 86400000),
    }
  }, [])

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
  const calendarPeriods = activeRefDate
    ? availability[activeRefDate]?.length
      ? availability[activeRefDate]
      : Object.keys(data[activeRefDate] ?? {})
    : []
  // 日历尚未加载(如切换数据源后重新拉取)时回退单据自身时段, 避免发出空时段请求。
  const resolvedRefPeriod = activeRefDate
    ? !calendarPeriods.length
      ? activeRefPeriod
      : activeRefPeriod && calendarPeriods.includes(activeRefPeriod)
        ? activeRefPeriod
        : (calendarPeriods[0] ?? '')
    : ''
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

  const refPeriods = active?.refDate
    ? (availability[active.refDate] ?? Object.keys(data[active.refDate] ?? {}))
    : []

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
              ref: `${activeRefDate}${resolvedRefPeriod ? ` ${resolvedRefPeriod}` : ''}`,
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
