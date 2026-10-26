import { DeleteOutlined, PlusOutlined, SaveOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Empty,
  Flex,
  InputNumber,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  addSupplierPriceColumn,
  fetchSpecRows,
  fetchSupplierPriceGrid,
  removeSupplierPriceColumn,
  type SupplierPriceCellInput,
  type SupplierPriceColumn,
  type SupplierPriceSpecRow,
  saveSupplierPriceColumnItems,
} from '@/api/market/supplier-price-lists'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { message, modal } from '@/utils/antd-app'

/** 行键：与后端条目键同构（类别|材质|规格|定尺）。 */
const rowKeyOf = (row: SupplierPriceSpecRow) =>
  `${row.category}|${row.material}|${row.spec}|${row.length}`

/**
 * 品牌价格表（比价一手价）：**一个品牌一张表，规格做行、供应商做列**。
 *
 * <p>行来自商品资料全量规格（「规格列满」），列来自该品牌下已接入的供应商；格子里填该供应商
 * 对该规格的报价。空 = 不报价（**不是 0 元**，0 元是真实价格）。</p>
 *
 * <p>为什么按列保存而不是"整表保存"：一列 = 一家供应商的一份报价，业务上也是按供应商一批录进来
 * 的。整表保存会让"改了一个格子"变成"重写全表"，并发时互相覆盖。</p>
 */
