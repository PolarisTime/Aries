import { Card, Flex, Skeleton, Tooltip, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { OperationLogSummary } from '@/api/system/operation-logs'
import { fillTrend, formatDuration } from './operation-log-view-model'

type Props = {
  summary: OperationLogSummary | undefined
  loading: boolean
  today: string
  onPickDay?: (date: string) => void
}

/** 概览：4 个指标 + 近 7 天趋势（纯 CSS 柱）+ 失败最多模块。 */
export function OperationLogSummaryCards({
  summary,
  loading,
  today,
  onPickDay,
}: Props) {
  const { t } = useTranslation()
  const trend = fillTrend(summary, 7, today)
  const maxTotal = Math.max(1, ...trend.map((day) => day.total))

  const metrics = [
    {
      label: t('modules.pages.operationLog.summaryTotal'),
      value: summary?.total ?? 0,
      tone: 'default',
    },
    {
      label: t('modules.pages.operationLog.summarySuccess'),
      value: summary?.successCount ?? 0,
      tone: 'success',
    },
    {
      label: t('modules.pages.operationLog.summaryFailed'),
      value: summary?.failedCount ?? 0,
      tone: 'danger',
    },
    {
      label: t('modules.pages.operationLog.summaryAvgDuration'),
      value: formatDuration(summary?.avgDurationMs ?? 0) ?? '—',
      tone: 'default',
    },
  ] as const

  return (
    <Flex className="oplog-summary" gap={12} wrap>
      <Flex className="oplog-metrics" gap={12} wrap>
        {metrics.map((metric) => (
          <Card className="oplog-metric" key={metric.label} size="small">
            <Typography.Text className="oplog-metric-label" type="secondary">
              {metric.label}
            </Typography.Text>
            <Typography.Text
              className={`oplog-metric-value oplog-metric-value--${metric.tone}`}
            >
              {loading ? <Skeleton.Input active size="small" /> : metric.value}
            </Typography.Text>
          </Card>
        ))}
      </Flex>

      <Card
        className="oplog-trend"
        size="small"
        title={t('modules.pages.operationLog.trendTitle')}
      >
        <Flex align="flex-end" className="oplog-trend-bars" gap={8}>
          {trend.map((day) => {
            const height = Math.max(4, Math.round((day.total / maxTotal) * 56))
            const failedHeight =
              day.total > 0 ? Math.round((day.failed / day.total) * height) : 0
            return (
              <Tooltip
                key={day.date}
                title={t('modules.pages.operationLog.trendTooltip', {
                  date: day.date,
                  total: day.total,
                  failed: day.failed,
                })}
              >
                <button
                  aria-label={t('modules.pages.operationLog.trendTooltip', {
                    date: day.date,
                    total: day.total,
                    failed: day.failed,
                  })}
                  className="oplog-trend-bar"
                  onClick={() => onPickDay?.(day.date)}
                  style={{ height: `${height + 18}px` }}
                  type="button"
                >
                  <span
                    className="oplog-trend-bar-total"
                    style={{ height: `${height}px` }}
                  >
                    <span
                      className="oplog-trend-bar-failed"
                      style={{ height: `${failedHeight}px` }}
                    />
                  </span>
                  <span className="oplog-trend-bar-label">
                    {day.date.slice(5)}
                  </span>
                </button>
              </Tooltip>
            )
          })}
        </Flex>
      </Card>

      <Card
        className="oplog-top-failed"
        size="small"
        title={t('modules.pages.operationLog.topFailedTitle')}
      >
        {summary?.topFailedModules.length ? (
          <Flex className="oplog-top-failed-list" vertical gap={4}>
            {summary.topFailedModules.map((item) => (
              <Flex align="center" gap={8} key={item.moduleName}>
                <Typography.Text className="oplog-top-failed-name" ellipsis>
                  {item.moduleName}
                </Typography.Text>
                <Typography.Text
                  className="oplog-top-failed-count"
                  type="danger"
                >
                  {item.count}
                </Typography.Text>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Typography.Text type="secondary">
            {t('modules.pages.operationLog.noFailedModules')}
          </Typography.Text>
        )}
      </Card>
    </Flex>
  )
}
