import { Flex, Progress, Tag, Tooltip, Typography } from 'antd'
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
  return (
    <>
      <Flex gap={8} align="center" wrap="wrap" style={{ marginBottom: 8 }}>
        <Tag color={stats.missingSlots > 0 ? 'orange' : 'green'}>
          近30天覆盖 {stats.covered}/{stats.weekdays} 天
        </Tag>
        <Tag color={stats.missingSlots > 0 ? 'red' : 'green'}>
          缺失时段 {stats.missingSlots}
        </Tag>
        {backfillStatus?.running ? (
          <Tag color="processing">
            补数中 {backfillStatus.from} ~ {backfillStatus.to}
          </Tag>
        ) : backfillStatus?.finishedAt ? (
          <Tag>
            上次补数 {backfillStatus.from} ~ {backfillStatus.to}：成功
            {backfillStatus.syncedDays}天/失败{backfillStatus.failedDays}天/
            {backfillStatus.totalRows}行
          </Tag>
        ) : null}
        {PERIODS.map((p) => {
          const has = stats.todayEntry?.periods.includes(p)
          return (
            <Tag key={p} color={has ? 'green' : 'default'}>
              今日{p} {has ? '✓' : '—'}
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              {backfillStatus.syncedDays + backfillStatus.failedDays}/
              {backfillTotalWeekdays} 天
            </Text>
          </Flex>
        ) : null}
      </Flex>

      {backfillStatus && backfillStatus.failures?.length ? (
        <Flex gap={6} wrap="wrap" style={{ marginBottom: 8 }}>
          <Text type="danger" style={{ fontSize: 12 }}>
            补数失败 {backfillStatus.failures.length} 天：
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
