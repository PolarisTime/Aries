import { Button, Card, Table, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { type CalendarMap, PERIODS, today } from './market-sync-model'

const { Text } = Typography

export function MarketSyncMatrix({
  calendars,
  matrixDays,
  onSelectQuote,
  onSyncDate,
  selected,
  syncingCell,
  periods = PERIODS,
}: {
  calendars: CalendarMap
  matrixDays: string[]
  onSelectQuote: (date: string, period: string) => void
  onSyncDate: (date: string, period?: string) => void
  selected: { date: string; period: string }
  syncingCell: string | null
  /** 矩阵展示的时段; 西本仅「上午」。 */
  periods?: readonly string[]
}) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      title={t('marketSync.matrixTitle')}
      style={{ marginBottom: 12 }}
    >
      <Table
        size="small"
        rowKey="date"
        pagination={false}
        dataSource={matrixDays.map((date) => ({ date }))}
        scroll={{ y: 420 }}
        columns={[
          {
            title: t('marketSync.matrixDate'),
            dataIndex: 'date',
            width: 130,
            render: (date: string) => (
              <Text strong={date === today()}>{date}</Text>
            ),
          },
          ...periods.map((p) => ({
            title: p,
            key: p,
            align: 'center' as const,
            render: (_: unknown, row: { date: string }) => {
              const dow = dayjs(row.date).day()
              const weekend = dow === 0 || dow === 6
              const entry = calendars[row.date]
              const has = entry?.periods.includes(p)
              const rows = entry?.rows[p]
              const active = selected.date === row.date && selected.period === p
              if (weekend)
                return <Text type="secondary">{t('marketSync.weekend')}</Text>
              if (!has)
                return (
                  <Tooltip title={t('marketSync.matrixNoData')}>
                    <Button
                      size="small"
                      type="link"
                      danger
                      loading={syncingCell === `${row.date}|${p}`}
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => onSyncDate(row.date, p)}
                    >
                      {t('marketSync.syncMissing')}
                    </Button>
                  </Tooltip>
                )
              return (
                <Tag.CheckableTag
                  checked={active}
                  onChange={() => onSelectQuote(row.date, p)}
                >
                  {rows ? t('marketSync.matrixRows', { rows }) : '✓'}
                </Tag.CheckableTag>
              )
            },
          })),
        ]}
      />
    </Card>
  )
}
