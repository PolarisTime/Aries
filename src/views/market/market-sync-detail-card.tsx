import {
  ClearOutlined,
  DownloadOutlined,
  ExportOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Empty,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { Dispatch, SetStateAction } from 'react'
import type { SteelQuote } from '@/api/market/steel-quotes'
import {
  BREEDS,
  type Filters,
  PAGE_SIZE,
  type QuoteSort,
} from './market-sync-model'

const { Text } = Typography

export function MarketSyncDetailCard({
  form,
  onApplyFilters,
  onChangeSort,
  onExport,
  onFormChange,
  onPageChange,
  onResetFilters,
  quotePage,
  quoteTotal,
  quotes,
  quotesFetching,
  selected,
  sort,
}: {
  form: Filters
  onApplyFilters: () => void
  onChangeSort: (sort: QuoteSort) => void
  onExport: () => void
  onFormChange: Dispatch<SetStateAction<Filters>>
  onPageChange: (page: number) => void
  onResetFilters: () => void
  quotePage: number
  quoteTotal: number
  quotes: SteelQuote[]
  quotesFetching: boolean
  selected: { date: string; period: string }
  sort: QuoteSort
}) {
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
          onChange={(value) =>
            onFormChange((prev) => ({ ...prev, breed: value }))
          }
          options={BREEDS.map((b) => ({ value: b, label: b }))}
        />
        <Input
          size="small"
          style={{ width: 110 }}
          placeholder="材质"
          allowClear
          value={form.material}
          onChange={(event) =>
            onFormChange((prev) => ({ ...prev, material: event.target.value }))
          }
          onPressEnter={onApplyFilters}
        />
        <Input
          size="small"
          style={{ width: 120 }}
          placeholder="品牌/钢厂"
          allowClear
          value={form.factory}
          onChange={(event) =>
            onFormChange((prev) => ({ ...prev, factory: event.target.value }))
          }
          onPressEnter={onApplyFilters}
        />
        <Input
          size="small"
          style={{ width: 90 }}
          placeholder="规格"
          allowClear
          value={form.spec}
          onChange={(event) =>
            onFormChange((prev) => ({ ...prev, spec: event.target.value }))
          }
          onPressEnter={onApplyFilters}
        />
        <Select
          size="small"
          style={{ width: 100 }}
          placeholder="涨跌"
          allowClear
          value={form.change}
          onChange={(value) =>
            onFormChange((prev) => ({ ...prev, change: value }))
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
          onClick={onApplyFilters}
        >
          查询
        </Button>
        <Button size="small" icon={<ClearOutlined />} onClick={onResetFilters}>
          重置
        </Button>
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={!selected.date || !selected.period}
          onClick={onExport}
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
          loading={quotesFetching}
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
              onChangeSort({ field, order })
              return
            }
            const page = (pagination.current ?? 1) - 1
            if (page !== quotePage) onPageChange(page)
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
  )
}
