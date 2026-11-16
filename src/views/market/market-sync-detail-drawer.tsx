import {
  ClearOutlined,
  DownloadOutlined,
  ExportOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import {
  Button,
  Drawer,
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
import { type Dispatch, type SetStateAction, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SteelQuote } from '@/api/market/steel-quotes'
import { useMasterOptions } from '@/hooks/useMasterOptions'
import { formatDate } from '@/utils/formatters'
import { BREEDS, type Filters, type QuoteSort } from './market-sync-model'

const { Text } = Typography

/**
 * 行情明细: 由内联卡片改为右侧抽屉。
 * 覆盖矩阵是这一屏的主体, 明细按需展开可以避免页面被两张表拉长;
 * 选中时段后打开, 抽屉自身承担滚动(Drawer 会接管焦点并在关闭时归还)。
 */
export function MarketSyncDetailDrawer({
  form,
  onApplyFilters,
  onChangeSort,
  onClose,
  onExport,
  onFormChange,
  onPageChange,
  onResetFilters,
  open,
  pageSize,
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
  onClose: () => void
  onExport: () => void
  onFormChange: Dispatch<SetStateAction<Filters>>
  onPageChange: (page: number) => void
  onResetFilters: () => void
  open: boolean
  /** 明细每页行数（随视口高度自适应，见 detailPageSizeFor）。 */
  pageSize: number
  quotePage: number
  quoteTotal: number
  quotes: SteelQuote[]
  quotesFetching: boolean
  selected: { date: string; period: string }
  sort: QuoteSort
}) {
  const { t } = useTranslation()
  const hasTarget = Boolean(selected.date && selected.period)

  /*
   * 材质 / 品牌钢厂改为下拉：选项来自主数据（与商品资料同一份口径），
   * 抽屉打开时才拉取；当前页行情里出现的工厂再并进品牌选项，避免主数据未收录的钢厂选不到。
   */
  const { brands: masterBrands, materialGrades } = useMasterOptions(
    { brands: true, materialGrades: true },
    open,
  )
  const materialOptions = useMemo(
    () =>
      materialGrades.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [materialGrades],
  )
  const factoryOptions = useMemo(() => {
    const values = new Set<string>(masterBrands)
    for (const quote of quotes) {
      if (quote.factory) values.add(quote.factory)
    }
    return [...values].map((value) => ({ value, label: value }))
  }, [masterBrands, quotes])

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
    <Drawer
      open={open}
      onClose={onClose}
      placement="right"
      size="large"
      // 标题即抽屉的可访问名(antd 会把它接到 aria-labelledby)
      title={
        <Space size={6}>
          <span>{t('marketSync.detailTitle')}</span>
          <Text
            type="secondary"
            style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400 }}
          >
            {selected.date
              ? formatDate(selected.date)
              : t('marketSync.notSelected')}
            {selected.period ? ` · ${selected.period}` : ''}
          </Text>
        </Space>
      }
      extra={
        hasTarget ? (
          <Space size={8}>
            <Button size="small" icon={<DownloadOutlined />} onClick={onExport}>
              {t('marketSync.export')}
            </Button>
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
          </Space>
        ) : null
      }
    >
      {hasTarget ? (
        <div className="market-sync-detail-body">
          <div className="market-sync-detail-filters">
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
            <Select
              size="small"
              style={{ width: 110 }}
              placeholder={t('marketSync.columnMaterial')}
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              value={form.material}
              onChange={(value) =>
                onFormChange((prev) => ({ ...prev, material: value }))
              }
              options={materialOptions}
            />
            <Select
              size="small"
              style={{ width: 120 }}
              placeholder={t('marketSync.columnFactory')}
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              value={form.factory}
              onChange={(value) =>
                onFormChange((prev) => ({ ...prev, factory: value }))
              }
              options={factoryOptions}
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
            <Button
              size="small"
              icon={<ClearOutlined />}
              onClick={onResetFilters}
            >
              {t('marketSync.reset')}
            </Button>
            <Text
              type="secondary"
              style={{ fontSize: 'var(--font-size-xs)' }}
              className="market-sync-detail-target"
            >
              {t('marketSync.total', { total: quoteTotal })}
            </Text>
          </div>
          <Flex vertical style={{ minWidth: 0 }}>
            <Table<SteelQuote>
              size="small"
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
                  single?.order && single.field
                    ? String(single.field)
                    : undefined
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
                pageSize,
                total: quoteTotal,
                showSizeChanger: false,
                size: 'small',
              }}
            />
          </Flex>
        </div>
      ) : (
        <Empty
          className="market-sync-detail-empty"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('marketSync.selectPeriodHint')}
        />
      )}
    </Drawer>
  )
}
