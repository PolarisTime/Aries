import { Flex, Progress, Tag, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { SteelQuoteBackfillStatus } from '@/api/market/steel-quotes'
import { type CalendarMap, PERIODS } from './market-sync-model'

const { Text } = Typography

export function MarketSyncStatusBar({
  backfillStatus,
  backfillTotalWeekdays,
  stats,
}: {
  backfillStatus: SteelQuoteBackfillStatus | null
  backfillTotalWeekdays: number
  stats: {
    weekdays: number
    covered: number
    missingSlots: number
    todayEntry: CalendarMap[string] | undefined
  }
}) {
  const { t } = useTranslation()
  return (
    <>
      <Flex
        gap={8}
        align="center"
        wrap="wrap"
        style={{ marginBottom: 'var(--space-xs)' }}
      >
        <Tag color={stats.missingSlots > 0 ? 'orange' : 'green'}>
          {t('marketSync.coverage', {
            covered: stats.covered,
            weekdays: stats.weekdays,
          })}
        </Tag>
        <Tag color={stats.missingSlots > 0 ? 'red' : 'green'}>
          {t('marketSync.missingSlots', { count: stats.missingSlots })}
        </Tag>
        {backfillStatus?.running ? (
          <Tag color="processing">
            {t('marketSync.backfilling', {
              from: backfillStatus.from,
              to: backfillStatus.to,
            })}
          </Tag>
        ) : backfillStatus?.finishedAt ? (
          <Tag>
            {t('marketSync.backfillDone', {
              from: backfillStatus.from,
              to: backfillStatus.to,
              synced: backfillStatus.syncedDays,
              failed: backfillStatus.failedDays,
              rows: backfillStatus.totalRows,
            })}
          </Tag>
        ) : null}
        {PERIODS.map((p) => {
          const has = stats.todayEntry?.periods.includes(p)
          return (
            <Tag key={p} color={has ? 'green' : 'default'}>
              {t('marketSync.todayPeriod', {
                period: p,
                mark: has ? '✓' : '—',
              })}
            </Tag>
          )
        })}
        {backfillStatus?.running && backfillTotalWeekdays > 0 ? (
          <Flex align="center" gap={8} style={{ minWidth: 220 }}>
            <Progress
              size="small"
              style={{ width: 160, margin: 0 }}
              percent={Math.round(
                ((backfillStatus.syncedDays + backfillStatus.failedDays) /
                  backfillTotalWeekdays) *
                  100,
              )}
            />
            <Text type="secondary" style={{ fontSize: 'var(--font-size-xs)' }}>
              {t('marketSync.backfillProgress', {
                done: backfillStatus.syncedDays + backfillStatus.failedDays,
                total: backfillTotalWeekdays,
              })}
            </Text>
          </Flex>
        ) : null}
      </Flex>

      {backfillStatus && backfillStatus.failures?.length ? (
        <Flex gap={6} wrap="wrap" style={{ marginBottom: 'var(--space-xs)' }}>
          <Text type="danger" style={{ fontSize: 'var(--font-size-xs)' }}>
            {t('marketSync.backfillFailures', {
              count: backfillStatus.failures.length,
            })}
          </Text>
          {backfillStatus.failures.map((failure) => (
            <Tooltip key={failure.date} title={failure.message}>
              <Tag color="red">{failure.date}</Tag>
            </Tooltip>
          ))}
        </Flex>
      ) : null}
    </>
  )
}
