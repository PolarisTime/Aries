import {
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons'
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

/** 一个品牌列视图：列头(是否存在价格表) + 该列服务端价格索引 + 原始网格。 */
type BrandColumnView = {
  brandName: string
  grid: SupplierPriceGrid | undefined
  column: SupplierPriceColumn | null
  cells: Map<string, ServerCell>
}

/** 品牌网格的查询键：与「从价格表带价」同源, 保存后统一失效。 */
const gridQueryKey = (brandName: string) =>
  ['supplier-price-grid', brandName] as const

/**
 * 供应商报价表（比价一手价）——**以供应商为入口的录入页**。
 *
 * <p>业务形态：一家供应商发来一份报价单，跨多个品牌。因此入口是「选供应商」，列是它的
 * **经营品牌**（供应商资料维护；资料没维护时可用「追加品牌」补列），行是商品资料全量规格，
 * 格子里填该供应商对该品牌该规格的报价。</p>
 *
 * <p>为什么不再按品牌录：按品牌入口时，同一份报价单要拆成 N 个品牌页、各保存一次，
 * 而且「报价日期」挂在 (供应商, 品牌) 表头上会被填出多个日期。这里一次录入、按品牌列保存：
 * 一列 = 该供应商在该品牌下的完整报价集合，保存时整组替换。</p>
 *
 * <p>存储仍是 `(supplier_id, brand_name)` 一条表头 + 规格条目，本页只是换了投影轴，
 * 报单比价按 (品牌, 商品) 取最低价的口径不受影响。</p>
 */
export function SupplierQuotePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const materialBrands = useMaterialBrands()

  const [supplierId, setSupplierId] = useState<string>()
  const [quotedOn, setQuotedOn] = useState(() => dayjs())
  /** 未保存的改动：品牌 → 该列的草稿。 */
  const [drafts, setDrafts] = useState<Record<string, BrandDraft>>({})
  /** 本次手动追加、且不在「经营品牌」里的品牌。 */
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
   * 候选品牌 = 经营品牌 ∪ 商品品牌全集 ∪ 本次追加。
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
   * <p>不这么做时，`useQueries` 每次 render 都返回新数组；把它放进 useMemo 依赖会让
   * 每敲一个字符都重算「品牌 × 规格」几千个单元格，输入明显卡顿。`combine` 只在查询结果
   * 变化时重新执行（需用 useCallback 固定其引用，见官方文档说明）。</p>
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

  const visibleBrands = useMemo(
    () => views.map((view) => view.brandName),
    [views],
  )
  const visibleBrandSet = useMemo(() => new Set(visibleBrands), [visibleBrands])
  const extraBrandSet = useMemo(() => new Set(extraBrands), [extraBrands])

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

  /** 构建全部待保存的列（纯函数组装，页面只负责发请求）。 */
  const buildPlans = (): ColumnSavePlan[] => {
    if (!supplierId) return []
    const plans: ColumnSavePlan[] = []
    for (const view of views) {
      const plan = buildColumnSavePlan({
        brandName: view.brandName,
        column: view.column,
        rows,
        draft: drafts[view.brandName],
        serverCells: view.cells,
      })
      if (plan) plans.push(plan)
    }
    return plans
  }

  const saveAll = async () => {
    if (!supplierId) return
    const plans = buildPlans()
    if (!plans.length) {
      message.info(t('priceCompare.supplierPrice.saveNothing'))
      return
    }
    setSaving(true)
    // 保存流程本身在模块级函数里（顺序执行、单列失败不抛出）；这里只负责提示与收尾，
    // 用 promise 的 finally 保证异常路径上 loading 也会复位。
    const result = await persistColumnPlans({
      supplierId,
      quotedOn: quotedOn.format('YYYY-MM-DD'),
      plans,
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
      t('priceCompare.supplierPrice.savedBrands', { count: result.saved }),
    )
  }

  /** 移除品牌列：已有价格表走确认+软删除；只是本次追加的新列则直接撤掉。 */
  const removeColumn = (brandName: string) => {
    const column = viewByBrand.get(brandName)?.column
    if (!column) {
      dropDraft(brandName)
      setExtraBrands((current) =>
        current.filter((brand) => brand !== brandName),
      )
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.removeTitle', {
        name: brandName,
      }),
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
    if (totalDirty === 0) {
      setSupplierId(nextSupplierId)
      setExtraBrands([])
      setDrafts({})
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.discardTitle'),
      content: t('priceCompare.supplierPrice.discardContent'),
      okText: t('priceCompare.supplierPrice.discardOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => {
        setSupplierId(nextSupplierId)
        setExtraBrands([])
        setDrafts({})
      },
    })
  }

  const addBrandColumn = () => {
    if (!pendingBrand) return
    setExtraBrands((current) => [...current, pendingBrand])
    setPendingBrand(undefined)
  }

  const brandOptions = materialBrands
    .filter((brand) => !visibleBrandSet.has(brand))
    .map((brand) => ({ value: brand, label: brand }))

  const supplierOptions = (suppliersQuery.data ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))

  const tableColumns: ColumnsType<QuoteRow> = [
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
    ...views.map<ColumnsType<QuoteRow>[number]>((view) => {
      const brandName = view.brandName
      const column = view.column
      const serverCells = view.cells
      const dirty = draftCount(drafts[brandName])
      return {
        title: (
          <Flex align="center" gap={4} justify="center">
            <Flex vertical align="center" gap={0}>
              <span>{brandName}</span>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {column?.quotedOn
                  ? t('priceCompare.supplierPrice.columnQuotedOn', {
                      date: column.quotedOn,
                    })
                  : t('priceCompare.supplierPrice.newColumn')}
              </Typography.Text>
            </Flex>
            {dirty > 0 ? <Tag color="orange">{dirty}</Tag> : null}
            {column || extraBrandSet.has(brandName) ? (
              <Tooltip title={t('priceCompare.supplierPrice.removeColumn')}>
                <Button
                  aria-label={t('priceCompare.supplierPrice.removeColumnA11y', {
                    name: brandName,
                  })}
                  danger
                  icon={<DeleteOutlined />}
                  size="small"
                  type="text"
                  onClick={() => removeColumn(brandName)}
                />
              </Tooltip>
            ) : null}
          </Flex>
        ),
        key: brandName,
        width: 150,
        align: 'right',
        render: (_value, row) => {
          const rowKey = quoteRowKey(row)
          return (
            <InputNumber
              aria-label={`${brandName} ${row.material} ${row.spec} ${row.length}`}
              min={0}
              precision={2}
              size="small"
              style={{ width: '100%' }}
              value={draftPrice(
                drafts[brandName],
                rowKey,
                serverCells.get(rowKey)?.price,
              )}
              onChange={(value) =>
                updateCell(
                  brandName,
                  rowKey,
                  typeof value === 'number' ? value : null,
                )
              }
            />
          )
        },
      }
    }),
  ]

  return (
    <Flex vertical gap={12} className="supplier-price-page">
      <Flex align="center" gap={8} wrap>
        <Typography.Text strong>
          {t('priceCompare.supplierPrice.supplier')}
        </Typography.Text>
        <Select
          aria-label={t('priceCompare.supplierPrice.supplier')}
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: 240 }}
          value={supplierId}
          placeholder={t('priceCompare.supplierPrice.supplierPlaceholder')}
          options={supplierOptions}
          loading={suppliersQuery.isPending}
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
        <Select
          aria-label={t('priceCompare.supplierPrice.addBrand')}
          showSearch={{ optionFilterProp: 'label' }}
          style={{ width: 180 }}
          value={pendingBrand}
          placeholder={t('priceCompare.supplierPrice.addBrandPlaceholder')}
          options={brandOptions}
          onChange={setPendingBrand}
        />
        <Button
          disabled={!supplierId || !pendingBrand}
          icon={<PlusOutlined />}
          onClick={addBrandColumn}
        >
          {t('priceCompare.supplierPrice.addBrand')}
        </Button>
        <Button
          disabled={totalDirty === 0}
          icon={<SaveOutlined />}
          loading={saving}
          type="primary"
          onClick={() => void saveAll()}
        >
          {t('priceCompare.supplierPrice.saveAll', { count: totalDirty })}
        </Button>
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
        <Spin spinning={saving || specsQuery.isPending || gridsLoading}>
          {views.length === 0 ? (
            <Empty description={t('priceCompare.supplierPrice.noBrands')} />
          ) : (
            <Table<QuoteRow>
              columns={tableColumns}
              dataSource={rows}
              rowKey={quoteRowKey}
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
          )}
        </Spin>
      )}
    </Flex>
  )
}
