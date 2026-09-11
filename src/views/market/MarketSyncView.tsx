import { MarketSyncDetailCard } from './market-sync-detail-card'
import { MarketSyncMatrix } from './market-sync-matrix'
import { MarketSyncStatusBar } from './market-sync-status-bar'
import { MarketSyncToolbar } from './market-sync-toolbar'
import { useMarketSync } from './useMarketSync'

/** 行情同步: 覆盖矩阵(近30天) + 内联明细 + 单日/区间补数。 */
export function MarketSyncView() {
  const {
    applyFilters,
    backfillDays,
    backfillStatus,
    backfillTotalWeekdays,
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
    syncingDate,
  } = useMarketSync()

  return (
    <div className="price-compare-page">
      <MarketSyncToolbar
        singleDate={singleDate}
        onSingleDateChange={setSingleDate}
        syncing={syncing}
        onSync={() => void onSync()}
        backfillDays={backfillDays}
        onBackfillDaysChange={setBackfillDays}
        backfilling={backfilling}
        onBackfill={() => void onBackfill()}
        calendarFetching={calendarQuery.isFetching}
        onRefreshCalendar={() => void calendarQuery.refetch()}
      />

      <MarketSyncStatusBar
        stats={stats}
        backfillStatus={backfillStatus}
        backfillTotalWeekdays={backfillTotalWeekdays}
      />

      <MarketSyncMatrix
        matrixDays={matrixDays}
        calendars={calendars}
        selected={selected}
        syncingDate={syncingDate}
        onSyncDate={(date) => void onSyncDate(date)}
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
