import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Input,
  List,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  fetchSteelQuoteSyncs,
  fetchSteelQuotes,
  type SteelQuote,
  type SteelQuoteSyncRecord,
  syncSteelQuotes,
} from '@/api/market/steel-quotes'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'

const { Text } = Typography
const PERIODS = ['上午', '中午', '下午']
const PAGE_SIZE = 20
const today = () => new Date().toISOString().slice(0, 10)

type DateGroup = {
  date: string
  periods: string[]
  rows: number
  fetchedAt: string | null
  articles: SteelQuoteSyncRecord[]
}

function groupByDate(records: SteelQuoteSyncRecord[]): DateGroup[] {
  const map = new Map<string, DateGroup>()
  for (const record of records) {
    const key = record.articleDate
    const group = map.get(key) ?? {
      date: key,
      periods: [],
      rows: 0,
      fetchedAt: null,
      articles: [],
    }
    if (record.period && !group.periods.includes(record.period))
      group.periods.push(record.period)
    group.rows += record.rowCount ?? 0
    group.articles.push(record)
    if (
      record.fetchedAt &&
      (!group.fetchedAt || record.fetchedAt > group.fetchedAt)
    )
      group.fetchedAt = record.fetchedAt
    map.set(key, group)
  }
  const list = [...map.values()]
  list.sort((a, b) => (a.date < b.date ? 1 : -1))
  for (const group of list) group.periods.sort()
  return list
}

