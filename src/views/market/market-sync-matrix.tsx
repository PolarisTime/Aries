import { Button, Card, Table, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import { type CalendarMap, PERIODS, today } from './market-sync-model'

const { Text } = Typography

export function MarketSyncMatrix({
  calendars,
  matrixDays,
  onSelectQuote,
  onSyncDate,
  selected,
  syncingDate,
}: {
  calendars: CalendarMap
  matrixDays: string[]
  onSelectQuote: (date: string, period: string) => void
  onSyncDate: (date: string) => void
  selected: { date: string; period: string }
  syncingDate: string | null
}) {
  return (
    <Card size="small" title="覆盖矩阵（近30天）" style={{ marginBottom: 12 }}>
      <Table
        size="small"
        rowKey="date"
        pagination={false}
        dataSource={matrixDays.map((date) => ({ date }))}
        scroll={{ y: 420 }}
        columns={[
          {
            title: '日期',
            dataIndex: 'date',
            width: 130,
            render: (date: string) => (
              <Text strong={date === today()}>{date}</Text>
            ),
          },
          ...PERIODS.map((p) => ({
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
              if (weekend) return <Text type="secondary">休</Text>
              if (!has)
                return (
                  <Tooltip title="该时段无行情数据，点击同步该日">
                    <Button
                      size="small"
                      type="link"
                      danger
                      loading={syncingDate === row.date}
                      style={{ padding: 0, height: 'auto' }}
                      onClick={() => onSyncDate(row.date)}
                    >
                      缺
                    </Button>
                  </Tooltip>
                )
              return (
                <Tag.CheckableTag
                  checked={active}
                  onChange={() => onSelectQuote(row.date, p)}
                >
                  {rows ? `${rows}行` : '✓'}
                </Tag.CheckableTag>
              )
            },
          })),
        ]}
      />
    </Card>
  )
}