export function SupplierPriceListPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const brands = useMaterialBrands()
  const [brandName, setBrandName] = useState<string>()
  const [quotedOn, setQuotedOn] = useState(() => dayjs())
  const [pendingSupplierId, setPendingSupplierId] = useState<string>()
  /** 尚未保存的格子：`listId → rowKey → 价格(undefined=未报价)`。 */
  const [drafts, setDrafts] = useState<Record<string, Record<string, number>>>(
    {},
  )

  const specsQuery = useQuery({
    queryKey: ['supplier-price-specs'],
    queryFn: ({ signal }) => fetchSpecRows(signal),
    staleTime: Number.POSITIVE_INFINITY,
  })

  const gridQuery = useQuery({
    queryKey: ['supplier-price-grid', brandName ?? ''],
    queryFn: ({ signal }) => fetchSupplierPriceGrid(brandName ?? '', signal),
    enabled: Boolean(brandName),
    staleTime: 0,
  })

  const suppliers = useQuery({
    queryKey: ['supplier-price-suppliers'],
    queryFn: () => fetchSupplierOptions(),
    staleTime: Number.POSITIVE_INFINITY,
  })

  const columns = gridQuery.data?.columns ?? []

  /** 行集合 = 商品资料全量规格 + 已有报价里出现过的规格（避免历史脏数据被藏起来）。 */
  const rows = useMemo(() => {
    const merged = new Map<string, SupplierPriceSpecRow>()
    for (const row of specsQuery.data ?? []) merged.set(rowKeyOf(row), row)
    for (const row of gridQuery.data?.rows ?? []) {
      const key = rowKeyOf(row)
      if (!merged.has(key)) merged.set(key, row)
    }
    return [...merged.values()].sort(
      (left, right) =>
        left.category.localeCompare(right.category) ||
        left.material.localeCompare(right.material) ||
        left.spec - right.spec ||
        left.length.localeCompare(right.length),
    )
  }, [specsQuery.data, gridQuery.data?.rows])

  const priceOf = (column: SupplierPriceColumn, row: SupplierPriceSpecRow) =>
    drafts[column.listId]?.[rowKeyOf(row)] ??
    gridQuery.data?.rows.find((item) => rowKeyOf(item) === rowKeyOf(row))
      ?.prices[column.listId]

  const setPrice = (
    column: SupplierPriceColumn,
    row: SupplierPriceSpecRow,
    value: number | null,
  ) => {
    setDrafts((current) => {
      const nextColumn = { ...(current[column.listId] ?? {}) }
      const key = rowKeyOf(row)
      if (value === null) delete nextColumn[key]
      else nextColumn[key] = value
      return { ...current, [column.listId]: nextColumn }
    })
  }

  const dirtyOf = (column: SupplierPriceColumn) =>
    Object.keys(drafts[column.listId] ?? {}).length

  const saveColumn = useMutation({
    mutationFn: async (column: SupplierPriceColumn) => {
      const draft = drafts[column.listId] ?? {}
      /*
       * 提交该列的**完整**内容：已有价（未被本次编辑的）也要带上，否则整组替换会把它们删掉。
       * 这正是"按列整组替换"语义要求调用方做的事。
       */
      const items: SupplierPriceCellInput[] = []
      for (const row of rows) {
        const price = draft[rowKeyOf(row)] ?? priceOf(column, row)
        if (price === undefined || price === null) continue
        items.push({
          category: row.category,
          material: row.material,
          spec: row.spec,
          length: row.length,
          price,
        })
      }
      return saveSupplierPriceColumnItems(column.listId, column.version, items)
    },
    onSuccess: async (_saved, column) => {
      setDrafts((current) => {
        const next = { ...current }
        delete next[column.listId]
        return next
      })
      message.success(t('priceCompare.supplierPrice.saved'))
      await queryClient.invalidateQueries({
        queryKey: ['supplier-price-grid'],
      })
    },
  })

  const addColumn = useMutation({
    mutationFn: () =>
      addSupplierPriceColumn({
        brandName: brandName ?? '',
        supplierId: pendingSupplierId ?? '',
        quotedOn: quotedOn.format('YYYY-MM-DD'),
      }),
    onSuccess: async () => {
      setPendingSupplierId(undefined)
      await queryClient.invalidateQueries({
        queryKey: ['supplier-price-grid'],
      })
    },
  })

  const removeColumn = (column: SupplierPriceColumn) => {
    modal.confirm({
      title: t('priceCompare.supplierPrice.removeTitle', {
        name: column.supplierName,
      }),
      content: t('priceCompare.supplierPrice.removeContent'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeSupplierPriceColumn(column.listId)
        await queryClient.invalidateQueries({
          queryKey: ['supplier-price-grid'],
        })
      },
    })
  }

  const tableColumns: ColumnsType<SupplierPriceSpecRow> = [
    {
      title: t('priceCompare.supplierPrice.category'),
      dataIndex: 'category',
      width: 90,
      align: 'center',
    },
    {
      title: t('priceCompare.supplierPrice.spec'),
      key: 'spec',
      width: 190,
      render: (_value, row) => `${row.material} ${row.spec}${row.length}`,
    },
    ...columns.map<ColumnsType<SupplierPriceSpecRow>[number]>((column) => ({
      title: (
        <Flex align="center" gap={4} justify="center">
          <span>{column.supplierName}</span>
          {dirtyOf(column) > 0 ? (
            <Tag color="orange">{dirtyOf(column)}</Tag>
          ) : null}
          <Tooltip title={t('priceCompare.supplierPrice.removeColumn')}>
            <Button
              aria-label={t('priceCompare.supplierPrice.removeColumnA11y', {
                name: column.supplierName,
              })}
              danger
              icon={<DeleteOutlined />}
              size="small"
              type="text"
              onClick={() => removeColumn(column)}
            />
          </Tooltip>
        </Flex>
      ),
      key: column.listId,
      width: 150,
      align: 'right',
      render: (_value, row) => (
        <InputNumber
          aria-label={`${column.supplierName} ${row.material} ${row.spec}${row.length}`}
          min={0}
          precision={2}
          size="small"
          style={{ width: '100%' }}
          value={priceOf(column, row) ?? null}
          onChange={(value) =>
            setPrice(column, row, typeof value === 'number' ? value : null)
          }
        />
      ),
    })),
  ]

  const dirtyCount = columns.reduce((sum, column) => sum + dirtyOf(column), 0)

  return (
    <Flex vertical gap={12} className="supplier-price-page">
      <Flex align="center" gap={8} wrap>
        <Typography.Text strong>
          {t('priceCompare.supplierPrice.brand')}
        </Typography.Text>
        <Select
          aria-label={t('priceCompare.supplierPrice.brand')}
          style={{ width: 200 }}
          value={brandName}
          placeholder={t('priceCompare.supplierPrice.brandPlaceholder')}
          options={brands.map((brand) => ({ value: brand, label: brand }))}
          showSearch
          onChange={(value) => {
            setBrandName(value)
            setDrafts({})
          }}
        />
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.quotedOn')}
        </Typography.Text>
        <DatePicker
          allowClear={false}
          style={{ width: 156 }}
          value={quotedOn}
          onChange={(value) => value && setQuotedOn(value)}
        />
        <Select
          aria-label={t('priceCompare.supplierPrice.addSupplier')}
          style={{ width: 220 }}
          value={pendingSupplierId}
          placeholder={t('priceCompare.supplierPrice.addSupplier')}
          options={(suppliers.data ?? []).map((supplier) => ({
            value: String(supplier.value),
            label: supplier.label,
          }))}
          showSearch={{ optionFilterProp: 'label' }}
          onChange={setPendingSupplierId}
        />
        <Button
          disabled={!brandName || !pendingSupplierId}
          icon={<PlusOutlined />}
          loading={addColumn.isPending}
          onClick={() => addColumn.mutate()}
        >
          {t('priceCompare.supplierPrice.addSupplier')}
        </Button>
        <Button
          disabled={dirtyCount === 0}
          icon={<SaveOutlined />}
          type="primary"
          onClick={() =>
            columns
              .filter((column) => dirtyOf(column) > 0)
              .forEach((column) => {
                saveColumn.mutate(column)
              })
          }
        >
          {t('priceCompare.supplierPrice.saveAll', { count: dirtyCount })}
        </Button>
      </Flex>

      {!brandName ? (
        <Empty description={t('priceCompare.supplierPrice.pickBrand')} />
      ) : (
        <Spin spinning={gridQuery.isFetching || specsQuery.isFetching}>
          <Table<SupplierPriceSpecRow>
            columns={tableColumns}
            dataSource={rows}
            rowKey={rowKeyOf}
            size="small"
            sticky
            scroll={{ x: 'max-content', y: 560 }}
            pagination={false}
            locale={{
              emptyText: (
                <Empty description={t('priceCompare.supplierPrice.empty')} />
              ),
            }}
          />
        </Spin>
      )}
    </Flex>
  )
}