/** 行情同步: 左侧同步记录(按日期), 右侧行情明细联动。 */
export function MarketSyncView() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [syncDate, setSyncDate] = useState<string>(today())
  const [syncing, setSyncing] = useState(false)

  const [records, setRecords] = useState<SteelQuoteSyncRecord[]>([])
  const [recordLoading, setRecordLoading] = useState(false)

  const [selectedDate, setSelectedDate] = useState<string>('')
  const [period, setPeriod] = useState<string>('')
  const [factory, setFactory] = useState<string>('')
  const [material, setMaterial] = useState<string>('')

  const [quotes, setQuotes] = useState<SteelQuote[]>([])
  const [quotePage, setQuotePage] = useState(0)
  const [quoteTotal, setQuoteTotal] = useState(0)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const groups = useMemo(() => groupByDate(records), [records])

  const loadRecords = useCallback(async () => {
    if (!isAuthenticated) return
    setRecordLoading(true)
    try {
      const all: SteelQuoteSyncRecord[] = []
      for (let page = 0; page < 10; page += 1) {
        const { rows, total } = await fetchSteelQuoteSyncs(page, 200)
        all.push(...rows)
        if (all.length >= total || rows.length < 200) break
      }
      setRecords(all)
    } catch (error) {
      console.error('同步记录加载失败', error)
    } finally {
      setRecordLoading(false)
    }
  }, [isAuthenticated])

  const loadQuotes = useCallback(
    async (page: number, date: string, currentPeriod: string) => {
      if (!isAuthenticated) return
      setQuoteLoading(true)
      try {
        const { rows, total } = await fetchSteelQuotes({
          quoteDate: date || undefined,
          period: currentPeriod || undefined,
          factory: factory || undefined,
          material: material || undefined,
          page,
          size: PAGE_SIZE,
        })
        setQuotes(rows)
        setQuotePage(page)
        setQuoteTotal(total)
      } catch (error) {
        console.error('行情明细加载失败', error)
      } finally {
        setQuoteLoading(false)
      }
    },
    [isAuthenticated, factory, material],
  )

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  // 首次加载/记录刷新后: 保证有选中日期
  useEffect(() => {
    if (records.length === 0) return
    if (selectedDate && groups.some((group) => group.date === selectedDate))
      return
    const first = groups[0]
    if (!first) return
    setSelectedDate(first.date)
    setPeriod(first.periods[0] ?? '')
  }, [records, groups, selectedDate])

  // 选中日期/时段变化时加载明细
  useEffect(() => {
    if (!selectedDate || !period) return
    void loadQuotes(0, selectedDate, period)
  }, [selectedDate, period, loadQuotes])

  const onSelect = (date: string, targetPeriod?: string) => {
    const group = groups.find((item) => item.date === date)
    const next =
      targetPeriod ??
      (group?.periods.includes(period) ? period : (group?.periods[0] ?? ''))
    setSelectedDate(date)
    if (next !== period) setPeriod(next)
  }

  const onSync = async () => {
    setSyncing(true)
    try {
      const result = await syncSteelQuotes(syncDate || undefined)
      message.success(
        `同步完成：${result.articleDate} ${result.periods?.join('/') ?? result.period}，${result.rowCount} 行${result.created ? '' : '（已存在）'}`,
      )
      await loadRecords()
      onSelect(result.articleDate, result.period)
    } catch (error) {
      console.error('同步失败', error)
      message.error(
        `同步失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncing(false)
    }
  }

  const quoteColumns: ColumnsType<SteelQuote> = [
    { title: '品牌', dataIndex: 'factory', width: 110 },
    { title: '品名', dataIndex: 'breed', width: 90 },
    { title: '材质', dataIndex: 'material', width: 100 },
    { title: '规格', dataIndex: 'spec', width: 90 },
    {
      title: '价格',
      dataIndex: 'price',
      width: 100,
      align: 'right',
      render: (value: number | string | null | undefined) =>
        value === null || value === undefined ? (
          '-'
        ) : (
          <Text strong>{Number(value)}</Text>
        ),
    },
    {
      title: '涨跌',
      dataIndex: 'changeVal',
      width: 90,
      align: 'right',
      render: (value: string | null) => {
        if (!value) return '-'
        const positive = value.startsWith('+') || Number(value) > 0
        const negative = value.startsWith('-') || Number(value) < 0
        return (
          <span
            style={{
              color: positive
                ? 'var(--color-success-active, #389e0d)'
                : negative
                  ? 'var(--color-danger-active, #cf1322)'
                  : undefined,
            }}
          >
            {value}
          </span>
        )
      },
    },
    {
      title: '备注',
      dataIndex: 'remark',
      ellipsis: true,
      render: (value: string | null) => value || '-',
    },
  ]

  return (
    <div className="price-compare-page">
      <div className="price-compare-head">
        <div>
          <h1>行情同步</h1>
          <span className="price-compare-desc">
            后端定时任务同步；可手动补同步，左侧记录与右侧明细联动
          </span>
        </div>
        <Space wrap>
          <DatePicker
            size="small"
            style={{ width: 140 }}
            value={syncDate ? dayjs(syncDate) : null}
            format="YYYY年M月D日"
            allowClear={false}
            onChange={(value) =>
              value && setSyncDate(value.format('YYYY-MM-DD'))
            }
          />
          <Button
            size="small"
            type="primary"
            icon={<SyncOutlined />}
            loading={syncing}
            onClick={() => void onSync()}
          >
            手动同步
          </Button>
        </Space>
      </div>

      <Flex gap={12} align="flex-start" wrap="wrap" style={{ marginBottom: 8 }}>
        <Tag color="blue">已同步 {groups.length} 天</Tag>
        {groups[0]?.date ? <Tag>最近：{groups[0].date}</Tag> : null}
        {groups[0]?.fetchedAt ? (
          <Tag>
            抓取于 {dayjs(groups[0].fetchedAt).format('YYYY-MM-DD HH:mm')}
          </Tag>
        ) : null}
      </Flex>

      <Flex gap={12} align="flex-start" wrap="wrap">
        <Card
          size="small"
          title="同步记录"
          style={{ flex: '0 0 380px', maxWidth: '100%' }}
          extra={
            <Button
              size="small"
              type="text"
              icon={<ReloadOutlined />}
              loading={recordLoading}
              onClick={() => void loadRecords()}
            />
          }
        >
          {groups.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无记录"
            />
          ) : (
            <List
              size="small"
              dataSource={groups}
              style={{ maxHeight: 560, overflowY: 'auto' }}
              renderItem={(group) => {
                const active = group.date === selectedDate
                return (
                  <List.Item
                    onClick={() => onSelect(group.date)}
                    style={{
                      cursor: 'pointer',
                      paddingInline: 8,
                      borderRadius: 6,
                      background: active
                        ? 'var(--theme-highlight-bg)'
                        : undefined,
                    }}
                  >
                    <Flex vertical gap={4} style={{ width: '100%' }}>
                      <Flex justify="space-between" align="center">
                        <Text strong>{group.date}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {group.rows} 行
                        </Text>
                      </Flex>
                      <Flex gap={4} align="center" wrap="wrap">
                        {PERIODS.filter((p) => group.periods.includes(p)).map(
                          (p) => (
                            <Tag.CheckableTag
                              key={p}
                              checked={active && period === p}
                              onChange={() => onSelect(group.date, p)}
                            >
                              {p}
                            </Tag.CheckableTag>
                          ),
                        )}
                        {group.fetchedAt ? (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {dayjs(group.fetchedAt).format('MM-DD HH:mm')}
                          </Text>
                        ) : null}
                      </Flex>
                    </Flex>
                  </List.Item>
                )
              }}
            />
          )}
        </Card>

        <Card
          size="small"
          title="行情明细"
          style={{ flex: '1 1 560px', minWidth: 0 }}
        >
          <Flex gap={8} align="center" wrap="wrap" style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedDate || '未选择日期'}
              {period ? ` · ${period}` : ''}
            </Text>
            <Input
              size="small"
              style={{ width: 130 }}
              placeholder="品牌/钢厂"
              allowClear
              value={factory}
              onChange={(event) => setFactory(event.target.value)}
              onPressEnter={() => void loadQuotes(0, selectedDate, period)}
            />
            <Input
              size="small"
              style={{ width: 110 }}
              placeholder="材质"
              allowClear
              value={material}
              onChange={(event) => setMaterial(event.target.value)}
              onPressEnter={() => void loadQuotes(0, selectedDate, period)}
            />
            <Button
              size="small"
              icon={<ReloadOutlined />}
              loading={quoteLoading}
              onClick={() => void loadQuotes(0, selectedDate, period)}
            >
              查询
            </Button>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {quoteTotal} 条
            </Text>
          </Flex>
          <Table<SteelQuote>
            size="small"
            rowKey={(row) =>
              `${row.quoteDate}|${row.period}|${row.factory}|${row.breed}|${row.material}|${row.spec}|${row.id ?? ''}`
            }
            columns={quoteColumns}
            dataSource={quotes}
            loading={quoteLoading}
            pagination={{
              current: quotePage + 1,
              pageSize: PAGE_SIZE,
              total: quoteTotal,
              showSizeChanger: false,
              onChange: (page) =>
                void loadQuotes(page - 1, selectedDate, period),
            }}
          />
        </Card>
      </Flex>
    </div>
  )
}
