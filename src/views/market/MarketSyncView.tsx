import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_LONG } from '@/constants/query-policies'
import { MarketSyncDetailDrawer } from './market-sync-detail-drawer'
import { MarketSyncGapList } from './market-sync-gap-list'
import { MarketSyncMatrix } from './market-sync-matrix'
import {
  latestQuotedSlot,
  MarketSyncMetrics,
  MarketSyncNotices,
} from './market-sync-metrics'
import { MarketSyncHeader, MarketSyncToolbar } from './market-sync-toolbar'
import { useMarketSync } from './useMarketSync'
import './market-sync.css'

/**
 * 行情同步: 指标概览 + 覆盖矩阵(近30天, 时段×日期) + 右侧明细抽屉 + 单日/区间补数。
 *
 * 布局自上而下: 页首(标题/全局动作) → 分组操作条 → 指标概览 → 补数过程与异常
 * → 覆盖矩阵 → 明细抽屉。页面根是唯一的纵向滚动容器。
 */
export function MarketSyncView() {
  const { data: runtimeConfig } = useQuery({
    queryKey: QUERY_KEYS.runtimeConfig,
    queryFn: getRuntimeConfig,
    staleTime: STALE_LONG,
  })

  const {
    applyFilters,
    backfillDays,
    backfillStatus,
    backfillTotalDays,
    backfilling,
    calendarQuery,
    calendars,
    changeSort,
    form,
    matrixDays,
    onBackfill,
    onExport,
    onSync,
    onSyncDate,
    quotePage,
    quoteTotal,
    quotes,
    quotesQuery,
    resetFilters,
    selectQuote,
    selected,
    setBackfillDays,
    setForm,
    setQuotePage,
    setSingleDate,
    singleDate,
    sort,
    stats,
    syncing,
    syncPeriods,
    setSyncPeriods,
    syncingCell,
    activePeriods,
    windowRange,
    canPrevWindow,
    canNextWindow,
    isLatestWindow,
    onPrevWindow,
    onNextWindow,
    source,
    setSource,
    region,
    setRegion,
  } = useMarketSync()

  /** 明细抽屉的显隐: 由矩阵点选驱动, 与 selected 分开以便关闭后保留选择。 */
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <div className="market-sync-page">
      <MarketSyncHeader
        calendarFetching={calendarQuery.isFetching}
        onRefreshCalendar={() => void calendarQuery.refetch()}
        source={source}
        onSourceChange={setSource}
        region={region}
        onRegionChange={setRegion}
        quoteRegions={runtimeConfig?.business?.quoteRegions}
      />

      <MarketSyncToolbar
        singleDate={singleDate}
        onSingleDateChange={setSingleDate}
        syncing={syncing}
        onSync={() => void onSync()}
        syncPeriods={syncPeriods}
        onSyncPeriodsChange={setSyncPeriods}
        backfillDays={backfillDays}
        onBackfillDaysChange={setBackfillDays}
        backfilling={backfilling}
        onBackfill={() => void onBackfill()}
        source={source}
      />

      <MarketSyncMetrics
        periods={activePeriods}
        stats={stats}
        latest={latestQuotedSlot(calendars)}
      />

      <MarketSyncNotices
        backfillStatus={backfillStatus}
        backfillTotalDays={backfillTotalDays}
      />

      <div className="market-sync-body">
        <MarketSyncMatrix
          windowRange={windowRange}
          windowCanPrev={canPrevWindow}
          windowCanNext={canNextWindow}
          windowIsLatest={isLatestWindow}
          onPrevWindow={onPrevWindow}
          onNextWindow={onNextWindow}
          matrixDays={matrixDays}
          periods={activePeriods}
          calendars={calendars}
          selected={selected}
          syncingCell={syncingCell}
          onSyncDate={(date, period) => void onSyncDate(date, period)}
          onSelectQuote={(date, period) => {
            selectQuote(date, period)
            setDetailOpen(true)
          }}
        />

        <MarketSyncGapList
          calendars={calendars}
          matrixDays={matrixDays}
          periods={activePeriods}
          syncingCell={syncingCell}
          onSyncDate={(date, period) => void onSyncDate(date, period)}
        />
      </div>

      <MarketSyncDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        selected={selected}
        form={form}
        onFormChange={setForm}
        onApplyFilters={() => applyFilters(form)}
        onResetFilters={resetFilters}
        onExport={() => void onExport()}
        quoteTotal={quoteTotal}
        quotes={quotes}
        quotesFetching={quotesQuery.isFetching}
        sort={sort}
        onChangeSort={changeSort}
        quotePage={quotePage}
        onPageChange={setQuotePage}
      />
    </div>
  )
}
