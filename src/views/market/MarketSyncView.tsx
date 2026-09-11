import {
  ClearOutlined,
  DownloadOutlined,
  ExportOutlined,
  ReloadOutlined,
  SearchOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Input,
  InputNumber,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  backfillSteelQuotes,
  fetchBackfillStatus,
  fetchSteelQuoteCalendars,
  fetchSteelQuotes,
  type SteelQuote,
  type SteelQuoteBackfillStatus,
  syncSteelQuotes,
} from '@/api/market/steel-quotes'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'

const { Text } = Typography
const PERIODS = ['上午', '中午', '下午']
const BREEDS = ['螺纹钢', '盘螺', '高线', '圆钢']
const PAGE_SIZE = 20
const MATRIX_DAYS = 30
const today = () => new Date().toISOString().slice(0, 10)

const csvCell = (value: unknown) => {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

type Filters = {
  breed?: string
  material?: string
  factory?: string
  spec?: string
  change?: string
}

type CalendarMap = Record<
  string,
  { periods: string[]; rows: Record<string, number> }
>

/** 行情同步: 覆盖矩阵(近30天) + 内联明细 + 单日/区间补数。 */
export function MarketSyncView() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [calendars, setCalendars] = useState<CalendarMap>({})
  const [loadingCalendar, setLoadingCalendar] = useState(false)
  const [selected, setSelected] = useState<{ date: string; period: string }>({
    date: '',
    period: '',
  })

  const [singleDate, setSingleDate] = useState<string>(today())
  const [syncing, setSyncing] = useState(false)
  const [backfillDays, setBackfillDays] = useState<number>(30)
  const [backfilling, setBackfilling] = useState(false)
  const [backfillStatus, setBackfillStatus] =
    useState<SteelQuoteBackfillStatus | null>(null)
  const [syncingDate, setSyncingDate] = useState<string | null>(null)

  const [form, setForm] = useState<Filters>({})
  const [applied, setApplied] = useState<Filters>({})
  const [sort, setSort] = useState<{ field?: string; order?: 'asc' | 'desc' }>(
    {},
  )
  const [quotes, setQuotes] = useState<SteelQuote[]>([])
  const [quotePage, setQuotePage] = useState(0)
  const [quoteTotal, setQuoteTotal] = useState(0)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const matrixDays = useMemo(() => {
    const days: string[] = []
    for (let i = 0; i < MATRIX_DAYS; i += 1)
      days.push(dayjs().subtract(i, 'day').format('YYYY-MM-DD'))
    return days
  }, [])

  const loadCalendars = useCallback(async () => {
    if (!isAuthenticated) return
    setLoadingCalendar(true)
    try {
      const from = dayjs()
        .subtract(MATRIX_DAYS - 1, 'day')
        .format('YYYY-MM-DD')
      const to = dayjs().add(1, 'day').format('YYYY-MM-DD')
      const rows = await fetchSteelQuoteCalendars(from, to)
      const map: CalendarMap = {}
      for (const row of rows)
        map[row.quoteDate] = {
          periods: row.periods,
          rows: row.periodRows ?? {},
        }
      setCalendars(map)
      setSelected((current) => {
        if (current.date && map[current.date]) return current
        const latest = Object.keys(map).sort().reverse()[0]
        if (!latest) return current
        return { date: latest, period: map[latest]?.periods[0] ?? '' }
      })
    } catch (error) {
      console.error('行情日历加载失败', error)
    } finally {
      setLoadingCalendar(false)
    }
  }, [isAuthenticated])

  const loadQuotes = useCallback(
    async (page: number) => {
      if (!isAuthenticated || !selected.date || !selected.period) return
      setQuoteLoading(true)
      try {
        const { rows, total } = await fetchSteelQuotes({
          quoteDate: selected.date,
          period: selected.period,
          breed: applied.breed || undefined,
          material: applied.material || undefined,
          factory: applied.factory || undefined,
          spec: applied.spec || undefined,
          change: applied.change || undefined,
          sortBy: sort.field,
          direction: sort.order,
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
    [isAuthenticated, selected, applied, sort],
  )

  useEffect(() => {
    void loadCalendars()
  }, [loadCalendars])

  useEffect(() => {
    if (!isAuthenticated) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const poll = async () => {
      try {
        const status = await fetchBackfillStatus()
        setBackfillStatus(status)
        if (status.running) {
          timer = setTimeout(() => void poll(), 3000)
        } else {
          void loadCalendars()
        }
      } catch (error) {
        console.error('补数状态查询失败', error)
      }
    }
    void poll()
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [isAuthenticated, loadCalendars])

  useEffect(() => {
    void loadQuotes(0)
  }, [loadQuotes])

  // 概览统计
  const stats = useMemo(() => {
    const weekdays = matrixDays.filter((date) => {
      const dow = dayjs(date).day()
      return dow !== 0 && dow !== 6
    })
    let covered = 0
    let missingSlots = 0
    for (const date of weekdays) {
      const entry = calendars[date]
      const count = entry?.periods.length ?? 0
      if (count > 0) covered += 1
      missingSlots += PERIODS.length - count
    }
    const todayEntry = calendars[today()]
    return { weekdays: weekdays.length, covered, missingSlots, todayEntry }
  }, [matrixDays, calendars])

  const onSync = async () => {
    setSyncing(true)
    try {
      const result = await syncSteelQuotes(singleDate || undefined)
      message.success(
        `同步完成：${result.articleDate} ${result.periods?.join('/') ?? result.period}，${result.rowCount} 行${result.created ? '' : '（已存在）'}`,
      )
      await loadCalendars()
      setSelected({
        date: result.articleDate,
        period: result.period,
      })
    } catch (error) {
      console.error('同步失败', error)
      message.error(
        `同步失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncing(false)
    }
  }

  const onBackfill = async () => {
    setBackfilling(true)
    try {
      const result = await backfillSteelQuotes(backfillDays)
      message.success(
        `已受理补数：${result.from} ~ ${result.to}（后台执行，完成后自动刷新）`,
      )
      setBackfillStatus({
        running: true,
        from: result.from,
        to: result.to,
        syncedDays: 0,
        failedDays: 0,
        totalRows: 0,
      })
    } catch (error) {
      console.error('补数失败', error)
      message.error(
        `补数失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setBackfilling(false)
    }
  }

  /** 手动同步某一天(矩阵缺失格子点击)。 */
  const onSyncDate = async (date: string) => {
    setSyncingDate(date)
    try {
      const result = await syncSteelQuotes(date)
      message.success(
        `已同步 ${result.articleDate} ${result.periods?.join('/') ?? result.period}，${result.rowCount} 行`,
      )
      await loadCalendars()
      setSelected({ date: result.articleDate, period: result.period })
    } catch (error) {
      console.error('同步失败', error)
      message.error(
        `同步失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncingDate(null)
    }
  }

  const backfillTotalWeekdays = (() => {
    if (!backfillStatus?.from || !backfillStatus?.to) return 0
    let count = 0
    let cursor = dayjs(backfillStatus.from)
    const end = dayjs(backfillStatus.to)
    while (!cursor.isAfter(end)) {
      const dow = cursor.day()
      if (dow !== 0 && dow !== 6) count += 1
      cursor = cursor.add(1, 'day')
    }
    return count
  })()

  /** 导出当前筛选下的全部明细为 CSV。 */
  const onExport = async () => {
    if (!selected.date || !selected.period) return
    try {
      const all: SteelQuote[] = []
      for (let page = 0; page < 50; page += 1) {
        const { rows, total } = await fetchSteelQuotes({
          quoteDate: selected.date,
          period: selected.period,
          breed: applied.breed || undefined,
          material: applied.material || undefined,
          factory: applied.factory || undefined,
          spec: applied.spec || undefined,
          change: applied.change || undefined,
          sortBy: sort.field,
          direction: sort.order,
          page,
          size: 200,
        })
        all.push(...rows)
        if (all.length >= total || rows.length < 200) break
      }
      const header = [
        '日期',
        '时段',
        '品牌/钢厂',
        '品名',
        '材质',
        '规格',
        '价格(元/吨)',
        '涨跌',
        '备注',
      ]
      const lines = all.map((row) =>
        [
          row.quoteDate,
          row.period,
          row.factory,
          row.breed,
          row.material,
          row.spec,
          row.price,
          row.changeVal,
          row.remark,
        ]
          .map(csvCell)
          .join(','),
      )
      const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `行情明细_${selected.date}_${selected.period}.csv`
      link.click()
      URL.revokeObjectURL(url)
      message.success(`已导出 ${all.length} 行`)
    } catch (error) {
      console.error('导出失败', error)
      message.error('导出失败，请稍后重试')
    }
  }

  const columns: ColumnsType<SteelQuote> = [
    { title: '品牌/钢厂', dataIndex: 'factory', width: 120, fixed: 'left' },
    { title: '品名', dataIndex: 'breed', width: 90 },
    { title: '材质', dataIndex: 'material', width: 100 },
    { title: '规格', dataIndex: 'spec', width: 90 },
    {
      title: '价格(元/吨)',
      dataIndex: 'price',
      width: 120,
      align: 'right',
      sorter: true,
      sortOrder:
        sort.field === 'price'
          ? sort.order === 'asc'
            ? 'ascend'
            : 'descend'
          : undefined,
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
        if (!positive && !negative) return value
        return (
          <Tag
            color={positive ? 'green' : 'red'}
            style={{ marginInlineEnd: 0 }}
          >
            {value}
          </Tag>
        )
      },
    },
    { title: '备注', dataIndex: 'remark', ellipsis: true },
  ]

  return (
    <div className="price-compare-page">
      <div className="price-compare-head">
        <div>
          <h1>行情同步</h1>
          <span className="price-compare-desc">
            近 30 天覆盖监控；缺时段高亮；点击单元格查看该时段明细
          </span>
        </div>
        <Space wrap size={8}>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              单日
            </Text>
            <DatePicker
              size="small"
              style={{ width: 130 }}
              value={singleDate ? dayjs(singleDate) : null}
              format="YYYY-MM-DD"
              allowClear={false}
              onChange={(value) =>
                value && setSingleDate(value.format('YYYY-MM-DD'))
              }
            />
            <Button
              size="small"
              type="primary"
              icon={<SyncOutlined />}
              loading={syncing}
              onClick={() => void onSync()}
            >
              同步
            </Button>
          </Space>
          <Space size={4}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              补数
            </Text>
            <InputNumber
              size="small"
              min={1}
              max={60}
              style={{ width: 70 }}
              value={backfillDays}
              onChange={(value) => setBackfillDays(value ?? 30)}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              天
            </Text>
            <Button
              size="small"
              icon={<SyncOutlined />}
              loading={backfilling}
              onClick={() => void onBackfill()}
            >
              补数
            </Button>
            <Tooltip title="只补最近30天缺失的文章(已入库的会跳过)">
              <Button
                size="small"
                icon={<SyncOutlined />}
                loading={backfilling}
                onClick={() => void onBackfill()}
              >
                补缺失
              </Button>
            </Tooltip>
          </Space>
          <Button
            size="small"
            type="text"
            icon={<ReloadOutlined />}
            loading={loadingCalendar}
            onClick={() => void loadCalendars()}
          />
        </Space>
      </div>

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

      <Card
        size="small"
        title="覆盖矩阵（近30天）"
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
                const active =
                  selected.date === row.date && selected.period === p
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
                        onClick={() => void onSyncDate(row.date)}
                      >
                        缺
                      </Button>
                    </Tooltip>
                  )
                return (
                  <Tag.CheckableTag
                    checked={active}
                    onChange={() => setSelected({ date: row.date, period: p })}
                  >
                    {rows ? `${rows}行` : '✓'}
                  </Tag.CheckableTag>
                )
              },
            })),
          ]}
        />
      </Card>

      <Card
        size="small"
        title={
          <Space size={6}>
            <span>行情明细</span>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
              {selected.date || '未选择'}
              {selected.period ? ` · ${selected.period}` : ''}
            </Text>
          </Space>
        }
      >
        <Flex gap={8} align="center" wrap="wrap" style={{ marginBottom: 8 }}>
          <Select
            size="small"
            style={{ width: 110 }}
            placeholder="品名"
            allowClear
            value={form.breed}
            onChange={(value) => setForm((prev) => ({ ...prev, breed: value }))}
            options={BREEDS.map((b) => ({ value: b, label: b }))}
          />
          <Input
            size="small"
            style={{ width: 110 }}
            placeholder="材质"
            allowClear
            value={form.material}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, material: event.target.value }))
            }
            onPressEnter={() => setApplied(form)}
          />
          <Input
            size="small"
            style={{ width: 120 }}
            placeholder="品牌/钢厂"
            allowClear
            value={form.factory}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, factory: event.target.value }))
            }
            onPressEnter={() => setApplied(form)}
          />
          <Input
            size="small"
            style={{ width: 90 }}
            placeholder="规格"
            allowClear
            value={form.spec}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, spec: event.target.value }))
            }
            onPressEnter={() => setApplied(form)}
          />
          <Select
            size="small"
            style={{ width: 100 }}
            placeholder="涨跌"
            allowClear
            value={form.change}
            onChange={(value) =>
              setForm((prev) => ({ ...prev, change: value }))
            }
            options={[
              { value: 'up', label: '涨' },
              { value: 'down', label: '跌' },
            ]}
          />
          <Button
            size="small"
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => setApplied(form)}
          >
            查询
          </Button>
          <Button
            size="small"
            icon={<ClearOutlined />}
            onClick={() => {
              setForm({})
              setApplied({})
              setSort({})
            }}
          >
            重置
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            disabled={!selected.date || !selected.period}
            onClick={() => void onExport()}
          >
            导出
          </Button>
          {selected.date && selected.period ? (
            <Tooltip title="打开报单比价并应用该日期/时段">
              <Button
                size="small"
                icon={<ExportOutlined />}
                onClick={() =>
                  window.open(
                    `/price-compare?refDate=${selected.date}&refPeriod=${encodeURIComponent(selected.period)}`,
                    '_blank',
                  )
                }
              >
                去比价
              </Button>
            </Tooltip>
          ) : null}
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 'auto' }}>
            共 {quoteTotal} 条
          </Text>
        </Flex>
        {selected.date && selected.period ? (
          <Table<SteelQuote>
            size="small"
            sticky
            rowKey={(row) =>
              `${row.quoteDate}|${row.period}|${row.factory}|${row.breed}|${row.material}|${row.spec}|${row.id ?? ''}`
            }
            columns={columns}
            dataSource={quotes}
            loading={quoteLoading}
            scroll={{ x: 760 }}
            onChange={(pagination, _filters, sorter) => {
              const single = Array.isArray(sorter) ? sorter[0] : sorter
              const field =
                single?.order && single.field ? String(single.field) : undefined
              const order =
                single?.order === 'ascend'
                  ? 'asc'
                  : single?.order === 'descend'
                    ? 'desc'
                    : undefined
              if (field !== sort.field || order !== sort.order) {
                setSort({ field, order })
                return
              }
              const page = (pagination.current ?? 1) - 1
              if (page !== quotePage) void loadQuotes(page)
            }}
            pagination={{
              current: quotePage + 1,
              pageSize: PAGE_SIZE,
              total: quoteTotal,
              showSizeChanger: false,
              size: 'small',
            }}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="请选择日期时段"
          />
        )}
      </Card>
    </div>
  )
}
