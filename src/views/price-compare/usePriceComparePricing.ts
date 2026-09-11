import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import {
  fetchMaterialPriceMatches,
  fetchSteelQuoteCalendars,
} from '@/api/market/steel-quotes'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_STATIC } from '@/constants/query-policies'
import { message } from '@/utils/antd-app'
import type { PriceData, PriceSheet } from './types'

export function usePriceComparePricing({
  active,
  data,
  isAuthenticated,
}: {
  active: PriceSheet | undefined
  data: PriceData
  isAuthenticated: boolean
}) {
  const [refreshing, setRefreshing] = useState(false)

  const availabilityRange = useMemo(() => {
    const now = Date.now()
    const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
    return {
      from: iso(now - 120 * 86400000),
      to: iso(now + 14 * 86400000),
    }
  }, [])

  const availabilityQuery = useQuery({
    queryKey: QUERY_KEYS.priceCompare.steelQuoteCalendars(
      availabilityRange.from,
      availabilityRange.to,
    ),
    queryFn: ({ signal }) =>
      fetchSteelQuoteCalendars(
        availabilityRange.from,
        availabilityRange.to,
        signal,
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
  const resolvedRefPeriod = activeRefDate
    ? activeRefPeriod && calendarPeriods.includes(activeRefPeriod)
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
    ),
    queryFn: ({ signal }) =>
      fetchMaterialPriceMatches(
        activeRefDate,
        activeRefDate ? resolvedRefPeriod : undefined,
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

  /** 刷新读取: 重新拉取当前参照日期/时段的后端网价(不对后端做同步操作)。 */
  const onRefreshPrice = async () => {
    if (!isAuthenticated) {
      message.error('请先登录后再读取网价')
      return
    }
    setRefreshing(true)
    try {
      await availabilityQuery.refetch()
      if (!active) return
      const result = await matchesQuery.refetch()
      if (result.error) throw result.error
      if (!activeRefDate) {
        message.success('已读取最新网价')
        return
      }
      message.success(
        `已读取 ${activeRefDate}${resolvedRefPeriod ? ` ${resolvedRefPeriod}` : ''} 网价`,
      )
    } catch (error) {
      console.error('读取网价失败', error)
      message.error(
        `读取网价失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setRefreshing(false)
    }
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
