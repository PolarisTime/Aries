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
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const columns: ColumnsType<SteelQuote> = [
    {
      title: t('marketSync.columnFactory'),
      dataIndex: 'factory',
      width: 120,
      fixed: 'left',
    },
    { title: t('marketSync.columnBreed'), dataIndex: 'breed', width: 90 },
    {
      title: t('marketSync.columnMaterial'),
      dataIndex: 'material',
      width: 100,
    },
    { title: t('marketSync.columnSpec'), dataIndex: 'spec', width: 90 },
    {
      title: t('marketSync.columnPrice'),
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
      title: t('marketSync.columnChange'),
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
    {
      title: t('marketSync.columnRemark'),
      dataIndex: 'remark',
      ellipsis: true,
    },
  ]

  return (
    <Card
      size="small"
      title={
        <Space size={6}>
          <span>{t('marketSync.detailTitle')}</span>
          <Text
            type="secondary"
            style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400 }}
          >
            {selected.date || t('marketSync.notSelected')}
            {selected.period ? ` · ${selected.period}` : ''}
          </Text>
        </Space>
      }
    >
      <Flex
        gap={8}
        align="center"
        wrap="wrap"
        style={{ marginBottom: 'var(--space-xs)' }}
      >
        <Select
          size="small"
          style={{ width: 110 }}
          placeholder={t('marketSync.columnBreed')}
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
          placeholder={t('marketSync.columnMaterial')}
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
          placeholder={t('marketSync.columnFactory')}
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
          placeholder={t('marketSync.columnSpec')}
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
          placeholder={t('marketSync.columnChange')}
          allowClear
          value={form.change}
          onChange={(value) =>
            onFormChange((prev) => ({ ...prev, change: value }))
          }
          options={[
            { value: 'up', label: t('marketSync.up') },
            { value: 'down', label: t('marketSync.down') },
          ]}
        />
        <Button
          size="small"
          type="primary"
          icon={<SearchOutlined />}
          onClick={onApplyFilters}
        >
          {t('marketSync.search')}
        </Button>
        <Button size="small" icon={<ClearOutlined />} onClick={onResetFilters}>
          {t('marketSync.reset')}
        </Button>
        <Button
          size="small"
          icon={<DownloadOutlined />}
          disabled={!selected.date || !selected.period}
          onClick={onExport}
        >
          {t('marketSync.export')}
        </Button>
        {selected.date && selected.period ? (
          <Tooltip title={t('marketSync.goCompareHint')}>
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
              {t('marketSync.goCompare')}
            </Button>
          </Tooltip>
        ) : null}
        <Text
          type="secondary"
          style={{ fontSize: 'var(--font-size-xs)', marginLeft: 'auto' }}
        >
          {t('marketSync.total', { total: quoteTotal })}
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
          description={t('marketSync.selectPeriodHint')}
        />
      )}
    </Card>
  )
}
