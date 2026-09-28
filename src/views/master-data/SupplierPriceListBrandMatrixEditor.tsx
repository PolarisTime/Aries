import {
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
  useLayoutEffect,
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
import { ColumnHeaderMenu } from '@/components/ColumnHeaderMenu'
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
  addSupplierColumn,
  applyColumnItems,
  applyMatrixPaste,
  type buildMatrixAdjustmentPreview,
  buildMatrixState,
  buildReplaceItems,
  computeMatrixStats,
  countFilledForColumn,
  describePriceColumn,
  describePriceRow,
  dirtySupplierIds,
  filterMatrixRows,
  formatUpdatedAt,
  isCellFilled,
  markColumnListCreated,
  matrixSignature,
  type PriceMatrixRow,
  type PriceMatrixState,
  type PriceRowFillFilter,
  parseBlockPasteLayout,
  parsePriceCellText,
  removeSupplierColumn,
  updateMatrixCell,
  validateMatrixRows,
} from './supplier-price-list-editor-model'

/** 供应商下拉选项（列候选：尚无该品牌价格表的供应商）。 */
export type SupplierColumnOption = {
  supplierId: EntityId
  supplierName: string
}

interface Props {
  /** 视图所属品牌（页级标签） */
  brandName: string
  /** 可追加为列的供应商（该品牌下尚无价格表的供应商） */
  supplierColumns: SupplierColumnOption[]
  /** 建表 / 删表 / 存价成功后通知外层刷新标签页与品牌统计 */
  onChanged: () => void
}

const PAGE_SIZE_OPTIONS = [50, 100, 200]
const DEFAULT_PAGE_SIZE = 100
/** 单元格错误提示需要行级定位，按供应商列 + 行键归集。 */
type CellErrorMap = Record<string, string>

function cellErrorKey(supplierId: EntityId, rowKey: string): string {
  return `${supplierId}\u0000${rowKey}`
}

/** 409 = 该（供应商 + 品牌）已有现表（R2 不再有版本，重复建表即冲突）。 */
function isConflict(error: unknown): boolean {
  return readRequestError(error).status === 409
}

/**
 * 供应商品牌价格表**品牌视图矩阵**编辑器（R2 + 轴向变更）。
 *
 * <p>行 = 规格全集（只读），列 = 供应商（列内只填该供应商对该品牌的单价）。
 * **没有版本**：一个（供应商 + 品牌）只有一张表，因此单元格失焦即提交该列整表条目
 * （`PUT` 全量替换，幂等；首次填价时按需 `POST` 建表）。留空 = 不报价（`null`），绝不写 0。</p>
 *
 * <p>并发：同一列的保存串行排队（`queuesRef`），且每次出队时从 `stateRef` 取最新状态，
 * 避免两个格子快速失焦时后一次提交丢失前一次的价。</p>
 *
 * <p>整体加减按价格表（供应商 + 品牌）生效，因此入口在**列头菜单**上，一次只针对该列；
 * 不存在跨供应商的批量加减接口，前端也不发明。</p>
 */
