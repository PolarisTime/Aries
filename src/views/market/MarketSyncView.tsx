import { ReloadOutlined, SyncOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useState } from 'react'
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

/** 行情同步: 手动同步 + 同步记录 + 行情明细。 */
export function MarketSyncView() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [syncDate, setSyncDate] = useState<string>(today())
  const [syncing, setSyncing] = useState(false)

  const [records, setRecords] = useState<SteelQuoteSyncRecord[]>([])
  const [recordPage, setRecordPage] = useState(0)
  const [recordTotal, setRecordTotal] = useState(0)
  const [recordLoading, setRecordLoading] = useState(false)

  const [quoteDate, setQuoteDate] = useState<string>(today())
  const [period, setPeriod] = useState<string>('')
  const [factory, setFactory] = useState<string>('')
  const [material, setMaterial] = useState<string>('')
  const [quotes, setQuotes] = useState<SteelQuote[]>([])
  const [quotePage, setQuotePage] = useState(0)
  const [quoteTotal, setQuoteTotal] = useState(0)
  const [quoteLoading, setQuoteLoading] = useState(false)

  const loadRecords = useCallback(
    async (page = 0) => {
      if (!isAuthenticated) return
      setRecordLoading(true)
      try {
        const { rows, total } = await fetchSteelQuoteSyncs(page, PAGE_SIZE)
        setRecords(rows)
        setRecordPage(page)
        setRecordTotal(total)
      } catch (error) {
        console.error('同步记录加载失败', error)
      } finally {
        setRecordLoading(false)
      }
    },
    [isAuthenticated],
  )

  const loadQuotes = useCallback(
    async (page = 0) => {
      if (!isAuthenticated) return
      setQuoteLoading(true)
      try {
        const { rows, total } = await fetchSteelQuotes({
          quoteDate: quoteDate || undefined,
          period: period || undefined,
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
    [quoteDate, period, factory, material, isAuthenticated],
  )

  useEffect(() => {
    void loadRecords(0)
  }, [loadRecords])

  useEffect(() => {
    void loadQuotes(0)
  }, [loadQuotes])

  const onSync = async () => {
    setSyncing(true)
    try {
      const result = await syncSteelQuotes(syncDate || undefined)
      message.success(
        `同步完成：${result.articleDate} ${result.period}，${result.rowCount} 行${result.created ? '' : '（已存在，未重复入库）'}`,
      )
      setQuoteDate(result.articleDate)
      setPeriod(result.period)
      await loadRecords(0)
    } catch (error) {
      console.error('同步失败', error)
      message.error(
        `同步失败：${error instanceof Error ? error.message : '请稍后重试'}`,
      )
    } finally {
      setSyncing(false)
    }
  }

  const recordColumns: ColumnsType<SteelQuoteSyncRecord> = [
    { title: '行情日期', dataIndex: 'articleDate', width: 120 },
    {
      title: '时段',
      dataIndex: 'period',
      width: 90,
      render: (value: string | null) => value || '-',
    },
    {
      title: '文章',
      dataIndex: 'title',
      ellipsis: true,
      render: (value: string | null, row) =>
        row.articleUrl ? (
          <a href={row.articleUrl} target="_blank" rel="noreferrer">
            {value || row.articleUrl}
          </a>
        ) : (
          value || '-'
        ),
    },
    {
      title: '行数',
      dataIndex: 'rowCount',
      width: 80,
      align: 'right',
      render: (value: number | null) => value ?? '-',
    },
    { title: '市场', dataIndex: 'market', width: 90 },
    {
      title: '抓取时间',
      dataIndex: 'fetchedAt',
      width: 170,
      render: (value: string | null) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ]

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
        value === null || value === undefined ? '-' : Number(value),
    },
    {
      title: '涨跌',
      dataIndex: 'changeVal',
      width: 90,
      render: (value: string | null) => value || '-',
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
            后端定时任务同步行情；此处可手动补同步、查看同步结果与行情明细
          </span>
        </div>
      </div>

      <Card size="small" title="手动同步" style={{ marginBottom: 12 }}>
        <Space wrap>
          <Text type="secondary">行情日期</Text>
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
          <Text type="secondary" style={{ fontSize: 12 }}>
            同一文章重复同步幂等，不会重复入库
          </Text>
        </Space>
      </Card>

      <Card
        size="small"
        title="同步记录"
        extra={
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={recordLoading}
            onClick={() => void loadRecords(recordPage)}
          >
            刷新
          </Button>
        }
        style={{ marginBottom: 12 }}
      >
        <Table<SteelQuoteSyncRecord>
          size="small"
          rowKey={(row) => String(row.articleId ?? row.articleUrl)}
          columns={recordColumns}
          dataSource={records}
          loading={recordLoading}
          pagination={{
            current: recordPage + 1,
            pageSize: PAGE_SIZE,
            total: recordTotal,
            showSizeChanger: false,
            onChange: (page) => void loadRecords(page - 1),
          }}
        />
      </Card>

      <Card size="small" title="行情明细">
        <Descriptions size="small" column={1} style={{ marginBottom: 8 }}>
          <Descriptions.Item label="筛选">
            <Space wrap>
              <DatePicker
                size="small"
                style={{ width: 140 }}
                value={quoteDate ? dayjs(quoteDate) : null}
                format="YYYY年M月D日"
                allowClear
                onChange={(value) =>
                  setQuoteDate(value ? value.format('YYYY-MM-DD') : '')
                }
              />
              <Select
                size="small"
                style={{ width: 100 }}
                placeholder="时段"
                allowClear
                value={period || undefined}
                onChange={(value) => setPeriod(value ?? '')}
                options={PERIODS.map((p) => ({ value: p, label: p }))}
              />
              <Input
                size="small"
                style={{ width: 130 }}
                placeholder="钢厂/品牌"
                value={factory}
                onChange={(event) => setFactory(event.target.value)}
              />
              <Input
                size="small"
                style={{ width: 120 }}
                placeholder="材质"
                value={material}
                onChange={(event) => setMaterial(event.target.value)}
              />
              <Button
                size="small"
                icon={<ReloadOutlined />}
                loading={quoteLoading}
                onClick={() => void loadQuotes(0)}
              >
                查询
              </Button>
              <Tag>共 {quoteTotal} 条</Tag>
            </Space>
          </Descriptions.Item>
        </Descriptions>
        <Flex vertical>
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
              onChange: (page) => void loadQuotes(page - 1),
            }}
          />
        </Flex>
      </Card>
    </div>
  )
}
