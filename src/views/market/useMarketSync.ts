import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import i18next from 'i18next'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  backfillSteelQuotes,
  fetchBackfillStatus,
  fetchSteelQuoteCalendars,
  fetchSteelQuotes,
  type MarketQuoteSource,
  type SteelQuote,
  type SteelQuoteBackfillStatus,
  syncSteelQuotes,
} from '@/api/market/steel-quotes'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import { logger } from '@/utils/logger'
import {
  BACKFILL_POLL_INTERVAL_MS,
  type CalendarMap,
  csvCell,
  type Filters,
  MATRIX_DAYS,
  PAGE_SIZE,
  PERIODS,
  type QuoteSort,
  today,
} from './market-sync-model'

export function useMarketSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isPageVisible = usePageVisibility()
  const queryClient = useQueryClient()

  const [selected, setSelected] = useState<{ date: string; period: string }>({
    date: '',
    period: '',
  })

  const [source, setSource] = useState<MarketQuoteSource>('MYSTEEL')
  const [region, setRegion] = useState<string | undefined>(undefined)
  const [singleDate, setSingleDate] = useState<string>(() => today())
  const [syncPeriods, setSyncPeriods] = useState<string[]>(() => [...PERIODS])
  const [syncing, setSyncing] = useState(false)
  const [backfillDays, setBackfillDays] = useState<number>(30)
  const [backfilling, setBackfilling] = useState(false)
  const [syncingCell, setSyncingCell] = useState<string | null>(null)

  const [form, setForm] = useState<Filters>({})
  const [applied, setApplied] = useState<Filters>({})
  const [sort, setSort] = useState<QuoteSort>({})
  const [quotePage, setQuotePage] = useState(0)

  const matrixDays = useMemo(() => {
    const days: string[] = []
    for (let i = 0; i < MATRIX_DAYS; i += 1)
      days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'))
    return days
  }, [])

  const calendarRange = useMemo(
    () => ({
      from: dayjs()
        .subtract(MATRIX_DAYS - 1, 'day')
        .format('YYYY-MM-DD'),
      to: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    }),
    [],
  )

  const calendarQuery = useQuery({
    queryKey: QUERY_KEYS.marketCalendar(
      calendarRange.from,
      calendarRange.to,
      source,
      region,
    ),
    queryFn: ({ signal }) =>
      fetchSteelQuoteCalendars(
        calendarRange.from,
        calendarRange.to,
        signal,
        source,
        region,
      ),
    enabled: isAuthenticated,
    staleTime: 60_000,
  })

  const calendars = useMemo<CalendarMap>(() => {
    const map: CalendarMap = {}
    for (const row of calendarQuery.data ?? [])
      map[row.quoteDate] = {
        periods: row.periods,
        rows: row.periodRows ?? {},
      }
    return map
  }, [calendarQuery.data])

  useEffect(() => {
    if (!calendarQuery.data) return
    setSelected((current) => {
      if (current.date && calendars[current.date]) return current
      const latest = Object.keys(calendars).sort().reverse()[0]
      if (!latest) return current
      return { date: latest, period: calendars[latest]?.periods[0] ?? '' }
    })
  }, [calendarQuery.data, calendars])

  const quotesParams = useMemo(
    () => ({
      quoteDate: selected.date,
      period: selected.period,
      breed: applied.breed || undefined,
      material: applied.material || undefined,
      factory: applied.factory || undefined,
      spec: applied.spec || undefined,
      change: applied.change || undefined,
      sortBy: sort.field,
      direction: sort.order,
      page: quotePage,
      size: PAGE_SIZE,
      source,
      region,
    }),
    [selected.date, selected.period, applied, sort, quotePage, source, region],
  )

  const quotesQuery = useQuery({
    queryKey: QUERY_KEYS.marketQuotes(quotesParams),
    queryFn: ({ signal }) => fetchSteelQuotes(quotesParams, signal),
    enabled: isAuthenticated && Boolean(selected.date && selected.period),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })

  const quotes = quotesQuery.data?.rows ?? []
  const quoteTotal = quotesQuery.data?.total ?? 0

  const backfillStatusQuery = useQuery({
    queryKey: QUERY_KEYS.marketBackfillStatus,
    queryFn: ({ signal }) => fetchBackfillStatus(signal),
    enabled: isAuthenticated,
    refetchInterval: (query) =>
      isPageVisible && query.state.data?.running
        ? BACKFILL_POLL_INTERVAL_MS
        : false,
  })

  const backfillStatus = backfillStatusQuery.data ?? null

  const wasBackfillRunning = useRef(false)
  useEffect(() => {
    const running = backfillStatus?.running ?? false
    if (wasBackfillRunning.current && !running) {
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.marketCalendarsBase,
      })
    }
    wasBackfillRunning.current = running
  }, [backfillStatus?.running, queryClient])

  const applyFilters = (next: Filters) => {
    setApplied(next)
    setQuotePage(0)
  }

  const resetFilters = () => {
    setForm({})
    setApplied({})
    setSort({})
    setQuotePage(0)
  }

  const changeSort = (next: QuoteSort) => {
    setSort(next)
    setQuotePage(0)
  }

  const selectQuote = (date: string, period: string) => {
    setSelected({ date, period })
    setQuotePage(0)
  }

  /** 该数据源展示的时段: 西本每天仅一个价(上午)。 */
  const activePeriods = useMemo<readonly string[]>(
    () => (source === 'STEELX' ? ['上午'] : PERIODS),
    [source],
  )

  // 概览统计
  const stats = useMemo(() => {
    const weekdays = matrixDays.filter((date) => {
      const dow = dayjs(date).day()
      return dow !== 0 && dow !== 6
    })
    let covered = 0
    let missingSlots = 0
    for (const date of weekdays) {
      const entry = calendars[date]
      const count = entry?.periods.length ?? 0
      if (count > 0) covered += 1
      missingSlots += activePeriods.length - count
    }
    const todayEntry = calendars[today()]
    return { weekdays: weekdays.length, covered, missingSlots, todayEntry }
  }, [matrixDays, calendars, activePeriods])

  const onSync = async () => {
    setSyncing(true)
    try {
      const result = await syncSteelQuotes(
        singleDate || undefined,
        syncPeriods,
        {
          source,
          region,
        },
      )
      const synced = result.periods?.length ? result.periods : [result.period]
      message.success(
        i18next.t('marketSync.syncDone', {
          date: result.articleDate,
          periods: synced.join('/'),
          rows: result.rowCount,
          exists: result.created ? '' : i18next.t('marketSync.syncDoneExists'),
        }),
      )
      const syncedSet = new Set(synced)
      const missing = syncPeriods.filter((p) => !syncedSet.has(p))
      if (missing.length > 0) {
        message.warning(
          i18next.t('marketSync.syncMissingPeriods', {
            periods: missing.join('/'),
          }),
        )
      }
      await calendarQuery.refetch()
      selectQuote(result.articleDate, result.period)
    } catch (error) {
      logger.error(i18next.t('marketSync.syncFailed'), error)
      message.error(
        `${i18next.t('marketSync.syncFailed')}：${error instanceof Error ? error.message : i18next.t('marketSync.retryLater')}`,
      )
    } finally {
      setSyncing(false)
    }
  }

  const onBackfill = async () => {
    setBackfilling(true)
    try {
      const result = await backfillSteelQuotes(backfillDays, { source, region })
      message.success(
        i18next.t('marketSync.backfillAccepted', {
          from: result.from,
          to: result.to,
        }),
      )
      queryClient.setQueryData<SteelQuoteBackfillStatus>(
        QUERY_KEYS.marketBackfillStatus,
        {
          running: true,
          from: result.from,
          to: result.to,
          syncedDays: 0,
          failedDays: 0,
          totalRows: 0,
        },
      )
      void backfillStatusQuery.refetch()
    } catch (error) {
      logger.error(i18next.t('marketSync.backfillFailed'), error)
      message.error(
        `${i18next.t('marketSync.backfillFailed')}：${error instanceof Error ? error.message : i18next.t('marketSync.retryLater')}`,
      )
    } finally {
      setBackfilling(false)
    }
  }

  /** 同步某天(可指定时段); 矩阵缺失格子点击时只同步该日该时段。 */
  const onSyncDate = async (date: string, period?: string) => {
    const periods = period ? [period] : syncPeriods
    setSyncingCell(period ? `${date}|${period}` : date)
    try {
      const result = await syncSteelQuotes(date, periods, { source, region })
      const synced = result.periods?.length ? result.periods : [result.period]
      message.success(
        i18next.t('marketSync.syncedRows', {
          date: result.articleDate,
          periods: synced.join('/'),
          rows: result.rowCount,
        }),
      )
      await calendarQuery.refetch()
      selectQuote(result.articleDate, result.period)
    } catch (error) {
      logger.error(i18next.t('marketSync.syncFailed'), error)
      message.error(
        `${i18next.t('marketSync.syncFailed')}：${error instanceof Error ? error.message : i18next.t('marketSync.retryLater')}`,
      )
    } finally {
      setSyncingCell(null)
    }
  }

  const backfillTotalWeekdays = (() => {
    if (!backfillStatus?.from || !backfillStatus?.to) return 0
    let count = 0
    let cursor = dayjs(backfillStatus.from)
    const end = dayjs(backfillStatus.to)
    while (!cursor.isAfter(end)) {
      const dow = cursor.day()
      if (dow !== 0 && dow !== 6) count += 1
      cursor = cursor.add(1, 'day')
    }
    return count
  })()

  /** 导出当前筛选下的全部明细为 CSV。 */
  const onExport = async () => {
    if (!selected.date || !selected.period) return
    try {
      const all: SteelQuote[] = []
      for (let page = 0; page < 50; page += 1) {
        const { rows, total } = await fetchSteelQuotes({
          quoteDate: selected.date,
          period: selected.period,
          breed: applied.breed || undefined,
          material: applied.material || undefined,
          factory: applied.factory || undefined,
          spec: applied.spec || undefined,
          change: applied.change || undefined,
          sortBy: sort.field,
          direction: sort.order,
          page,
          size: 200,
          source,
          region,
        })
        all.push(...rows)
        if (all.length >= total || rows.length < 200) break
      }
      const header = [
        i18next.t('marketSync.matrixDate'),
        i18next.t('marketSync.period'),
        i18next.t('marketSync.columnFactory'),
        i18next.t('marketSync.columnBreed'),
        i18next.t('marketSync.columnMaterial'),
        i18next.t('marketSync.columnSpec'),
        i18next.t('marketSync.columnPrice'),
        i18next.t('marketSync.columnChange'),
        i18next.t('marketSync.columnRemark'),
      ]
      const lines = all.map((row) =>
        [
          row.quoteDate,
          row.period,
          row.factory,
          row.breed,
          row.material,
          row.spec,
          row.price,
          row.changeVal,
          row.remark,
        ]
          .map(csvCell)
          .join(','),
      )
      const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = i18next.t('marketSync.exportFileName', {
        date: selected.date,
        period: selected.period,
      })
      link.click()
      URL.revokeObjectURL(url)
      message.success(i18next.t('marketSync.exported', { rows: all.length }))
    } catch (error) {
      logger.error(i18next.t('marketSync.exportFailed'), error)
      message.error(i18next.t('marketSync.exportFailed'))
    }
  }

  return {
    activePeriods,
    selected,
    source,
    setSource,
    region,
    setRegion,
    singleDate,
    setSingleDate,
    syncPeriods,
    setSyncPeriods,
    syncing,
    backfillDays,
    setBackfillDays,
    backfilling,
    syncingCell,
    form,
    setForm,
    sort,
    quotePage,
    setQuotePage,
    matrixDays,
    calendars,
    calendarQuery,
    quotesQuery,
    quotes,
    quoteTotal,
    backfillStatus,
    backfillTotalWeekdays,
    stats,
    applyFilters,
    resetFilters,
    changeSort,
    selectQuote,
    onSync,
    onBackfill,
    onSyncDate,
    onExport,
  }
}
