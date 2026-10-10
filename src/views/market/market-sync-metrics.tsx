import {
  Alert,
  Card,
  Flex,
  Progress,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import type { SteelQuoteBackfillStatus } from '@/api/market/steel-quotes'
import { type CalendarMap, PERIODS } from './market-sync-model'

const { Text } = Typography

/**
 * 指标概览: 把原先一行同尺寸 Tag 里的关键数字提出来做大字号。
 * 覆盖进度与缺失数是这一屏最需要一眼看到的信息。
 */
export function MarketSyncMetrics({
  stats,
}: {
  stats: {
    weekdays: number
    covered: number
    missingSlots: number
    todayEntry: CalendarMap[string] | undefined
  }
}) {
  const { t } = useTranslation()
  const coveragePercent =
    stats.weekdays > 0 ? Math.round((stats.covered / stats.weekdays) * 100) : 0
  const todayDone = PERIODS.filter((p) =>
    stats.todayEntry?.periods.includes(p),
  ).length

  return (
    <div className="market-sync-metrics">
      <Card size="small" className="market-sync-metric">
        <Statistic
          title={t('marketSync.metricCoverageTitle')}
          value={`${stats.covered} / ${stats.weekdays}`}
          suffix={
            <span className="market-sync-metric-unit">
              {t('marketSync.metricCoverageUnit')}
            </span>
          }
        />
        <Progress
          className="market-sync-metric-progress"
          percent={coveragePercent}
          size="small"
          showInfo={false}
          status={stats.covered >= stats.weekdays ? 'success' : 'active'}
          aria-label={t('marketSync.metricCoverageTitle')}
        />
      </Card>

      <Card
        size="small"
        className={`market-sync-metric${stats.missingSlots > 0 ? ' is-danger' : ' is-success'}`}
      >
        <Statistic
          title={t('marketSync.metricMissingTitle')}
          value={stats.missingSlots}
          suffix={
            stats.missingSlots > 0 ? (
              <span className="market-sync-metric-unit">
                {t('marketSync.metricMissingUnit')}
              </span>
            ) : null
          }
          formatter={
            stats.missingSlots > 0
              ? undefined
              : () => t('marketSync.metricMissingNone')
          }
        />
      </Card>

      <Card size="small" className="market-sync-metric">
        <Statistic
          title={t('marketSync.metricTodayTitle')}
          value={todayDone}
          suffix={
            <span className="market-sync-metric-unit">/ {PERIODS.length}</span>
          }
        />
        <div className="market-sync-today">
          {PERIODS.map((period) => {
            const done = Boolean(stats.todayEntry?.periods.includes(period))
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
      </Card>
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
            from: backfillStatus.from,
            to: backfillStatus.to,
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
            from: backfillStatus.from,
            to: backfillStatus.to,
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
                  <Tag color="red">{failure.date}</Tag>
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
                  <Tag>{date}</Tag>
                </Tooltip>
              ))}
            </div>
          }
        />
      ) : null}
    </div>
  )
}