export function SupplierPriceListBrandMatrixEditor({
  brandName,
  supplierColumns,
  onChanged,
}: Props) {
  const { t } = useTranslation()
  const [state, setState] = useState<PriceMatrixState>(() =>
    buildMatrixState({ brandName, catalog: [], lists: [] }),
  )
  const [baseline, setBaseline] = useState('')
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>()
  const [materialFilter, setMaterialFilter] = useState<string | undefined>()
  const [fillFilter, setFillFilter] = useState<PriceRowFillFilter>('ALL')
  const [fillSupplierId, setFillSupplierId] = useState<EntityId | undefined>()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [savingColumns, setSavingColumns] = useState<EntityId[]>([])
  const [cellErrors, setCellErrors] = useState<CellErrorMap>({})
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [columnDraft, setColumnDraft] = useState<EntityId | undefined>()
  const [pasteOpen, setPasteOpen] = useState(false)
  const [adjustSupplierId, setAdjustSupplierId] = useState<EntityId | null>(
    null,
  )
  const [adjusting, setAdjusting] = useState(false)

  /**
   * 最新矩阵状态的 ref。
   *
   * <p>保存/删除等异步流程要读「当前」状态，但又不能把 state 放进 useCallback 依赖
   * （否则每次录入都会重建回调、破坏列定义的引用稳定性），因此用 ref 读取。
   * 写入放在 layout effect 里而不是渲染期间，避免渲染期改 ref（React Compiler 会因此放弃优化）。</p>
   */
  const stateRef = useRef<PriceMatrixState>(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])
  /** supplierId → 该列已从服务端取回并灌入矩阵的现表条目（条目 ID 的真源） */
  const loadedItemsRef = useRef<Record<EntityId, SupplierPriceListItem[]>>({})
  const appliedListsRef = useRef<string[]>([])
  const initializedForRef = useRef('')
  const queuesRef = useRef<Record<EntityId, Promise<void>>>({})
  const tableShellRef = useRef<HTMLDivElement | null>(null)

  const catalogQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceListSpecCatalog('', ''),
    queryFn: ({ signal }) => fetchSupplierPriceSpecCatalog({}, signal),
    staleTime: STALE_MASTER_OPTIONS,
  })

  // 只取该品牌的现表：一个（供应商, 品牌）一行
  const listsQuery = useQuery({
    queryKey: QUERY_KEYS.supplierPriceLists({
      brandName,
      page: 1,
      size: 200,
    }),
    queryFn: ({ signal }) => fetchAllSupplierPriceLists({ brandName }, signal),
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
  /** effect 里读最新详情用（不把每次渲染都新建的数组放进依赖），同样在 layout effect 里写 */
  const pendingDetailsRef = useRef<
    { supplierId: EntityId; detailItems: SupplierPriceListItem[] }[]
  >([])
  useLayoutEffect(() => {
    pendingDetailsRef.current = lists.map((list, index) => ({
      supplierId: list.supplierId,
      detailItems: detailQueries[index]?.data?.items ?? [],
    }))
  })

  /** 首次（或切换品牌）时用规格全集 + 该品牌现表建立矩阵。 */
  useEffect(() => {
    if (!catalogQuery.data || !listsQuery.data) {
      return
    }
    const token = `${brandName}`
    if (initializedForRef.current === token) {
      return
    }
    initializedForRef.current = token
    appliedListsRef.current = []
    loadedItemsRef.current = {}
    const next = buildMatrixState({
      brandName,
      catalog: catalogQuery.data,
      lists: listsQuery.data,
      extraSuppliers: supplierColumns,
    })
    setState(next)
    setBaseline(matrixSignature(next))
  }, [catalogQuery.data, listsQuery.data, brandName, supplierColumns])

  /**
   * 每个现表详情到达后灌进对应供应商列（列级，不覆盖其它列的本地编辑）。
   *
   * biome-ignore lint/correctness/useExhaustiveDependencies: detailsKey 是「有新详情到达」
   * 的唯一触发器；详情数组每次渲染都是新引用，不能进依赖，因此用 ref 读取最新值。
   */
  useEffect(() => {
    if (initializedForRef.current !== brandName) {
      return
    }
    const previous = stateRef.current
    let next = previous
    for (const { supplierId, detailItems } of pendingDetailsRef.current) {
      if (!detailItems.length) {
        continue
      }
      const appliedToken = `${supplierId}:${detailItems.length}`
      if (appliedListsRef.current.includes(appliedToken)) {
        continue
      }
      appliedListsRef.current.push(appliedToken)
      loadedItemsRef.current[supplierId] = detailItems
      next = applyColumnItems(next, supplierId, detailItems)
    }
    if (next === previous) {
      return
    }
    // 服务端条目是权威数据, 带价后连同基线一起前移(不算「未保存修改」)
    setState(next)
    setBaseline(matrixSignature(next))
  }, [detailsKey, brandName])

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
        ...(fillSupplierId ? { fillSupplierId } : {}),
      }),
    [
      state,
      keyword,
      fillFilter,
      categoryFilter,
      materialFilter,
      fillSupplierId,
    ],
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
   * 提交单列：无表 → `POST` 建表；有表 → `PUT` 全量替换。
   *
   * <p>`PUT` 会带上「服务端已有条目 + 本地新填的非空条目」，因此未改动、未在本页加载
   * 的历史条目（含规格全集外的脏键）不会被静默删除；价格留空 = 不报价仍以 `null` 提交。</p>
   */
  const persistColumn = useCallback(
    async (supplierId: EntityId): Promise<void> => {
      const current = stateRef.current
      const column = current.columns[supplierId]
      if (!column) {
        return
      }
      const preserved = loadedItemsRef.current[supplierId] ?? []
      const items = buildReplaceItems(current, supplierId, preserved)
      const payload = {
        supplierId: column.supplierId,
        brandName: current.brandName,
        items,
      }
      if (!column.listId) {
        if (!items.some((item) => item.price !== null)) {
          // 该列还没有任何报价：不为此建表（空表 = 无意义资源）
          return
        }
        try {
          const detail = await createSupplierPriceList(payload)
          setState((previous) =>
            markColumnListCreated(previous, supplierId, {
              listId: detail.id,
              updatedAt: detail.updatedAt,
              items: detail.items,
            }),
          )
          loadedItemsRef.current[supplierId] = detail.items
          appliedListsRef.current.push(`${supplierId}:${detail.items.length}`)
          onChanged()
          return
        } catch (error) {
          if (!isConflict(error)) {
            throw error
          }
          // 409：该（供应商 + 品牌）已存在现表（例如另一个标签页刚建过）
          const existing = await fetchAllSupplierPriceLists({
            brandName: current.brandName,
          })
          const found = existing.find(
            (entry) => entry.supplierId === supplierId,
          )
          if (!found) {
            throw error
          }
          setState((previous) => ({
            ...previous,
            columns: {
              ...previous.columns,
              [supplierId]: {
                ...previous.columns[supplierId],
                listId: found.id,
                updatedAt: found.updatedAt,
                itemCount: found.itemCount,
              },
            },
          }))
          const detail = await fetchSupplierPriceList(found.id)
          loadedItemsRef.current[supplierId] = detail.items
          appliedListsRef.current.push(`${supplierId}:${detail.items.length}`)
          await updateSupplierPriceList(found.id, {
            ...payload,
            items: buildReplaceItems(
              stateRef.current,
              supplierId,
              detail.items,
            ),
          })
          onChanged()
          return
        }
      }
      await updateSupplierPriceList(column.listId, payload)
      const refreshed = await fetchSupplierPriceList(column.listId)
      loadedItemsRef.current[supplierId] = refreshed.items
      appliedListsRef.current.push(`${supplierId}:${refreshed.items.length}`)
      setState((previous) =>
        markColumnListCreated(previous, supplierId, {
          listId: refreshed.id,
          updatedAt: refreshed.updatedAt,
          items: refreshed.items,
        }),
      )
      onChanged()
    },
    [onChanged],
  )

  /** 同一列的保存串行排队；任务从 `stateRef` 取最新状态，不吞并发编辑。 */
  const enqueuePersist = useCallback(
    (supplierId: EntityId) => {
      const previous = queuesRef.current[supplierId] ?? Promise.resolve()
      const next = previous
        .catch(() => undefined)
        .then(async () => {
          setSavingColumns((current) =>
            current.includes(supplierId) ? current : [...current, supplierId],
          )
          try {
            await persistColumn(supplierId)
          } catch (error) {
            message.error(
              error instanceof Error ? error.message : t('api.saveFailed'),
            )
          } finally {
            setSavingColumns((current) =>
              current.filter((id) => id !== supplierId),
            )
          }
        })
      queuesRef.current[supplierId] = next
    },
    [persistColumn, t],
  )

  const handleCellChange = useCallback(
    (supplierId: EntityId, row: PriceMatrixRow, value: number | null) => {
      setState((previous) =>
        updateMatrixCell(previous, supplierId, row.key, { price: value }),
      )
      setCellErrors((previous) => {
        const key = cellErrorKey(supplierId, row.key)
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
    (supplierId: EntityId, row: PriceMatrixRow) => {
      const cell = stateRef.current.cells[supplierId]?.[row.key]
      const parsed = parsePriceCellText(
        cell?.price === null || cell?.price === undefined
          ? ''
          : String(cell.price),
      )
      if (parsed.error) {
        setCellErrors((previous) => ({
          ...previous,
          [cellErrorKey(supplierId, row.key)]: parsed.error as string,
        }))
        return
      }
      const column = stateRef.current.columns[supplierId]
      const hasServerItem = Boolean(cell?.itemId)
      if (!column?.listId && !hasServerItem && parsed.price === null) {
        // 尚无价格表的列：空白格子不触发建表
        return
      }
      enqueuePersist(supplierId)
    },
    [enqueuePersist],
  )

  /** 单价列内 Tab / Shift+Tab 纵向移动（连续录入），横向仍可移动到下一个供应商列。 */
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

  const handleAddColumn = () => {
    const option = supplierColumns.find(
      (item) => item.supplierId === columnDraft,
    )
    if (!option) {
      message.warning(t('supplierPriceList.supplierColumn.selectRequired'))
      return
    }
    if (state.columns[option.supplierId]) {
      message.warning(t('supplierPriceList.supplierColumn.duplicate'))
      return
    }
    setState((previous) => addSupplierColumn(previous, option))
    setAddColumnOpen(false)
    setColumnDraft(undefined)
  }

  const runAdjust = async (
    supplierId: EntityId,
    mode: 'ADD' | 'SUBTRACT',
    amount: number,
    preview: ReturnType<typeof buildMatrixAdjustmentPreview>,
  ) => {
    if (!preview.target) {
      return
    }
    setAdjusting(true)
    try {
      const result = await createSupplierPriceAdjustment(
        preview.target.listId,
        {
          mode,
          amount,
          itemIds: preview.itemIds,
        },
      )
      /*
       * 直接以 stateRef 的当前状态算出新矩阵再 setState: 状态更新函数必须是纯函数,
       * 不能在 updater 里顺手 setBaseline(React Compiler 会因此判定不纯)。
       * 服务端已落库, 因此新状态同时成为新基线。
       */
      let next = stateRef.current
      const prices = new Map<EntityId, number>(
        result.items.flatMap((item) =>
          item.price === null ? [] : [[item.id, item.price] as const],
        ),
      )
      const columnCells = next.cells[supplierId] ?? {}
      for (const row of next.rows) {
        const cell = columnCells[row.key]
        if (!cell?.itemId) {
          continue
        }
        const price = prices.get(cell.itemId)
        if (price === undefined) {
          continue
        }
        next = updateMatrixCell(next, supplierId, row.key, { price })
      }
      setState(next)
      setBaseline(matrixSignature(next))
      message.success(
        t('supplierPriceList.adjust.success', { count: result.affectedCount }),
      )
      onChanged()
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : t('api.saveFailed'),
      )
    } finally {
      setAdjusting(false)
      setAdjustSupplierId(null)
    }
  }

  const handleDeleteColumn = useCallback(
    (supplierId: EntityId) => {
      const column = stateRef.current.columns[supplierId]
      if (!column) {
        return
      }
      const label = describePriceColumn(column)
      if (!column.listId) {
        setState((previous) => removeSupplierColumn(previous, supplierId))
        return
      }
      const listId = column.listId
      modal.confirm({
        title: t('supplierPriceList.supplierColumn.deleteTitle', {
          supplier: label,
          brand: stateRef.current.brandName,
        }),
        content: t('supplierPriceList.supplierColumn.deleteContent'),
        okText: t('common.ok'),
        cancelText: t('common.cancel'),
        okButtonProps: { danger: true },
        onOk: async () => {
          try {
            await deleteSupplierPriceList(listId)
            setState((previous) => removeSupplierColumn(previous, supplierId))
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

  /** 整块粘贴：按供应商名拆列后逐列写入各自的（供应商, 品牌）价格表。 */
  const applyBlockPaste = useCallback(
    (text: string) => {
      const current = stateRef.current
      const layout = parseBlockPasteLayout(
        text,
        current.columnOrder.map((supplierId) => ({
          supplierId,
          supplierName: current.columns[supplierId]?.supplierName ?? '',
        })),
      )
      let next = current
      let applied = 0
      for (const column of layout.columns) {
        const result = applyMatrixPaste(next, column.supplierId, column.text)
        next = result.state
        applied += result.appliedCount
      }
      setState(next)
      setPasteOpen(false)
      message.success(
        t('supplierPriceList.paste.appliedToast', { count: applied }),
      )
      if (layout.unknownSupplierNames.length) {
        message.warning(
          t('supplierPriceList.paste.blockSkipped', {
            names: layout.unknownSupplierNames.join('、'),
          }),
        )
      }
    },
    [t],
  )

  const columnNames = state.columnOrder
  const dirtyColumns = useMemo(
    () => new Set(dirtySupplierIds(state, baseline)),
    [state, baseline],
  )
  const dirty = dirtyColumns.size > 0

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

    const supplierColumnDefs: ColumnsType<PriceMatrixRow> = columnNames.map(
      (supplierId) => {
        const column = state.columns[supplierId]
        const saving = savingColumns.includes(supplierId)
        const label = column ? describePriceColumn(column) : `#${supplierId}`
        const filled = countFilledForColumn(state, supplierId)
        const title = (
          <ColumnHeaderMenu
            key={`column-menu:${supplierId}`}
            columnTitle={label}
            extraItems={[
              {
                key: 'adjust',
                icon: <TableOutlined />,
                label: t('supplierPriceList.actions.adjust'),
                disabled: !column?.listId,
              },
              { type: 'divider' },
              {
                key: 'delete',
                danger: true,
                label: t('supplierPriceList.supplierColumn.delete'),
              },
            ]}
            onExtraItem={(key) => {
              if (key === 'adjust') {
                setAdjustSupplierId(supplierId)
              }
              if (key === 'delete') {
                handleDeleteColumn(supplierId)
              }
            }}
          >
            <span className="supplier-price-brand-header">
              <span className="supplier-price-brand-name">{label}</span>
              <span className="supplier-price-brand-state">
                {t('supplierPriceList.supplierColumn.filledCount', {
                  count: filled,
                })}
              </span>
              {saving ? (
                <span className="supplier-price-brand-state" aria-live="polite">
                  {t('supplierPriceList.supplierColumn.saving')}
                </span>
              ) : null}
            </span>
          </ColumnHeaderMenu>
        )
        return {
          key: `supplier:${supplierId}`,
          title,
          width: 148,
          align: 'right',
          render: (_: unknown, row: PriceMatrixRow) => {
            const cell = state.cells[supplierId]?.[row.key]
            const error = cellErrors[cellErrorKey(supplierId, row.key)]
            const index = pageIndexByRowKey.get(row.key)
            const rowLabel = describePriceRow(row)
            const cellFilled = isCellFilled(cell)
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
                    supplier: label,
                    row: rowLabel,
                  })}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={
                    error ? `price-error-${supplierId}-${row.uid}` : undefined
                  }
                  data-price-row-index={index}
                  data-supplier={supplierId}
                  value={cell?.price ?? null}
                  onChange={(value) => handleCellChange(supplierId, row, value)}
                  onBlur={() => handleCellBlur(supplierId, row)}
                  onKeyDown={(event) => handlePriceKeyDown(event, row)}
                  onPaste={(event) => {
                    const text = event.clipboardData.getData('text')
                    if (!/[\t\r\n]/.test(text)) {
                      return
                    }
                    event.preventDefault()
                    setPasteOpen(true)
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
                      id={`price-error-${supplierId}-${row.uid}`}
                    >
                      {error}
                    </span>
                  ) : cellFilled ? null : cell?.itemId ? (
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

    return [...base, ...supplierColumnDefs]
  }, [
    t,
    columnNames,
    state,
    savingColumns,
    cellErrors,
    pageIndexByRowKey,
    rowErrors,
    handleCellChange,
    handleCellBlur,
    handlePriceKeyDown,
    handleDeleteColumn,
  ])

  const loadError =
    catalogQuery.error ??
    listsQuery.error ??
    detailQueries.find((query) => query.error)?.error

  const columnFilledLabels = columnNames.map((supplierId) => ({
    supplierId,
    label: state.columns[supplierId]
      ? describePriceColumn(state.columns[supplierId])
      : `#${supplierId}`,
    filled: countFilledForColumn(state, supplierId),
  }))

  const adjustColumn = adjustSupplierId
    ? state.columns[adjustSupplierId]
    : undefined

  const columnOptions = useMemo(
    () =>
      supplierColumns
        .filter((option) => !state.columns[option.supplierId])
        .map((option) => ({
          value: option.supplierId,
          label: option.supplierName,
        })),
    [supplierColumns, state.columns],
  )

  return (
    <div className="supplier-price-list-editor">
      <div className="supplier-price-list-editor-actions">
        <span className="supplier-price-list-view-title">
          {t('supplierPriceList.view.brandLabel', { brand: brandName })}
        </span>
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
        {fillFilter !== 'ALL' && columnNames.length ? (
          <Select
            allowClear
            style={{ width: 170 }}
            aria-label={t('supplierPriceList.filter.fillSupplier')}
            placeholder={t('supplierPriceList.filter.fillSupplierAll')}
            value={fillSupplierId}
            onChange={(value) => {
              setFillSupplierId(value)
              resetPage()
            }}
            options={columnNames.map((supplierId) => ({
              value: supplierId,
              label: state.columns[supplierId]
                ? describePriceColumn(state.columns[supplierId])
                : `#${supplierId}`,
            }))}
          />
        ) : null}
        <Button
          icon={<PlusOutlined />}
          onClick={() => {
            setColumnDraft(undefined)
            setAddColumnOpen(true)
          }}
        >
          {t('supplierPriceList.supplierColumn.add')}
        </Button>
        <Button icon={<ImportOutlined />} onClick={() => setPasteOpen(true)}>
          {t('supplierPriceList.actions.paste')}
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
          {t('supplierPriceList.summary.total', { count: stats.totalRows })}
        </span>
        <span>
          {t('supplierPriceList.summary.columns', {
            count: stats.columnCount,
          })}
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

      {columnNames.length ? (
        <div className="supplier-price-list-editor-summary">
          {columnFilledLabels.map(({ supplierId, label, filled }) => (
            <span key={supplierId}>
              {t('supplierPriceList.summary.columnFilled', {
                supplier: label,
                count: filled,
              })}
            </span>
          ))}
        </div>
      ) : (
        <Alert
          type="info"
          showIcon
          title={t('supplierPriceList.supplierColumn.emptyHint')}
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

      {addColumnOpen ? (
        <Modal
          open
          title={t('supplierPriceList.supplierColumn.addTitle', {
            brand: brandName,
          })}
          okText={t('common.ok')}
          cancelText={t('common.cancel')}
          onOk={handleAddColumn}
          onCancel={() => setAddColumnOpen(false)}
          destroyOnHidden
        >
          <Space orientation="vertical" size={12} style={{ width: '100%' }}>
            <Select
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              style={{ width: '100%' }}
              aria-label={t('supplierPriceList.supplierColumn.selectLabel')}
              placeholder={t(
                'supplierPriceList.supplierColumn.selectPlaceholder',
              )}
              value={columnDraft}
              onChange={(value) => setColumnDraft(value)}
              options={columnOptions}
            />
            <Alert
              type="info"
              showIcon
              title={t('supplierPriceList.supplierColumn.addHint', {
                brand: brandName,
              })}
            />
          </Space>
        </Modal>
      ) : null}

      {pasteOpen ? (
        <SupplierPriceListPasteModal
          brandName={brandName}
          state={state}
          onCancel={() => setPasteOpen(false)}
          onApplyBlock={applyBlockPaste}
          onApply={(result) => {
            setState(result.state)
            setPasteOpen(false)
            message.success(
              t('supplierPriceList.paste.appliedToast', {
                count: result.appliedCount,
              }),
            )
          }}
        />
      ) : null}

      {adjustSupplierId ? (
        <SupplierPriceListAdjustModal
          state={state}
          supplierId={adjustSupplierId}
          supplierName={
            adjustColumn ? describePriceColumn(adjustColumn) : adjustSupplierId
          }
          brandName={brandName}
          saving={adjusting}
          onCancel={() => setAdjustSupplierId(null)}
          onSubmit={(mode, amount, preview) =>
            void runAdjust(adjustSupplierId, mode, amount, preview)
          }
        />
      ) : null}
    </div>
  )
}
