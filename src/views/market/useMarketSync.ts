import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  backfillSteelQuotes,
  fetchBackfillStatus,
  fetchSteelQuoteCalendars,
  fetchSteelQuotes,
  type SteelQuote,
  type SteelQuoteBackfillStatus,
  syncSteelQuotes,
} from '@/api/market/steel-quotes'
import { QUERY_KEYS } from '@/constants/query-keys'
import { usePageVisibility } from '@/hooks/usePageVisibility'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
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

  const [singleDate, setSingleDate] = useState<string>(() => today())
  const [syncing, setSyncing] = useState(false)
  const [backfillDays, setBackfillDays] = useState<number>(30)
  const [backfilling, setBackfilling] = useState(false)
  const [syncingDate, setSyncingDate] = useState<string | null>(null)

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
    queryKey: QUERY_KEYS.marketCalendar(calendarRange.from, calendarRange.to),
    queryFn: ({ signal }) =>
      fetchSteelQuoteCalendars(calendarRange.from, calendarRange.to, signal),
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
    }),
    [selected.date, selected.period, applied, sort, quotePage],
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
      missingSlots += PERIODS.length - count
    }
    const todayEntry = calendars[today()]
    return { weekdays: weekdays.length, covered, missingSlots, todayEntry }
  }, [matrixDays, calendars])

  const onSync = async () => {
    setSyncing(true)
    try {
      const result = await syncSteelQuotes(singleDate || undefined)
      message.success(
        `同步完成：${result.articleDate} ${result.periods?.join('/') ?? result.period}，${result.rowCount} 行${result.created ? '' : '（已存在）'}`,
      )
      await calendarQuery.refetch()
      selectQuote(result.articleDate, result.period)
    } catch (error) {
      console.error('同步失败', error)
      message.error(
        `同步失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncing(false)
    }
  }

  const onBackfill = async () => {
    setBackfilling(true)
    try {
      const result = await backfillSteelQuotes(backfillDays)
      message.success(
        `已受理补数：${result.from} ~ ${result.to}（后台执行，完成后自动刷新）`,
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
      console.error('补数失败', error)
      message.error(
        `补数失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setBackfilling(false)
    }
  }

  /** 手动同步某一天(矩阵缺失格子点击)。 */
  const onSyncDate = async (date: string) => {
    setSyncingDate(date)
    try {
      const result = await syncSteelQuotes(date)
      message.success(
        `已同步 ${result.articleDate} ${result.periods?.join('/') ?? result.period}，${result.rowCount} 行`,
      )
      await calendarQuery.refetch()
      selectQuote(result.articleDate, result.period)
    } catch (error) {
      console.error('同步失败', error)
      message.error(
        `同步失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncingDate(null)
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
        })
        all.push(...rows)
        if (all.length >= total || rows.length < 200) break
      }
      const header = [
        '日期',
        '时段',
        '品牌/钢厂',
        '品名',
        '材质',
        '规格',
        '价格(元/吨)',
        '涨跌',
        '备注',
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
      link.download = `行情明细_${selected.date}_${selected.period}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success(`已导出 ${all.length} 行`)
    } catch (error) {
      console.error('导出失败', error)
      message.error('导出失败，请稍后重试')
    }
  }

  return {
    selected,
    singleDate,
    setSingleDate,
    syncing,
    backfillDays,
    setBackfillDays,
    backfilling,
    syncingDate,
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
