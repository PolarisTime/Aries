import { PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import {
  type UseQueryResult,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  Button,
  DatePicker,
  Empty,
  Flex,
  InputNumber,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchSpecRows,
  fetchSupplierPriceGrid,
  removeSupplierPriceColumn,
  type SupplierPriceColumn,
  type SupplierPriceGrid,
} from '@/api/market/supplier-price-lists'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { message, modal } from '@/utils/antd-app'
import {
  type BrandDraft,
  brandColumnOrder,
  buildColumnSavePlan,
  type ColumnSavePlan,
  draftCount,
  draftPrice,
  mergeQuoteRows,
  type QuoteRow,
  quoteRowKey,
  type ServerCell,
  serverCellsOf,
  setDraftPrice,
} from './supplier-price-list-model'
import { persistColumnPlans } from './supplier-quote-save'
import './supplier-price.css'

/** 一个品牌列视图：是否已有价格表 + 该列服务端价格索引 + 原始网格。 */
type BrandColumnView = {
  brandName: string
  grid: SupplierPriceGrid | undefined
  column: SupplierPriceColumn | null
  cells: Map<string, ServerCell>
}

/** 品牌列表的一行：视图 + 已填规格数与未保存改动数。 */
type BrandRow = BrandColumnView & {
  filled: number
  dirty: number
}

/** 品牌网格的查询键：与「从价格表带价」同源, 保存后统一失效。 */
const gridQueryKey = (brandName: string) =>
  ['supplier-price-grid', brandName] as const

/**
 * 供应商报价表（比价一手价）——**供应商为主、品牌在其下方**的录入页。
 *
 * <p>层级：选供应商 → 下方是它的品牌列表（经营品牌 + 本次添加 + 已有价格表的历史品牌）
 * → 选中某个品牌后，在下方录入/修改该品牌的规格价格。一次只编辑一个品牌，保存只提交
 * 当前品牌：这与供应商发来的「一份报价单按品牌分段」一致，也不会一次误改多个品牌。</p>
 *
 * <p>存储仍是 `(supplier_id, brand_name)` 一条表头 + 规格条目，本页只是换了投影轴；
 * 报单比价按 (品牌, 商品) 取最低价的口径不受影响。</p>
 */
export function SupplierQuotePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const materialBrands = useMaterialBrands()

  const [supplierId, setSupplierId] = useState<string>()
  const [quotedOn, setQuotedOn] = useState(() => dayjs())
  /** 当前在下方编辑的品牌。 */
  const [requestedBrand, setRequestedBrand] = useState<string>()
  /** 未保存的改动：品牌 → 该列的草稿（切换品牌不丢）。 */
  const [drafts, setDrafts] = useState<Record<string, BrandDraft>>({})
  /** 本次手动添加、且不在「经营品牌」里的品牌。 */
  const [extraBrands, setExtraBrands] = useState<string[]>([])
  const [pendingBrand, setPendingBrand] = useState<string>()
  const [saving, setSaving] = useState(false)

  const suppliersQuery = useQuery({
    queryKey: ['supplier-price-suppliers'],
    queryFn: () => fetchSupplierOptions(),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const specsQuery = useQuery({
    queryKey: ['supplier-price-specs'],
    queryFn: ({ signal }) => fetchSpecRows(signal),
    staleTime: Number.POSITIVE_INFINITY,
  })

  const supplier = useMemo(
    () => suppliersQuery.data?.find((option) => option.value === supplierId),
    [supplierId, suppliersQuery.data],
  )
  const declaredBrands = useMemo(
    () => supplier?.brands ?? [],
    [supplier?.brands],
  )

  /**
   * 候选品牌 = 经营品牌 ∪ 商品品牌全集 ∪ 本次添加。
   *
   * <p>商品品牌全集用于**发现历史数据**：经营品牌没维护、但价格表已经存在的品牌必须也能被维护，
   * 否则那些报价在页面上永远看不见（历史数据里确实存在这种组合）。</p>
   */
  const candidateBrands = useMemo(
    () =>
      brandColumnOrder({
        declared: declaredBrands,
        discover: materialBrands,
        extra: extraBrands,
      }),
    [declaredBrands, extraBrands, materialBrands],
  )

  /**
   * 网格结果经 `combine` 收敛成「稳定的数据数组」。
   *
   * <p>不这么做时 `useQueries` 每次 render 都返回新数组；把它放进 useMemo 依赖会让每次按键
   * 都重算「品牌 × 规格」几千个单元格。`combine` 只在查询结果变化时重新执行（引用需用
   * useCallback 固定）。</p>
   */
  const combineGrids = useCallback(
    (results: UseQueryResult<SupplierPriceGrid>[]) => ({
      grids: results.map((result) => result.data),
      loading: results.some((result) => result.isPending || result.isFetching),
    }),
    [],
  )

  const { grids, loading: gridsLoading } = useQueries({
    queries: supplierId
      ? candidateBrands.map((brandName) => ({
          queryKey: gridQueryKey(brandName),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchSupplierPriceGrid(brandName, signal),
          staleTime: 0,
        }))
      : [],
    combine: combineGrids,
  })

  const { views, viewByBrand, rows } = useMemo(() => {
    const allViews: BrandColumnView[] = candidateBrands.map(
      (brandName, index) => {
        const grid = grids[index]
        const column =
          grid?.columns.find((item) => item.supplierId === supplierId) ?? null
        return { brandName, grid, column, cells: serverCellsOf(grid, column) }
      },
    )
    const shown = new Set([...declaredBrands, ...extraBrands])
    const visibleViews = allViews.filter(
      (view) => shown.has(view.brandName) || view.column !== null,
    )
    const rowList = mergeQuoteRows(
      specsQuery.data ?? [],
      visibleViews.flatMap((view) => view.grid?.rows ?? []),
    )
    return {
      views: visibleViews,
      viewByBrand: new Map(visibleViews.map((view) => [view.brandName, view])),
      rows: rowList,
    }
  }, [
    candidateBrands,
    declaredBrands,
    extraBrands,
    grids,
    specsQuery.data,
    supplierId,
  ])

  /** 品牌列表：已填规格数与未保存改动数按当前数据算。 */
  const brandRows = useMemo<BrandRow[]>(
    () =>
      views.map((view) => ({
        ...view,
        filled: view.cells.size,
        dirty: draftCount(drafts[view.brandName]),
      })),
    [drafts, views],
  )

  const extraBrandSet = useMemo(() => new Set(extraBrands), [extraBrands])
  const visibleBrandSet = useMemo(
    () => new Set(views.map((view) => view.brandName)),
    [views],
  )

  // 用户点选的品牌（可能因供应商切换/品牌移除而失效）：实际选中项由下方派生，不用 effect 同步
  const selectedBrand = useMemo(() => {
    if (requestedBrand && viewByBrand.has(requestedBrand)) return requestedBrand
    return views.length > 0 ? views[0].brandName : undefined
  }, [requestedBrand, viewByBrand, views])

  const selectedView = selectedBrand
    ? viewByBrand.get(selectedBrand)
    : undefined
  const selectedDirty = draftCount(
    selectedBrand ? drafts[selectedBrand] : undefined,
  )

  const totalDirty = views.reduce(
    (sum, view) => sum + draftCount(drafts[view.brandName]),
    0,
  )

  const updateCell = (
    brandName: string,
    rowKey: string,
    value: number | null,
  ) => {
    setDrafts((current) => ({
      ...current,
      [brandName]: setDraftPrice(current[brandName], rowKey, value),
    }))
  }

  const dropDraft = (brandName: string) => {
    setDrafts((current) => {
      const next = { ...current }
      delete next[brandName]
      return next
    })
  }

  const invalidateBrand = async (brandName: string) => {
    await queryClient.invalidateQueries({
      queryKey: gridQueryKey(brandName),
    })
  }

  /** 当前品牌的保存计划（纯函数组装，页面只负责发请求）。 */
  const buildSelectedPlan = (): ColumnSavePlan | null => {
    if (!supplierId || !selectedView) return null
    return buildColumnSavePlan({
      brandName: selectedView.brandName,
      column: selectedView.column,
      rows,
      draft: drafts[selectedView.brandName],
      serverCells: selectedView.cells,
    })
  }

  const saveSelected = async () => {
    if (!supplierId) return
    const plan = buildSelectedPlan()
    if (!plan) {
      message.info(t('priceCompare.supplierPrice.saveNothing'))
      return
    }
    setSaving(true)
    const result = await persistColumnPlans({
      supplierId,
      quotedOn: quotedOn.format('YYYY-MM-DD'),
      plans: [plan],
      onPlanSaved: async (brandName) => {
        dropDraft(brandName)
        await invalidateBrand(brandName)
      },
      onPlanFailed: async (brandName, createdColumn) => {
        if (createdColumn) await invalidateBrand(brandName)
      },
    }).finally(() => setSaving(false))

    if (result.failed.length) {
      message.error(
        t('priceCompare.supplierPrice.saveFailed', {
          names: result.failed.join('、'),
        }),
      )
      return
    }
    message.success(
      t('priceCompare.supplierPrice.savedOne', { name: plan.brandName }),
    )
  }

  /** 移除品牌列：已有价格表走确认+软删除；只是本次添加的新列则直接撤掉。 */
  const removeBrand = (brandName: string) => {
    const column = viewByBrand.get(brandName)?.column
    if (!column) {
      dropDraft(brandName)
      setExtraBrands((current) =>
        current.filter((brand) => brand !== brandName),
      )
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.removeTitle', { name: brandName }),
      content: t('priceCompare.supplierPrice.removeContent'),
      okText: t('common.delete'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: async () => {
        await removeSupplierPriceColumn(column.listId)
        dropDraft(brandName)
        setExtraBrands((current) =>
          current.filter((brand) => brand !== brandName),
        )
        await invalidateBrand(brandName)
      },
    })
  }

  /** 切换供应商会丢弃当前草稿：有未保存改动时先确认。 */
  const changeSupplier = (nextSupplierId: string) => {
    const applyChange = () => {
      setSupplierId(nextSupplierId)
      setExtraBrands([])
      setDrafts({})
      setRequestedBrand(undefined)
    }
    if (totalDirty === 0) {
      applyChange()
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.discardTitle'),
      content: t('priceCompare.supplierPrice.discardContent'),
      okText: t('priceCompare.supplierPrice.discardOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: applyChange,
    })
  }

  const addBrand = () => {
    if (!pendingBrand) return
    setExtraBrands((current) => [...current, pendingBrand])
    setRequestedBrand(pendingBrand)
    setPendingBrand(undefined)
  }

  const brandOptions = materialBrands
    .filter((brand) => !visibleBrandSet.has(brand))
    .map((brand) => ({ value: brand, label: brand }))

  const supplierOptions = (suppliersQuery.data ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))

  const brandTableColumns: ColumnsType<BrandRow> = [
    {
      title: t('priceCompare.supplierPrice.brand'),
      dataIndex: 'brandName',
      render: (brandName: string, row) => (
        <Space size={4}>
          <Typography.Text strong={brandName === selectedBrand}>
            {brandName}
          </Typography.Text>
          {row.dirty > 0 ? (
            <Tag color="orange">
              {t('priceCompare.supplierPrice.unsavedTag')}
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: t('priceCompare.supplierPrice.quotedOn'),
      key: 'quotedOn',
      render: (_value, row) =>
        row.column?.quotedOn
          ? row.column.quotedOn
          : t('priceCompare.supplierPrice.newColumn'),
    },
    {
      title: t('priceCompare.supplierPrice.filledSpecsTitle'),
      key: 'filled',
      render: (_value, row) =>
        t('priceCompare.supplierPrice.filledSpecs', { count: row.filled }),
    },
    {
      title: t('priceCompare.supplierPrice.actions'),
      key: 'actions',
      render: (_value, row) => (
        <Space size={4}>
          <Button
            aria-label={t('priceCompare.supplierPrice.editBrandA11y', {
              name: row.brandName,
            })}
            disabled={row.brandName === selectedBrand}
            size="small"
            type="link"
            onClick={() => setRequestedBrand(row.brandName)}
          >
            {t('priceCompare.supplierPrice.editBrand')}
          </Button>
          {row.column || extraBrandSet.has(row.brandName) ? (
            <Button
              aria-label={t('priceCompare.supplierPrice.removeColumnA11y', {
                name: row.brandName,
              })}
              danger
              size="small"
              type="text"
              onClick={() => removeBrand(row.brandName)}
            >
              {t('common.delete')}
            </Button>
          ) : null}
        </Space>
      ),
    },
  ]

  const detailColumns: ColumnsType<QuoteRow> = [
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
      render: (_value, row) => `${row.material} ${row.spec} ${row.length}`,
    },
    {
      title: t('priceCompare.supplierPrice.price'),
      key: 'price',
      width: 180,
      align: 'right',
      render: (_value, row) => {
        if (!selectedBrand || !selectedView) return null
        const rowKey = quoteRowKey(row)
        return (
          <InputNumber
            aria-label={`${selectedBrand} ${row.material} ${row.spec} ${row.length}`}
            min={0}
            precision={2}
            size="small"
            style={{ width: '100%' }}
            value={draftPrice(
              drafts[selectedBrand],
              rowKey,
              selectedView.cells.get(rowKey)?.price,
            )}
            onChange={(value) =>
              updateCell(
                selectedBrand,
                rowKey,
                typeof value === 'number' ? value : null,
              )
            }
          />
        )
      },
    },
  ]

  return (
    <Flex vertical gap={12} className="supplier-price-page">
      <Flex align="center" gap={8} wrap>
        <Typography.Text strong>
          {t('priceCompare.supplierPrice.supplier')}
        </Typography.Text>
        <Select
          aria-label={t('priceCompare.supplierPrice.supplier')}
          loading={suppliersQuery.isPending}
          options={supplierOptions}
          placeholder={t('priceCompare.supplierPrice.supplierPlaceholder')}
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: 240 }}
          value={supplierId}
          onChange={changeSupplier}
        />
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.quotedOn')}
        </Typography.Text>
        <Tooltip title={t('priceCompare.supplierPrice.quotedOnHint')}>
          <DatePicker
            allowClear={false}
            style={{ width: 156 }}
            value={quotedOn}
            onChange={(value) => value && setQuotedOn(value)}
          />
        </Tooltip>
        <Button
          icon={<ReloadOutlined />}
          loading={gridsLoading}
          onClick={() => {
            for (const brandName of candidateBrands) {
              void invalidateBrand(brandName)
            }
          }}
        >
          {t('priceCompare.supplierPrice.refresh')}
        </Button>
      </Flex>

      <Typography.Text type="secondary">
        {t('priceCompare.supplierPrice.entryHint')}
      </Typography.Text>

      {!supplierId ? (
        <Empty description={t('priceCompare.supplierPrice.pickSupplier')} />
      ) : (
        <Spin spinning={gridsLoading}>
          <Flex vertical gap={8}>
            <Table<BrandRow>
              columns={brandTableColumns}
              dataSource={brandRows}
              pagination={false}
              rowClassName={(row) =>
                [
                  'supplier-price-brand-row',
                  row.brandName === selectedBrand
                    ? 'supplier-price-brand-row--active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
              rowKey="brandName"
              size="small"
              locale={{
                emptyText: (
                  <Empty
                    description={t('priceCompare.supplierPrice.noBrands')}
                  />
                ),
              }}
            />

            {/* 「添加品牌」在品牌列表下方：供应商 → 品牌 → 某品牌规格价格表 */}
            <Flex align="center" gap={8} wrap>
              <Typography.Text type="secondary">
                {t('priceCompare.supplierPrice.addBrand')}
              </Typography.Text>
              <Select
                aria-label={t('priceCompare.supplierPrice.addBrand')}
                options={brandOptions}
                placeholder={t(
                  'priceCompare.supplierPrice.addBrandPlaceholder',
                )}
                showSearch={{ optionFilterProp: 'label' }}
                style={{ width: 200 }}
                value={pendingBrand}
                onChange={setPendingBrand}
              />
              <Button
                disabled={!pendingBrand}
                icon={<PlusOutlined />}
                onClick={addBrand}
              >
                {t('priceCompare.supplierPrice.addBrand')}
              </Button>
            </Flex>

            {!selectedBrand || !selectedView ? (
              <Empty
                description={t('priceCompare.supplierPrice.pickBrandHint')}
              />
            ) : (
              <Flex vertical gap={8}>
                <Flex align="center" gap={8} wrap>
                  <Typography.Text strong>
                    {t('priceCompare.supplierPrice.currentBrand', {
                      name: selectedBrand,
                    })}
                  </Typography.Text>
                  <Button
                    disabled={selectedDirty === 0}
                    icon={<SaveOutlined />}
                    loading={saving}
                    type="primary"
                    onClick={() => void saveSelected()}
                  >
                    {t('priceCompare.supplierPrice.saveAll', {
                      count: selectedDirty,
                    })}
                  </Button>
                </Flex>
                <Spin spinning={saving || specsQuery.isPending}>
                  <Table<QuoteRow>
                    columns={detailColumns}
                    dataSource={rows}
                    pagination={false}
                    rowKey={quoteRowKey}
                    scroll={{ x: 'max-content', y: 520 }}
                    size="small"
                    sticky
                    locale={{
                      emptyText: (
                        <Empty
                          description={t('priceCompare.supplierPrice.empty')}
                        />
                      ),
                    }}
                  />
                </Spin>
              </Flex>
            )}
          </Flex>
        </Spin>
      )}
    </Flex>
  )
}
