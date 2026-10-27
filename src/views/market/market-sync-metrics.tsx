import { Alert, Flex, Progress, Tag, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SteelQuoteBackfillStatus } from '@/api/market/steel-quotes'
import { formatDate } from '@/utils/formatters'
import { type CalendarMap, PERIODS } from './market-sync-model'

const { Text } = Typography

/** 最近一次有行情的「日期 + 时段」；没有任何行情时为 null。 */
export function latestQuotedSlot(
  calendars: CalendarMap,
): { date: string; period: string } | null {
  const dates = Object.keys(calendars)
    .filter((date) => (calendars[date]?.periods.length ?? 0) > 0)
    .sort()
  const date = dates.at(-1)
  if (!date) return null
  const period = calendars[date]?.periods.at(-1)
  return period ? { date, period } : null
}

/**
 * 概览条：四个紧凑指标，**不是四张卡片**。
 *
 * <p>重做前三张 Card + Statistic 各占 110px 高、内部只有一个数字，"今日同步 0/3" 的位置
 * 配三个圆点显得很空；而这一屏真正要看的是下面的覆盖矩阵，被挤到了第二屏。改成一条
 * 带分隔线的指标条后高度减半，省下的空间留给矩阵（矩阵才是主体）。</p>
 *
 * <p>指标顺序按"先看结论、再看细节"：覆盖率 → 缺口 → 最新一次行情 → 今日进度。
 * 今日指标必须放在最后，且分母跟随数据源的展示时段（西本只有「上午」）。</p>
 */
