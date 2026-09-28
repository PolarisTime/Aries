import {
  DeleteOutlined,
  ImportOutlined,
  PlusOutlined,
  ReloadOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { useQueries, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Input,
  InputNumber,
  Modal,
  Pagination,
  Select,
  Space,
  Spin,
  Table,
  Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { readRequestError } from '@/api/core/request-errors'
import {
  createSupplierPriceAdjustment,
  createSupplierPriceList,
  deleteSupplierPriceList,
  fetchAllSupplierPriceLists,
  fetchSupplierPriceList,
  fetchSupplierPriceSpecCatalog,
  type SupplierPriceListItem,
  type SupplierPriceListSummary,
  updateSupplierPriceList,
} from '@/api/master/supplier-price-lists'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  STALE_MASTER_OPTIONS,
  STALE_REALTIME,
} from '@/constants/query-policies'
import type { EntityId } from '@/types/entity-id'
import { message, modal } from '@/utils/antd-app'
import { SupplierPriceListAdjustModal } from './SupplierPriceListAdjustModal'
import { SupplierPriceListPasteModal } from './SupplierPriceListPasteModal'
import {
  addBrandColumn,
  applyBrandItems,
  buildMatrixAdjustmentPreview,
  buildMatrixState,
  buildReplaceItems,
  computeMatrixStats,
  countFilledForBrand,
  describePriceRow,
  dirtyBrandNames,
  filterMatrixRows,
  formatUpdatedAt,
  isCellFilled,
  markBrandListCreated,
  matrixSignature,
  type PriceMatrixRow,
  type PriceMatrixState,
  type PriceRowFillFilter,
  parsePriceCellText,
  removeBrandColumn,
  updateMatrixCell,
  validateMatrixRows,
} from './supplier-price-list-editor-model'

interface Props {
  supplierId: EntityId
  supplierName: string
  /** 该供应商经营品牌（`md_supplier_brand`，由供应商选项接口带出） */
  brands: string[]
  /** 建表 / 删表 / 存价成功后通知外层刷新标签页与品牌数 */
  onChanged: () => void
}

const PAGE_SIZE_OPTIONS = [50, 100, 200]
const DEFAULT_PAGE_SIZE = 100
/** 单元格错误提示需要行级定位，按品牌 + 行键归集。 */
type CellErrorMap = Record<string, string>

function cellErrorKey(brand: string, rowKey: string): string {
  return `${brand}\u0000${rowKey}`
}

/** 409 = 同一（供应商 + 品牌）已有现表（R2：不再有版本，重复建表即冲突）。 */
function isConflict(error: unknown): boolean {
  return readRequestError(error).status === 409
}

/**
 * 供应商品牌价格表矩阵编辑器（R2）。
 *
 * <p>行 = 规格全集（只读），列 = 品牌（列内只填单价）。**没有版本**：一个（供应商 + 品牌）
 * 只有一张表，因此单元格失焦即提交整表条目（`PUT` 全量替换，幂等；首次填价时按需
 * `POST` 建表）。留空 = 不报价（`null`），绝不写 0。</p>
 *
 * <p>并发：同一品牌的保存串行排队（`queuesRef`），且每次出队时从 `stateRef` 取最新状态，
 * 避免两个格子快速失焦时后一次提交丢失前一次的价。</p>
 */
export function SupplierPriceListMatrixEditor({
  supplierId,
  supplierName,
  brands,
  onChanged,
}: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<PriceMatrixState>(() =>
    buildMatrixState({ catalog: [], lists: [], supplierBrands: brands }),
  )
  const [baseline, setBaseline] = useState('')
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [materialFilter, setMaterialFilter] = useState<string | undefined>()
  const [fillFilter, setFillFilter] = useState<PriceRowFillFilter>('ALL')
  const [fillBrand, setFillBrand] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [savingBrands, setSavingBrands] = useState<string[]>([])
  const [cellErrors, setCellErrors] = useState<CellErrorMap>({})
  const [addBrandOpen, setAddBrandOpen] = useState(false)
  const [brandDraft, setBrandDraft] = useState<string | undefined>()
  const [pasteBrand, setPasteBrand] = useState<string | null>(null)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjusting, setAdjusting] = useState(false)

  const stateRef = useRef(state)
  stateRef.current = state
  /** brandName → 该品牌已从服务端取回并灌入矩阵的现表条目（条目 ID 的真源） */
  const loadedItemsRef = useRef<Record<string, SupplierPriceListItem[]>>({})
  const appliedListsRef = useRef<string[]>([])
  const initializedForRef = useRef('')
  const queuesRef = useRef<Record<string, Promise<void>>>({})
  const tableShellRef = useRef<HTMLDivElement | null>(null)

  const categoriesEnabled = Boolean(supplierId)

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceListSpecCatalog('', ''),
    queryFn: ({ signal }) => fetchSupplierPriceSpecCatalog({}, signal),
    enabled: categoriesEnabled,
    staleTime: STALE_MASTER_OPTIONS,
  })

  const listsQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceLists({
      supplierId,
      page: 1,
      size: 200,
    }),
    queryFn: ({ signal }) => fetchAllSupplierPriceLists({ supplierId }, signal),
    enabled: categoriesEnabled,
    staleTime: STALE_REALTIME,
  })

  const lists = useMemo<SupplierPriceListSummary[]>(
    () => listsQuery.data ?? [],
    [listsQuery.data],
  )

  const detailQueries = useQueries({
    queries: lists.map((list) => ({
      queryKey: QUERY_KEYS.supplierPriceList(list.id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchSupplierPriceList(list.id, signal),
      staleTime: STALE_REALTIME,
    })),
  })

  /**
   * 详情查询的「已到手」指纹。
   *
   * <p>`useQueries` 每次渲染都返回新的数组引用，直接依赖它会让 effect 每帧重跑；这里用
   * 一个稳定的字符串指纹作为唯一依赖（配合 ref 读取最新详情），只有真有数据到达才重跑。</p>
   */
  const detailsKey = detailQueries
    .map((query) =>
      query.data ? `${query.data.id}:${query.data.items.length}` : '',
    )
    .join('|')
  /** effect 里读最新详情用（不把每次渲染都新建的数组放进依赖） */
  const pendingDetailsRef = useRef(
    lists.map((list, index) => ({ list, detail: detailQueries[index]?.data })),
  )
  pendingDetailsRef.current = lists.map((list, index) => ({
    list,
    detail: detailQueries[index]?.data,
  }))

  /** 首次（或切换供应商）时用规格全集 + 现表建立矩阵。 */
  useEffect(() => {
    if (!catalogQuery.data || !listsQuery.data) {
      return
    }
    const token = `${supplierId}`
    if (initializedForRef.current === token) {
      return
    }
    initializedForRef.current = token
    appliedListsRef.current = []
    loadedItemsRef.current = {}
    const next = buildMatrixState({
      catalog: catalogQuery.data,
      lists: listsQuery.data,
      supplierBrands: brands,
    })
    setState(next)
    setBaseline(matrixSignature(next))
  }, [catalogQuery.data, listsQuery.data, supplierId, brands])

  /**
   * 每个现表详情到达后灌进对应品牌列（列级，不覆盖其它品牌的本地编辑）。
   *
   * biome-ignore lint/correctness/useExhaustiveDependencies: detailsKey 是「有新详情到达」
   * 的唯一触发器；详情数组每次渲染都是新引用，不能进依赖，因此用 ref 读取最新值。
   */
  useEffect(() => {
    if (initializedForRef.current !== supplierId) {
      return
    }
    setState((previous) => {
      let next = previous
      for (const { list, detail } of pendingDetailsRef.current) {
        if (!list || !detail) {
          continue
        }
        const appliedToken = `${list.id}:${detail.items.length}`
        if (appliedListsRef.current.includes(appliedToken)) {
          continue
        }
        appliedListsRef.current.push(appliedToken)
        loadedItemsRef.current[list.brandName] = detail.items
        next = applyBrandItems(next, list.brandName, detail.items)
      }
      if (next === previous) {
        return previous
      }
      setBaseline(matrixSignature(next))
      return next
    })
  }, [detailsKey, supplierId])

  const rowErrors = useMemo(() => validateMatrixRows(state.rows), [state.rows])
  const stats = useMemo(() => computeMatrixStats(state), [state])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of state.rows) {
      if (row.category) {
        set.add(row.category)
      }
    }
    return [...set].map((value) => ({ value, label: value }))
  }, [state.rows])

  const materialOptions = useMemo(() => {
    const set = new Set<string>()
    for (const row of state.rows) {
      if (
        row.material &&
        (!categoryFilter || row.category === categoryFilter)
      ) {
        set.add(row.material)
      }
    }
    return [...set].map((value) => ({ value, label: value }))
  }, [state.rows, categoryFilter])

  const filteredRows = useMemo(
    () =>
      filterMatrixRows(state, {
        keyword,
        fill: fillFilter,
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(materialFilter ? { material: materialFilter } : {}),
        ...(fillBrand ? { fillBrand } : {}),
      }),
    [state, keyword, fillFilter, categoryFilter, materialFilter, fillBrand],
  )

  const pageRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  )

  // 筛选/翻页后行数变少时把页码收回范围，避免停留在空页
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(filteredRows.length / pageSize))
    if (page > lastPage) {
      setPage(lastPage)
    }
  }, [filteredRows.length, page, pageSize])

  const pageIndexByRowKey = useMemo(() => {
    const map = new Map<string, number>()
    for (const [index, row] of pageRows.entries()) {
      map.set(row.key, index)
    }
    return map
  }, [pageRows])

  const resetPage = useCallback(() => setPage(1), [])

  /**
   * 提交单个品牌列：无表 → `POST` 建表；有表 → `PUT` 全量替换。
   *
   * <p>`PUT` 会带上「服务端已有条目 + 本地新填的非空条目」，因此未改动、未在本页加载
   * 的历史条目（含规格全集外的脏键）不会被静默删除；价格留空 = 不报价仍以 `null` 提交。</p>
   */
  const persistBrand = useCallback(
    async (brand: string): Promise<void> => {
      const current = stateRef.current
      const list = current.lists[brand]
      if (!list) {
        return
      }
      const preserved = loadedItemsRef.current[brand] ?? []
      const items = buildReplaceItems(current, brand, preserved)
      if (!list.listId) {
        if (!items.some((item) => item.price !== null)) {
          // 该品牌还没有任何报价：不为此建表（空表 = 无意义资源）
          return
        }
        try {
          const detail = await createSupplierPriceList({
            supplierId,
            brandName: brand,
            items,
          })
          setState((previous) =>
            markBrandListCreated(previous, brand, {
              listId: detail.id,
              updatedAt: detail.updatedAt,
              items: detail.items,
            }),
          )
          loadedItemsRef.current[brand] = detail.items
          appliedListsRef.current.push(`${detail.id}:${detail.items.length}`)
          onChanged()
          return
        } catch (error) {
          if (!isConflict(error)) {
            throw error
          }
          // 409：该（供应商 + 品牌）已存在现表（例如另一个标签页刚建过）
          const existing = await fetchAllSupplierPriceLists({ supplierId })
          const found = existing.find((entry) => entry.brandName === brand)
          if (!found) {
            throw error
          }
          setState((previous) => ({
            ...previous,
            lists: {
              ...previous.lists,
              [brand]: {
                brandName: brand,
                listId: found.id,
                updatedAt: found.updatedAt,
                itemCount: found.itemCount,
              },
            },
          }))
          const detail = await fetchSupplierPriceList(found.id)
          loadedItemsRef.current[brand] = detail.items
          appliedListsRef.current.push(`${detail.id}:${detail.items.length}`)
          const payload = buildReplaceItems(
            stateRef.current,
            brand,
            detail.items,
          )
          await updateSupplierPriceList(found.id, {
            supplierId,
            brandName: brand,
            items: payload,
          })
          onChanged()
          return
        }
      }
      await updateSupplierPriceList(list.listId, {
        supplierId,
        brandName: brand,
        items,
      })
      const refreshed = await fetchSupplierPriceList(list.listId)
      loadedItemsRef.current[brand] = refreshed.items
      appliedListsRef.current.push(`${refreshed.id}:${refreshed.items.length}`)
      setState((previous) =>
        markBrandListCreated(previous, brand, {
          listId: refreshed.id,
          updatedAt: refreshed.updatedAt,
          items: refreshed.items,
        }),
      )
      onChanged()
    },
    [onChanged, supplierId],
  )

  /** 同一品牌列的保存串行排队；任务从 `stateRef` 取最新状态，不吞并发编辑。 */
  const enqueuePersist = useCallback(
    (brand: string) => {
      const previous = queuesRef.current[brand] ?? Promise.resolve()
      const next = previous
        .catch(() => undefined)
        .then(async () => {
          setSavingBrands((current) =>
            current.includes(brand) ? current : [...current, brand],
          )
          try {
            await persistBrand(brand)
          } catch (error) {
            message.error(
              error instanceof Error ? error.message : t('api.saveFailed'),
            )
          } finally {
            setSavingBrands((current) =>
              current.filter((name) => name !== brand),
            )
          }
        })
      queuesRef.current[brand] = next
    },
    [persistBrand, t],
  )

  const handleCellChange = useCallback(
    (brand: string, row: PriceMatrixRow, value: number | null) => {
      setState((previous) =>
        updateMatrixCell(previous, brand, row.key, { price: value }),
      )
      setCellErrors((previous) => {
        const key = cellErrorKey(brand, row.key)
        if (!(key in previous)) {
          return previous
        }
        const next = { ...previous }
        delete next[key]
        return next
      })
    },
    [],
  )

  const handleCellBlur = useCallback(
    (brand: string, row: PriceMatrixRow) => {
      const cell = stateRef.current.cells[brand]?.[row.key]
      const parsed = parsePriceCellText(
        cell?.price === null || cell?.price === undefined
          ? ''
          : String(cell.price),
      )
      if (parsed.error) {
        setCellErrors((previous) => ({
          ...previous,
          [cellErrorKey(brand, row.key)]: parsed.error as string,
        }))
        return
      }
      const list = stateRef.current.lists[brand]
      const hasServerItem = Boolean(cell?.itemId)
      if (!list?.listId && !hasServerItem && parsed.price === null) {
        // 尚无价格表的品牌列：空白格子不触发建表
        return
      }
      enqueuePersist(brand)
    },
    [enqueuePersist],
  )

  /** 单价列内 Tab / Shift+Tab 纵向移动（连续录入），横向仍可移动到下一个品牌列。 */
  const handlePriceKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>, row: PriceMatrixRow) => {
      if (event.key !== 'Tab') {
        return
      }
      if (event.altKey || event.ctrlKey || event.metaKey) {
        // 组合键交给浏览器/读屏，不做拦截
        return
      }
      const index = pageIndexByRowKey.get(row.key)
      if (index === undefined) {
        return
      }
      const nextIndex = event.shiftKey ? index - 1 : index + 1
      if (nextIndex < 0 || nextIndex >= pageRows.length) {
        return
      }
      const target = tableShellRef.current?.querySelector<HTMLInputElement>(
        `input[data-price-row-index="${nextIndex}"]`,
      )
      if (!target) {
        return
      }
      event.preventDefault()
      target.focus()
      target.select()
    },
    [pageIndexByRowKey, pageRows.length],
  )

  const handleAddBrand = () => {
    const brand = (brandDraft ?? '').trim()
    if (!brand) {
      message.warning(t('supplierPriceList.brandColumn.nameRequired'))
      return
    }
    if (state.lists[brand] || brandColumnNames.includes(brand)) {
      message.warning(t('supplierPriceList.brandColumn.duplicate'))
      return
    }
    setState((previous) => addBrandColumn(previous, brand))
    setAddBrandOpen(false)
    setBrandDraft(undefined)
  }

  const runAdjust = async (
    mode: 'ADD' | 'SUBTRACT',
    amount: number,
    plans: ReturnType<typeof buildMatrixAdjustmentPreview>['brandPlans'],
  ) => {
    setAdjusting(true)
    const failures: string[] = []
    const succeeded: { brandName: string; prices: Map<EntityId, number> }[] = []
    for (const plan of plans) {
      try {
        const result = await createSupplierPriceAdjustment(plan.listId, {
          mode,
          amount,
          itemIds: plan.itemIds,
        })
        succeeded.push({
          brandName: plan.brandName,
          prices: new Map(
            result.items.flatMap((item) =>
              item.price === null ? [] : [[item.id, item.price] as const],
            ),
          ),
        })
      } catch (error) {
        failures.push(
          `${plan.brandName}：${
            error instanceof Error ? error.message : t('api.saveFailed')
          }`,
        )
      }
    }
    if (succeeded.length) {
      setState((previous) => {
        let next = previous
        for (const brand of succeeded) {
          const brandCells = next.cells[brand.brandName] ?? {}
          for (const row of next.rows) {
            const cell = brandCells[row.key]
            if (!cell?.itemId) {
              continue
            }
            const price = brand.prices.get(cell.itemId)
            if (price === undefined) {
              continue
            }
            next = updateMatrixCell(next, brand.brandName, row.key, { price })
          }
        }
        setBaseline(matrixSignature(next))
        return next
      })
      const affected = succeeded.reduce(
        (sum, brand) => sum + brand.prices.size,
        0,
      )
      message.success(
        t('supplierPriceList.adjust.success', { count: affected }),
      )
      onChanged()
    }
    setAdjusting(false)
    setAdjustOpen(false)
    if (failures.length) {
      message.error(
        t('supplierPriceList.adjust.partialFailed', {
          detail: failures.join('；'),
        }),
      )
    }
  }

  const handleDeleteBrand = useCallback(
    (brand: string) => {
      const list = stateRef.current.lists[brand]
      if (!list?.listId) {
        setState((previous) => removeBrandColumn(previous, brand))
        return
      }
      const listId = list.listId
      modal.confirm({
        title: t('supplierPriceList.brandColumn.deleteTitle', { brand }),
        content: t('supplierPriceList.brandColumn.deleteContent'),
        okText: t('common.ok'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteSupplierPriceList(listId)
            setState((previous) => removeBrandColumn(previous, brand))
            message.success(t('common.deleteSuccess'))
            onChanged()
          } catch (error) {
            message.error(
              error instanceof Error ? error.message : t('api.saveFailed'),
            )
          }
        },
      })
    },
    [onChanged, t],
  )

  const brandColumnNames = state.brandOrder
  const dirtyBrands = useMemo(
    () => new Set(dirtyBrandNames(state, baseline)),
    [state, baseline],
  )
  const dirty = dirtyBrands.size > 0

  const brandOptions = useMemo(() => {
    const existing = new Set(brandColumnNames)
    return brands
      .filter((brand) => !existing.has(brand))
      .map((brand) => ({ value: brand, label: brand }))
  }, [brands, brandColumnNames])

  const columns: ColumnsType<PriceMatrixRow> = useMemo(() => {
    const base: ColumnsType<PriceMatrixRow> = [
      {
        title: t('supplierPriceList.columns.category'),
        dataIndex: 'category',
        width: 96,
        fixed: 'left',
        render: (_: unknown, row) => (
          <span className="supplier-price-list-sticky-cell">
            {row.category || '-'}
          </span>
        ),
      },
      {
        title: t('supplierPriceList.columns.material'),
        dataIndex: 'material',
        width: 140,
        fixed: 'left',
        render: (_: unknown, row) => (
          <span className="supplier-price-list-sticky-cell">
            <span>{row.material}</span>
            {rowErrors.get(row.uid)?.duplicate ? (
              <span className="supplier-price-row-duplicate" role="alert">
                {rowErrors.get(row.uid)?.duplicate}
              </span>
            ) : null}
          </span>
        ),
      },
      {
        title: t('supplierPriceList.columns.spec'),
        dataIndex: 'spec',
        width: 96,
        align: 'right',
        fixed: 'left',
        render: (_: unknown, row) => <span>Φ{row.spec}</span>,
      },
      {
        title: t('supplierPriceList.columns.length'),
        dataIndex: 'length',
        width: 96,
        fixed: 'left',
        render: (_: unknown, row) => <span>{row.length || '-'}</span>,
      },
    ]

    const brandColumns: ColumnsType<PriceMatrixRow> = brandColumnNames.map(
      (brand) => {
        const saving = savingBrands.includes(brand)
        const title = (
          <span
            key={`brand-title:${brand}`}
            className="supplier-price-brand-header"
          >
            <span className="supplier-price-brand-name">{brand}</span>
            {saving ? (
              <span className="supplier-price-brand-state" aria-live="polite">
                {t('supplierPriceList.brandColumn.saving')}
              </span>
            ) : null}
            <Button
              type="text"
              size="small"
              className="supplier-price-brand-delete"
              icon={<DeleteOutlined />}
              aria-label={t('supplierPriceList.brandColumn.deleteNamed', {
                brand,
              })}
              onClick={() => handleDeleteBrand(brand)}
            />
          </span>
        )
        return {
          key: `brand:${brand}`,
          title,
          width: 132,
          align: 'right',
          render: (_: unknown, row: PriceMatrixRow) => {
            const cell = state.cells[brand]?.[row.key]
            const error = cellErrors[cellErrorKey(brand, row.key)]
            const index = pageIndexByRowKey.get(row.key)
            const rowLabel = describePriceRow(row)
            const filled = isCellFilled(cell)
            return (
              <div className="supplier-price-cell">
                <InputNumber
                  size="small"
                  min={0}
                  precision={2}
                  controls={false}
                  status={error ? 'error' : undefined}
                  placeholder={t('supplierPriceList.priceEmptyHint')}
                  aria-label={t('supplierPriceList.columns.priceNamed', {
                    brand,
                    row: rowLabel,
                  })}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? `price-error-${brand}-${row.uid}` : undefined
                  }
                  data-price-row-index={index}
                  data-brand={brand}
                  value={cell?.price ?? null}
                  onChange={(value) => handleCellChange(brand, row, value)}
                  onBlur={() => handleCellBlur(brand, row)}
                  onKeyDown={(event) => handlePriceKeyDown(event, row)}
                  onPaste={(event) => {
                    const text = event.clipboardData.getData('text')
                    if (!/[\t\r\n]/.test(text)) {
                      return
                    }
                    event.preventDefault()
                    setPasteBrand(brand)
                  }}
                />
                {/*
                 * WCAG 1.4.1: 「不报价」不能只靠颜色/留空表达, 这里给文字标记。
                 * 有服务端条目但价为 null 才是真正的「不报价」, 其余是「未填写」。
                 */}
                <span className="supplier-price-cell-marker">
                  {error ? (
                    <span
                      className="supplier-price-row-error"
                      role="alert"
                      id={`price-error-${brand}-${row.uid}`}
                    >
                      {error}
                    </span>
                  ) : filled ? null : cell?.itemId ? (
                    t('supplierPriceList.noQuote')
                  ) : (
                    t('supplierPriceList.notFilled')
                  )}
                </span>
              </div>
            )
          },
        }
      },
    )

    return [...base, ...brandColumns]
  }, [
    t,
    brandColumnNames,
    state.cells,
    savingBrands,
    cellErrors,
    pageIndexByRowKey,
    rowErrors,
    handleCellChange,
    handleCellBlur,
    handlePriceKeyDown,
    handleDeleteBrand,
  ])

  const loadError =
    catalogQuery.error ??
    listsQuery.error ??
    detailQueries.find((q) => q.error)?.error

  const brandFilledLabels = brandColumnNames.map((brand) => ({
    brand,
    filled: countFilledForBrand(state, brand),
  }))

  // 只有「已建表且有价」或「有价但尚未建表」的条目能参与整体加减
  const adjustPreview = useMemo(
    () => buildMatrixAdjustmentPreview(state, 'ADD', 0),
    [state],
  )
  const adjustEnabled =
    adjustPreview.affectedCount > 0 || adjustPreview.unsavedCount > 0

  if (!categoriesEnabled) {
    return null
  }

  return (
    <div className="supplier-price-list-editor">
      <div className="supplier-price-list-editor-actions">
        <Input
          allowClear
          style={{ width: 240 }}
          aria-label={t('supplierPriceList.filter.keyword')}
          placeholder={t('supplierPriceList.filter.keyword')}
          value={keyword}
          onChange={(event) => {
            setKeyword(event.target.value)
            resetPage()
          }}
        />
        <Select
          allowClear
          style={{ width: 130 }}
          aria-label={t('supplierPriceList.filter.category')}
          placeholder={t('supplierPriceList.filter.category')}
          value={categoryFilter}
          onChange={(value) => {
            setCategoryFilter(value)
            setMaterialFilter(undefined)
            resetPage()
          }}
          options={categoryOptions}
        />
        <Select
          allowClear
          style={{ width: 150 }}
          aria-label={t('supplierPriceList.filter.material')}
          placeholder={t('supplierPriceList.filter.material')}
          value={materialFilter}
          onChange={(value) => {
            setMaterialFilter(value)
            resetPage()
          }}
          options={materialOptions}
        />
        <Select<PriceRowFillFilter>
          style={{ width: 130 }}
          aria-label={t('supplierPriceList.filter.fill')}
          value={fillFilter}
          onChange={(value) => {
            setFillFilter(value)
            resetPage()
          }}
          options={[
            { value: 'ALL', label: t('supplierPriceList.filter.fillAll') },
            {
              value: 'UNFILLED',
              label: t('supplierPriceList.filter.fillUnfilled'),
            },
            {
              value: 'FILLED',
              label: t('supplierPriceList.filter.fillFilled'),
            },
          ]}
        />
        {fillFilter !== 'ALL' && brandColumnNames.length ? (
          <Select
            allowClear
            style={{ width: 160 }}
            aria-label={t('supplierPriceList.filter.fillBrand')}
            placeholder={t('supplierPriceList.filter.fillBrandAll')}
            value={fillBrand}
            onChange={(value) => {
              setFillBrand(value)
              resetPage()
            }}
            options={brandColumnNames.map((brand) => ({
              value: brand,
              label: brand,
            }))}
          />
        ) : null}
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setBrandDraft(undefined)
            setAddBrandOpen(true)
          }}
        >
          {t('supplierPriceList.brandColumn.add')}
        </Button>
        <Button icon={<ImportOutlined />} onClick={() => setPasteBrand('')}>
          {t('supplierPriceList.actions.paste')}
        </Button>
        <Button
          icon={<TableOutlined />}
          disabled={!adjustEnabled}
          onClick={() => setAdjustOpen(true)}
        >
          {t('supplierPriceList.actions.adjust')}
        </Button>
        <Tooltip title={t('common.refresh')}>
          <Button
            type="text"
            aria-label={t('common.refresh')}
            icon={<ReloadOutlined />}
            loading={listsQuery.isFetching || catalogQuery.isFetching}
            onClick={() => {
              void catalogQuery.refetch()
              void listsQuery.refetch()
            }}
          />
        </Tooltip>
      </div>

      <div className="supplier-price-list-editor-summary" aria-live="polite">
        <span>
          {t('supplierPriceList.summary.supplier', { name: supplierName })}
        </span>
        <span>
          {t('supplierPriceList.summary.total', { count: stats.totalRows })}
        </span>
        <span>
          {t('supplierPriceList.summary.brands', { count: stats.brandCount })}
        </span>
        <span>
          {t('supplierPriceList.summary.filled', { count: stats.filledTotal })}
        </span>
        <span>
          {t('supplierPriceList.summary.filtered', {
            count: filteredRows.length,
          })}
        </span>
        {stats.updatedAt ? (
          <span>
            {t('supplierPriceList.summary.updatedAt', {
              time: formatUpdatedAt(stats.updatedAt),
            })}
          </span>
        ) : null}
        {dirty ? (
          <span className="supplier-price-list-dirty">
            {t('supplierPriceList.summary.unsaved')}
          </span>
        ) : null}
      </div>

      {brandColumnNames.length ? (
        <div className="supplier-price-list-editor-summary">
          {brandFilledLabels.map(({ brand, filled }) => (
            <span key={brand}>
              {t('supplierPriceList.summary.brandFilled', {
                brand,
                count: filled,
              })}
            </span>
          ))}
        </div>
      ) : (
        <Alert
          type="info"
          showIcon
          title={t('supplierPriceList.brandColumn.emptyHint')}
        />
      )}

      {loadError ? (
        <Alert
          type="error"
          showIcon
          title={
            loadError instanceof Error ? loadError.message : t('api.loadFailed')
          }
          action={
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => {
                void catalogQuery.refetch()
                void listsQuery.refetch()
              }}
            >
              {t('errorBoundary.retry')}
            </Button>
          }
        />
      ) : null}

      <div
        ref={tableShellRef}
        className="supplier-price-list-matrix-scroll price-compare-table"
      >
        <Spin spinning={catalogQuery.isLoading || listsQuery.isLoading}>
          <Table<PriceMatrixRow>
            className="supplier-price-matrix-table"
            rowKey="uid"
            size="small"
            columns={columns}
            dataSource={pageRows}
            pagination={false}
            scroll={{ x: 'max-content' }}
          />
        </Spin>
      </div>

      <div className="supplier-price-list-editor-pagination">
        <Pagination
          size="small"
          current={page}
          pageSize={pageSize}
          total={filteredRows.length}
          showSizeChanger
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          showTotal={(total) =>
            t('supplierPriceList.paginationTotal', { count: total })
          }
          onChange={(nextPage, nextPageSize) => {
            setPage(nextPageSize === pageSize ? nextPage : 1)
            setPageSize(nextPageSize)
          }}
        />
      </div>

      {addBrandOpen ? (
        <Modal
          open
          title={t('supplierPriceList.brandColumn.addTitle')}
          okText={t('common.ok')}
          cancelText={t('common.cancel')}
          onOk={handleAddBrand}
          onCancel={() => setAddBrandOpen(false)}
          destroyOnHidden
        >
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              style={{ width: '100%' }}
              aria-label={t('supplierPriceList.brandColumn.selectLabel')}
              placeholder={
                brands.length
                  ? t('supplierPriceList.brandColumn.selectPlaceholder')
                  : t('supplierPriceList.header.brandManual')
              }
              value={brandDraft}
              onChange={(value) => setBrandDraft(value)}
              options={brandOptions}
            />
            <Input
              maxLength={64}
              aria-label={t('supplierPriceList.brandColumn.manualLabel')}
              placeholder={t('supplierPriceList.brandColumn.manualPlaceholder')}
              value={brandDraft ?? ''}
              onChange={(event) => setBrandDraft(event.target.value)}
            />
            <Alert
              type="info"
              showIcon
              title={t('supplierPriceList.brandColumn.addHint')}
            />
          </Space>
        </Modal>
      ) : null}

      {pasteBrand !== null ? (
        <SupplierPriceListPasteModal
          brandName={pasteBrand}
          state={state}
          onCancel={() => setPasteBrand(null)}
          onApply={(result) => {
            setState(result.state)
            setPasteBrand(null)
            message.success(
              t('supplierPriceList.paste.appliedToast', {
                count: result.appliedCount,
              }),
            )
          }}
        />
      ) : null}

      {adjustOpen ? (
        <SupplierPriceListAdjustModal
          state={state}
          brandNames={brandColumnNames}
          saving={adjusting}
          onCancel={() => setAdjustOpen(false)}
          onSubmit={(mode, amount, plans) => {
            void runAdjust(mode, amount, plans)
          }}
        />
      ) : null}
    </div>
  )
}
