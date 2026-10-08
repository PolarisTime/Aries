import { useQuery } from '@tanstack/react-query'
import { getRuntimeConfig } from '@/api/system/runtime-config'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_LONG } from '@/constants/query-policies'
import { MarketSyncDetailCard } from './market-sync-detail-card'
import { MarketSyncMatrix } from './market-sync-matrix'
import { MarketSyncStatusBar } from './market-sync-status-bar'
import { MarketSyncToolbar } from './market-sync-toolbar'
import { useMarketSync } from './useMarketSync'

/** 行情同步: 覆盖矩阵(近30天) + 内联明细 + 单日/区间补数。 */
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
    source,
    setSource,
    region,
    setRegion,
  } = useMarketSync()

  return (
    <div className="price-compare-page">
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
        calendarFetching={calendarQuery.isFetching}
        onRefreshCalendar={() => void calendarQuery.refetch()}
        source={source}
        onSourceChange={setSource}
        region={region}
        onRegionChange={setRegion}
        quoteRegions={runtimeConfig?.business?.quoteRegions}
      />

      <MarketSyncStatusBar
        stats={stats}
        backfillStatus={backfillStatus}
        backfillTotalDays={backfillTotalDays}
      />

      <MarketSyncMatrix
        matrixDays={matrixDays}
        periods={activePeriods}
        calendars={calendars}
        selected={selected}
        syncingCell={syncingCell}
        onSyncDate={(date, period) => void onSyncDate(date, period)}
        onSelectQuote={selectQuote}
      />

      <MarketSyncDetailCard
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