export function MarketSyncMetrics({
  stats,
  periods = PERIODS,
  latest,
}: {
  stats: {
    /**
     * 近 30 天内的交易日数: 有行情的日期 ∪ 工作日(待同步)。
     * 不含"周末且无行情"的休市日 —— 调休上班的周六日有行情时计入。
     */
    tradingDays: number
    covered: number
    missingSlots: number
    todayEntry: CalendarMap[string] | undefined
  }
  /** 当前数据源的展示时段(西本仅「上午」): 今日同步的分母与圆点必须与矩阵口径一致。 */
  periods?: readonly string[]
  /** 最近一次有行情的时段；没有行情时为 null。 */
  latest: { date: string; period: string } | null
}) {
  const { t } = useTranslation()
  const coveragePercent =
    stats.tradingDays > 0
      ? Math.round((stats.covered / stats.tradingDays) * 100)
      : 0
  // 已同步时段先转 Set: 下面两处在循环里判存在, 数组 includes 是 O(n) 查找
  const todayPeriodSet = new Set(stats.todayEntry?.periods ?? [])
  const todayDone = periods.filter((p) => todayPeriodSet.has(p)).length
  const allDone = stats.missingSlots === 0

  return (
    <div className="market-sync-metrics">
      <div className="market-sync-metric">
        <span className="market-sync-metric-label">
          {t('marketSync.metricCoverageTitle')}
        </span>
        <span className="market-sync-metric-value">
          {stats.covered} / {stats.tradingDays}
          <span className="market-sync-metric-unit">
            {t('marketSync.metricCoverageUnit')}
          </span>
        </span>
        <Progress
          className="market-sync-metric-progress"
          percent={coveragePercent}
          size="small"
          showInfo={false}
          status={stats.covered >= stats.tradingDays ? 'success' : 'active'}
          aria-label={t('marketSync.metricCoverageTitle')}
        />
        <span className="market-sync-metric-hint">
          {t('marketSync.metricCoverageHint', { percent: coveragePercent })}
        </span>
      </div>

      <div
        className={`market-sync-metric${allDone ? ' is-success' : ' is-danger'}`}
      >
        <span className="market-sync-metric-label">
          {t('marketSync.metricMissingTitle')}
        </span>
        <span className="market-sync-metric-value">
          {allDone ? (
            t('marketSync.metricMissingNone')
          ) : (
            <>
              {stats.missingSlots}
              <span className="market-sync-metric-unit">
                {t('marketSync.metricMissingUnit')}
              </span>
            </>
          )}
        </span>
        <span className="market-sync-metric-hint">
          {allDone
            ? t('marketSync.metricMissingAllDone')
            : t('marketSync.metricMissingHint')}
        </span>
      </div>

      <div className="market-sync-metric">
        <span className="market-sync-metric-label">
          {t('marketSync.metricLatestTitle')}
        </span>
        <span className="market-sync-metric-value">
          {latest ? latest.date.slice(5) : t('marketSync.metricLatestNone')}
          {latest ? (
            <span className="market-sync-metric-unit">{latest.period}</span>
          ) : null}
        </span>
        <span className="market-sync-metric-hint">
          {latest
            ? formatDate(latest.date)
            : t('marketSync.metricLatestNoneHint')}
        </span>
      </div>

      <div className="market-sync-metric">
        <span className="market-sync-metric-label">
          {t('marketSync.metricTodayTitle')}
        </span>
        <span className="market-sync-metric-value">
          {todayDone} / {periods.length}
        </span>
        <div className="market-sync-today">
          {periods.map((period) => {
            const done = todayPeriodSet.has(period)
            return (
              <span
                key={period}
                className={`market-sync-today-item${done ? ' is-done' : ''}`}
              >
                <span className="market-sync-today-dot" aria-hidden="true" />
                {/*
                  状态不能只靠颜色传达; aria-label 不能挂在无 role 的 span 上
                  (biome a11y 规则), 因此用 .aries-sr-only 承载「今日上午 ✓/—」。
                */}
                <span className="aries-sr-only">
                  {t('marketSync.todayPeriod', {
                    period,
                    mark: done ? '✓' : '—',
                  })}
                </span>
                <span aria-hidden="true">{period}</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 补数进度 / 跳过 / 失败: 需要用户看见的过程与异常信息。 */
export function MarketSyncNotices({
  backfillStatus,
  backfillTotalDays,
}: {
  backfillStatus: SteelQuoteBackfillStatus | null
  backfillTotalDays: number
}) {
  const { t } = useTranslation()
  if (!backfillStatus) return null

  const doneCount =
    backfillStatus.syncedDays +
    (backfillStatus.skippedDays ?? 0) +
    backfillStatus.failedDays
  const progressPercent =
    backfillTotalDays > 0
      ? Math.round((doneCount / backfillTotalDays) * 100)
      : 0

  return (
    <div className="market-sync-notices">
      {backfillStatus.running ? (
        <Alert
          showIcon
          type="info"
          title={t('marketSync.backfilling', {
            from: formatDate(backfillStatus.from),
            to: formatDate(backfillStatus.to),
          })}
          description={
            backfillTotalDays > 0 ? (
              <Flex align="center" gap={12}>
                <Progress
                  percent={progressPercent}
                  size="small"
                  style={{ width: 200, margin: 0 }}
                  aria-label={t('marketSync.barGroupBackfill')}
                />
                <Text
                  type="secondary"
                  style={{ fontSize: 'var(--font-size-xs)' }}
                >
                  {t('marketSync.backfillProgress', {
                    done: doneCount,
                    total: backfillTotalDays,
                  })}
                </Text>
              </Flex>
            ) : null
          }
        />
      ) : backfillStatus.finishedAt ? (
        <Alert
          showIcon
          type={backfillStatus.failedDays > 0 ? 'warning' : 'success'}
          title={t('marketSync.backfillDone', {
            from: formatDate(backfillStatus.from),
            to: formatDate(backfillStatus.to),
            synced: backfillStatus.syncedDays,
            skipped: backfillStatus.skippedDays ?? 0,
            failed: backfillStatus.failedDays,
            rows: backfillStatus.totalRows,
          })}
        />
      ) : null}

      {backfillStatus.failures?.length ? (
        <Alert
          showIcon
          type="error"
          style={{ marginTop: 'var(--space-xs)' }}
          title={t('marketSync.backfillFailures', {
            count: backfillStatus.failures.length,
          })}
          description={
            <div className="market-sync-tag-list">
              {backfillStatus.failures.map((failure) => (
                <Tooltip key={failure.date} title={failure.message}>
                  <Tag color="red">{formatDate(failure.date)}</Tag>
                </Tooltip>
              ))}
            </div>
          }
        />
      ) : null}

      {backfillStatus.skippedDates?.length ? (
        <Alert
          showIcon
          type="info"
          style={{ marginTop: 'var(--space-xs)' }}
          title={t('marketSync.backfillSkipped', {
            count: backfillStatus.skippedDates.length,
          })}
          description={
            <div className="market-sync-tag-list">
              {backfillStatus.skippedDates.map((date) => (
                <Tooltip key={date} title={t('marketSync.backfillSkippedHint')}>
                  <Tag>{formatDate(date)}</Tag>
                </Tooltip>
              ))}
            </div>
          }
        />
      ) : null}
    </div>
  )
}
