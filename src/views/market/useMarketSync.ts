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
import { formatDate } from '@/utils/formatters'
import { logger } from '@/utils/logger'
import {
  BACKFILL_POLL_INTERVAL_MS,
  type CalendarMap,
  csvCell,
  type Filters,
  isTradingDay,
  MATRIX_DAYS,
  MAX_WINDOW_PAGES,
  PAGE_SIZE,
  PERIODS,
  type QuoteSort,
  today,
} from './market-sync-model'

export function useMarketSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isPageVisible = usePageVisibility()
  const queryClient = useQueryClient()

  const [selectedIntent, setSelected] = useState<{
    date: string
    period: string
  }>({ date: '', period: '' })

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

  /**
   * 矩阵窗口页码：0 = 最近一段（结束于今天），1 = 再往前一段…
   *
   * <p>窗口按整段（{@link MATRIX_DAYS} 天）翻动而不是按天平移：用户看的是"这一段覆盖得怎么样"，
   * 翻页后首尾日期保持整段对齐，日历接口的 (from, to) 也不会因为按天平移而每次都变。</p>
   */
  const [windowPage, setWindowPage] = useState(0)

  const matrixDays = useMemo(() => {
    const offset = windowPage * MATRIX_DAYS
    const days: string[] = []
    for (let i = 0; i < MATRIX_DAYS; i += 1)
      days.push(
        dayjs()
          .subtract(offset + i, 'day')
          .format('YYYY-MM-DD'),
      )
    return days
  }, [windowPage])

  /** 当前窗口的首尾日期（首 = 最早，尾 = 最新）。整页文案与翻页标签都取这一处。 */
  const windowRange = useMemo(() => {
    const days = matrixDays
    return {
      from: days[days.length - 1],
      to: days[0],
    }
  }, [matrixDays])

  const calendarRange = useMemo(
    () => ({
      from: windowRange.from,
      // 结束日 +1 天：后端区间是左闭右开的日历查询, 保证窗口最后一天被覆盖
      to: dayjs(windowRange.to).add(1, 'day').format('YYYY-MM-DD'),
    }),
    [windowRange],
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
        closed: Boolean(row.closed),
      }
    return map
  }, [calendarQuery.data])

  /**
   * 日历数据到达后自动选中最新时段。
   *
   * <p>改为**渲染期派生**而不是在 effect 里 setState: 后者会先渲染一次空选中、再因
   * setState 触发第二次渲染(react-doctor 的 set-state-in-effect), 而这里完全可以从
   * 现有数据推出结果, 不需要额外一轮。</p>
   */
  const latestSelection = useMemo(() => {
    const latest = Object.keys(calendars).sort().reverse()[0]
    if (!latest) return undefined
    return { date: latest, period: calendars[latest]?.periods[0] ?? '' }
  }, [calendars])

  /** 用户点选过的日期失效时(已被删除/换数据源)回退到最新可用时段。 */
  const selected =
    selectedIntent.date && calendars[selectedIntent.date]
      ? selectedIntent
      : (latestSelection ?? selectedIntent)

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
    let tradingDays = 0
    let covered = 0
    let missingSlots = 0
    for (const date of matrixDays) {
      const entry = calendars[date]
      // 交易日判据与覆盖矩阵完全一致: 有行情即交易日; 后端标记的休市日与"周末且无行情"都不是。
      // 后端标记的休市日(节假日)不占分母, 否则会把"本来就没有行情"算成漏数。
      if (!isTradingDay(date, entry)) continue
      tradingDays += 1
      const count = entry?.periods.length ?? 0
      if (count > 0) covered += 1
      // 时段数按展示口径取差; 已同步时段多于展示时段时不产生负数缺口
      missingSlots += Math.max(activePeriods.length - count, 0)
    }
    const todayEntry = calendars[today()]
    return { tradingDays, covered, missingSlots, todayEntry }
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
          date: formatDate(result.articleDate),
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
      /*
       * 失败也要刷新日历: 「站点该日未发布行情」会被后端记为休市日, 刷新后该格才会从
       * 「缺(可同步)」变成「休市」, 否则用户看到的还是那个点不动的缺失格。
       */
      void calendarQuery.refetch()
    }
    // 收尾放在 try/catch 之外而不是 finally: React Compiler 遇到 try/finally 会直接
    // 放弃整段函数的自动记忆化(BuildHIR::lowerStatement), 这三种回调都受影响。
    setSyncing(false)
  }

  const onBackfill = async () => {
    setBackfilling(true)
    try {
      const result = await backfillSteelQuotes(backfillDays, { source, region })
      message.success(
        i18next.t('marketSync.backfillAccepted', {
          from: formatDate(result.from),
          to: formatDate(result.to),
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
    }
    // 同上: 避免 try/finally 让编译器放弃该函数的自动记忆化
    setBackfilling(false)
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
          date: formatDate(result.articleDate),
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
      // 该日被后端判定为休市(节假日)时, 刷新后这一格才会显示「休市」而不是继续显示「缺」
      void calendarQuery.refetch()
    }
    // 同上: 避免 try/finally 让编译器放弃该函数的自动记忆化
    setSyncingCell(null)
  }

  // 补数不再按周末盲跳(节假日/调休并不服从周末规则)，进度分母就是区间总天数。
  const backfillTotalDays = (() => {
    if (!backfillStatus?.from || !backfillStatus?.to) return 0
    return dayjs(backfillStatus.to).diff(dayjs(backfillStatus.from), 'day') + 1
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
          formatDate(row.quoteDate),
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
        date: formatDate(selected.date),
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
    /** 窗口翻页: 0 = 最近一段; 只允许往过去翻, 不能翻到未来 */
    windowPage,
    windowRange,
    canPrevWindow: windowPage < MAX_WINDOW_PAGES - 1,
    canNextWindow: windowPage > 0,
    isLatestWindow: windowPage === 0,
    onPrevWindow: () => setWindowPage((page) => page + 1),
    onNextWindow: () => setWindowPage((page) => Math.max(0, page - 1)),
    onLatestWindow: () => setWindowPage(0),
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
    backfillTotalDays,
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
