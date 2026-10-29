import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalculatorOutlined,
  ClearOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  MoreOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import {
  type UseQueryResult,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Flex,
  Input,
  InputNumber,
  Popover,
  Segmented,
  Select,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  basePriceRulesQueryKey,
  fetchSupplierBasePriceRules,
  type SupplierBasePriceRules,
} from '@/api/market/supplier-base-price-rules'
import {
  fetchSpecRows,
  fetchSupplierPriceGrid,
  removeSupplierPriceColumn,
  type SupplierPriceColumn,
  type SupplierPriceGrid,
} from '@/api/market/supplier-price-lists'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { useHasPermission } from '@/hooks/usePermission'
import { message, modal } from '@/utils/antd-app'
import { SupplierBasePriceRuleModal } from './SupplierBasePriceRuleModal'
import {
  type BrandDraft,
  brandColumnOrder,
  buildColumnSavePlan,
  type ColumnSavePlan,
  draftCount,
  draftPrice,
  mergeQuoteRows,
  quoteRowKey,
  type ServerCell,
  serverCellsOf,
  setDraftPrice,
} from './supplier-price-list-model'
import {
  countOverwrites,
  type DraftHistory,
  type DraftMap,
  diffSavePlans,
  draftMapDirty,
  EMPTY_HISTORY,
  parseDrafts,
  pushHistory,
  redoDrafts,
  serializeDrafts,
  undoDrafts,
} from './supplier-quote-edits'
import {
  applyBrandOrder,
  buildBasePriceColumnPrices,
  buildSlots,
  buildSpecPastePlan,
  columnLengths as columnLengthsOf,
  filterSpecRows,
  groupSpecRows,
  hasNoLength,
  parseBrandPrefs,
  parseClipboardGrid,
  placementLengthOf,
  reorderBrands,
  rowKeyOfCell,
  SHEET_COLUMN_WIDTH,
  type SpecRow,
  serializeBrandPrefs,
  sheetWidthOf,
  shiftBrand,
  specRowGroupSpans,
  specRowKey,
  toggleHidden,
} from './supplier-quote-grid'
import { persistColumnPlans } from './supplier-quote-save'
import {
  buildTransposedSections,
  specHeader,
  type TransposedRow,
} from './supplier-quote-transposed'
import './supplier-price.css'

/** 一个品牌列视图：是否已有价格表 + 该列服务端价格索引 + 原始网格。 */
type BrandColumnView = {
  brandName: string
  grid: SupplierPriceGrid | undefined
  column: SupplierPriceColumn | null
  cells: Map<string, ServerCell>
}

/** 品牌网格的查询键：与「从价格表带价」同源, 保存后统一失效。 */
const gridQueryKey = (brandName: string) =>
  ['supplier-price-grid', brandName] as const

/** 列显示偏好的本地存储键：按供应商隔离，换供应商各自记各自的顺序与隐藏列。 */
const brandPrefsKey = (supplierId: string) =>
  `aries:supplier-quote-prefs:${supplierId}`

/** 视图偏好：品牌成列（现状）/ 规格横置（品牌分块，规格作列头，贴近纸质报价单）。 */
type QuoteViewMode = 'brands' | 'specs'

/**
 * 价格录入方式。
 *
 * <ul>
 *   <li>{@code base} 基价模式：每个品牌只填「基价」一格，其余规格按「基价 + 加价」自动算好且只读；</li>
 *   <li>{@code manual} 手填模式：逐格录入，系统不会替你算任何价格。</li>
 * </ul>
 *
 * <p>两种方式互斥：手填模式下即使填了基价格子也不联动，否则业务员分不清哪个价是自己填的。</p>
 */
type PriceEntryMode = 'base' | 'manual'

const viewModeKey = (supplierId: string) =>
  `aries:supplier-quote-view:${supplierId}`

const readViewMode = (supplierId: string): QuoteViewMode =>
  window.localStorage.getItem(viewModeKey(supplierId)) === 'specs'
    ? 'specs'
    : 'brands'

const priceModeKey = (supplierId: string) =>
  `price-compare:supplier-price-mode:${supplierId}`

const readPriceMode = (supplierId: string): PriceEntryMode =>
  window.localStorage.getItem(priceModeKey(supplierId)) === 'base'
    ? 'base'
    : 'manual'

/** 未保存草稿的本地存储键：刷新/误关页后能恢复，避免一次报价白录。 */
const draftsKey = (supplierId: string) =>
  `aries:supplier-quote-drafts:${supplierId}`

/** 单元格标识：品牌 + 行键，用于键盘移动与粘贴定位（用不可见分隔符避免品牌名里的 `:`）。 */
const cellIdOf = (brandName: string, rowKey: string) =>
  `${brandName}\u0000${rowKey}`

/**
 * 供应商报价表（比价一手价）——**Excel 式报价网格**。
 *
 * <p>一张表：行 = 商品资料全量规格，列 = 该供应商的品牌（经营品牌 + 本次添加 + 已有价格表的
 * 历史品牌），格子里直接敲该品牌该规格的报价。支持：</p>
 * <ul>
 *   <li>↑/↓ 与回车在本列内上下移动，Tab 逐格向右（浏览器默认行为）；</li>
 *   <li>从 Excel 复制整列/整块报价，聚焦起始格后直接粘贴，按行优先铺开；</li>
 *   <li>一次保存所有有改动的品牌列（每列整组替换）。</li>
 * </ul>
 *
 * <p>存储仍是 `(supplier_id, brand_name)` 一条表头 + 规格条目；报单比价按 (品牌, 商品)
 * 取最低价的口径不受影响。</p>
 */
export function SupplierQuotePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const materialBrands = useMaterialBrands()

  const [supplierId, setSupplierId] = useState<string>()
  const [quotedOn, setQuotedOn] = useState(() => dayjs())
  /** 未保存的改动：品牌 → 该列的草稿（`null` = 明确清空）。 */
  const [drafts, setDrafts] = useState<Record<string, BrandDraft>>({})
  /** 本次手动添加、且不在「经营品牌」里的品牌（含用户输入的、商品资料里没有的品牌）。 */
  const [extraBrands, setExtraBrands] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  /** 列显示偏好：顺序 + 隐藏集合（按供应商存 localStorage，刷新后保持）。 */
  const [brandOrder, setBrandOrder] = useState<string[]>([])
  const [hiddenBrands, setHiddenBrands] = useState<string[]>([])
  /** 隐藏的定尺列（9米/12米…）：有的供应商只报其中一种定尺。 */
  const [hiddenLengths, setHiddenLengths] = useState<string[]>([])
  /** 行过滤：规格关键字 + 只看未填（按服务端价格判断，边录边消失会打断录入）。 */
  const [specKeyword, setSpecKeyword] = useState('')
  const [onlyUnpriced, setOnlyUnpriced] = useState(false)
  /** 草稿历史：撤销/重做（Ctrl+Z / Ctrl+Y）。 */
  const [history, setHistory] = useState<DraftHistory>(EMPTY_HISTORY)
  /** 本页是否从本地恢复过未保存草稿（提示用户确认或放弃）。 */
  const [restoredDrafts, setRestoredDrafts] = useState(false)
  /** 正在配置基价加价的品牌（null = 弹层关闭）。 */
  const [ruleBrand, setRuleBrand] = useState<string>()
  /** 视图方向：品牌成列（默认）/ 规格横置（按供应商记忆）。 */
  const [viewMode, setViewMode] = useState<QuoteViewMode>('brands')
  /** 价格录入方式（基价/手填），按供应商记在本地。 */
  const [priceMode, setPriceMode] = useState<PriceEntryMode>('manual')

  /** 资源级权限：读/写/删分开，只读用户不该看到可点的保存与移除。 */
  const canUpdate = useHasPermission('supplier-price-lists:update')
  const canCreate = useHasPermission('supplier-price-lists:create')
  const canDelete = useHasPermission('supplier-price-lists:delete')

  /** 网格容器与当前聚焦单元格：粘贴从「锚点格」开始铺。 */
  const gridRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<{ brandName: string; rowKey: string } | null>(null)

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
   * 网格结果经 `combine` 收敛成「稳定的数据数组」：不这么做 `useQueries` 每次 render 都返回新
   * 数组，放进 useMemo 依赖会让每敲一个字符都重算几千个单元格。
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

  /** 按用户列顺序排好的全部品牌（含被隐藏的：隐藏只是不渲染，保存仍要提交）。 */
  const orderedViews = useMemo(() => {
    const names = applyBrandOrder(
      views.map((view) => view.brandName),
      brandOrder,
    )
    return names
      .map((name) => viewByBrand.get(name))
      .filter((view): view is BrandColumnView => Boolean(view))
  }, [brandOrder, viewByBrand, views])

  const hiddenBrandSet = useMemo(() => new Set(hiddenBrands), [hiddenBrands])

  /** 实际渲染的品牌列 = 全部列 - 隐藏列。 */
  const displayViews = useMemo(
    () => orderedViews.filter((view) => !hiddenBrandSet.has(view.brandName)),
    [hiddenBrandSet, orderedViews],
  )

  const visibleBrands = useMemo(
    () => displayViews.map((view) => view.brandName),
    [displayViews],
  )

  /**
   * 显示用的规格行：把「一个定尺一行」合并成「一个规格一行」，定尺收进格子。
   *
   * <p>报价单的形态是「行 = 材质 + 规格、同一格里 9米/12米 两个价」，而不是一个定尺占一行。</p>
   */
  const specRows = useMemo<SpecRow[]>(() => groupSpecRows(rows), [rows])
  /** 真正要展示的定尺列（9米/12米…）：''/'-' 不是定尺，不占列。 */
  const columnLengths = useMemo(() => columnLengthsOf(rows), [rows])
  const hiddenLengthSet = useMemo(() => new Set(hiddenLengths), [hiddenLengths])
  /** 实际渲染的定尺列 = 全部定尺列 - 被隐藏的。 */
  const visibleLengths = useMemo(
    () => columnLengths.filter((length) => !hiddenLengthSet.has(length)),
    [columnLengths, hiddenLengthSet],
  )
  /** 粘贴格位 = 品牌 × 定尺，与界面 DOM 顺序一致。 */
  const slots = useMemo(
    () => buildSlots(visibleBrands, visibleLengths),
    [visibleBrands, visibleLengths],
  )

  /** 基价加价规则：按品牌读取（数量 = 品牌列数，很小，一次取回供录入时联动）。 */
  const rulesQueries = useQueries({
    queries: orderedViews.map((view) => ({
      queryKey: basePriceRulesQueryKey(supplierId, view.brandName),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        fetchSupplierBasePriceRules(supplierId ?? '', view.brandName, signal),
      enabled: Boolean(supplierId),
      // 后端未部署该接口时不要连续重试刷屏；一次即可，失败按「未配置规则」降级
      retry: 1,
      staleTime: 0,
    })),
  })

  const rulesByBrand = useMemo(() => {
    const map = new Map<string, SupplierBasePriceRules>()
    orderedViews.forEach((view, index) => {
      const data = rulesQueries[index]?.data
      if (data) map.set(view.brandName, data)
    })
    return map
  }, [orderedViews, rulesQueries])

  /** 表格里显示的规格行：规格搜索 + 「只看未填」（该规格所有定尺都没价才算未填）。 */
  const displayRows = useMemo(() => {
    const filtered = filterSpecRows(specRows, specKeyword)
    if (!onlyUnpriced) return filtered
    return filtered.filter((specRow) =>
      displayViews.every((view) =>
        specRow.lengths.every(
          (length) =>
            view.cells.get(rowKeyOfCell(specRow, length)) === undefined,
        ),
      ),
    )
  }, [displayViews, onlyUnpriced, specKeyword, specRows])

  // 列顺序/隐藏集合落本地：这是个人视图偏好，不写服务端（换人不该被别人改了列顺序）
  useEffect(() => {
    if (!supplierId) return
    window.localStorage.setItem(
      brandPrefsKey(supplierId),
      serializeBrandPrefs({
        order: brandOrder,
        hidden: hiddenBrands,
        hiddenLengths,
      }),
    )
  }, [brandOrder, hiddenBrands, hiddenLengths, supplierId])

  // 视图方向也是个人偏好：按供应商存本地，下次打开保持
  useEffect(() => {
    if (!supplierId) return
    window.localStorage.setItem(viewModeKey(supplierId), viewMode)
  }, [supplierId, viewMode])

  // 录入方式同样是个人偏好：按供应商存本地
  useEffect(() => {
    if (!supplierId) return
    window.localStorage.setItem(priceModeKey(supplierId), priceMode)
  }, [priceMode, supplierId])

  const totalDirty = views.reduce(
    (sum, view) => sum + draftCount(drafts[view.brandName]),
    0,
  )

  /**
   * 所有草稿改动都走这里：先快照当前草稿入历史栈，再写新草稿。
   * 这样撤销/重做对「逐格输入、粘贴、清空列、保存后清草稿」是一致的。
   */
  const applyDrafts = (next: DraftMap) => {
    setHistory((current) => pushHistory(current, drafts))
    setDrafts(next)
  }

  const updateCell = (
    brandName: string,
    rowKey: string,
    value: number | null,
  ) => {
    applyDrafts({
      ...drafts,
      [brandName]: setDraftPrice(drafts[brandName], rowKey, value),
    })
  }

  const dropDraft = (brandName: string) => {
    const next = { ...drafts }
    delete next[brandName]
    applyDrafts(next)
  }

  /**
   * 录入基价规格的价格后，把同品牌其它规格的空格子按「基价 + 加价」填上。
   *
   * <p>只填空格：已有价格（服务端或本次草稿）一律不动；基价格本身跳过；负价跳过。
   * 这是「基价加价」在录入侧的唯一出口。</p>
   */

  const undo = () => {
    const next = undoDrafts(history, drafts)
    setHistory(next.history)
    setDrafts(next.drafts)
  }

  const redo = () => {
    const next = redoDrafts(history, drafts)
    setHistory(next.history)
    setDrafts(next.drafts)
  }

  // 草稿落本地：刷新/误关页后可恢复；没有改动时清掉键，避免下次误提示
  useEffect(() => {
    if (!supplierId) return
    if (draftMapDirty(drafts)) {
      window.localStorage.setItem(
        draftsKey(supplierId),
        serializeDrafts(drafts),
      )
    } else {
      window.localStorage.removeItem(draftsKey(supplierId))
    }
  }, [drafts, supplierId])

  // 未保存时关标签页/刷新先拦一下（浏览器只允许提示，不能自定义文案）
  useEffect(() => {
    if (totalDirty === 0) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [totalDirty])

  const invalidateBrand = async (brandName: string) => {
    await queryClient.invalidateQueries({
      queryKey: gridQueryKey(brandName),
    })
  }

  /** 聚焦单元格：按 dataset 查找（不拼选择器，品牌名里的特殊字符不会破坏匹配）。 */
  const focusCell = (brandName: string, rowKey: string) => {
    const wanted = cellIdOf(brandName, rowKey)
    const inputs =
      gridRef.current?.querySelectorAll<HTMLInputElement>(
        'input[data-grid-cell]',
      ) ?? []
    for (const input of inputs) {
      if (input.dataset.gridCell === wanted) {
        input.focus()
        input.select()
        return true
      }
    }
    return false
  }

  /**
   * ↑/↓ 在**同一品牌同一定尺**的规格行之间移动（跳过没有该定尺的规格行）。
   * 越界返回 false，让浏览器处理（末行 Tab 可离开表格）。
   */
  const moveFocus = (
    brandName: string,
    length: string,
    rowKey: string,
    deltaRow: number,
  ) => {
    const rowIndex = displayRows.findIndex((row) => specRowKey(row) === rowKey)
    if (rowIndex < 0) return false
    for (
      let index = rowIndex + deltaRow;
      index >= 0 && index < displayRows.length;
      index += deltaRow
    ) {
      const target = displayRows[index]
      if (!target || !target.lengths.includes(length)) continue
      return focusCell(brandName, rowKeyOfCell(target, length))
    }
    return false
  }

  /**
   * 粘贴落草稿：多格先确认（误贴会覆盖整列），单格直接写。
   *
   * <p>两个视图（品牌成列 / 规格横置）共用这一个出口，避免确认文案与覆盖统计各写一份。</p>
   */
  const commitPaste = (
    cells: { brandName: string; rowKey: string; value: number | null }[],
    dropped: number,
  ) => {
    const applyPaste = () => {
      const next: DraftMap = { ...drafts }
      for (const cell of cells) {
        next[cell.brandName] = setDraftPrice(
          next[cell.brandName] ?? {},
          cell.rowKey,
          cell.value,
        )
      }
      applyDrafts(next)
      if (dropped > 0) {
        message.warning(
          t('priceCompare.supplierPrice.pasteDropped', { count: dropped }),
        )
      } else {
        message.success(
          t('priceCompare.supplierPrice.pasteApplied', { count: cells.length }),
        )
      }
    }

    if (cells.length > 1) {
      const overwrite = countOverwrites({
        cells,
        drafts,
        serverCellsOfBrand: (brand) =>
          viewByBrand.get(brand)?.cells ?? new Map(),
      })
      modal.confirm({
        title: t('priceCompare.supplierPrice.pasteConfirmTitle'),
        content: t('priceCompare.supplierPrice.pasteConfirmContent', {
          count: cells.length,
          overwrite,
        }),
        okText: t('priceCompare.supplierPrice.pasteConfirmOk'),
        cancelText: t('common.cancel'),
        onOk: applyPaste,
      })
      return
    }
    applyPaste()
  }

  /** 从 Excel 粘贴：以当前格为锚点按行优先铺开（空串 = 清空，非法值丢弃并提示）。 */
  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const anchor = anchorRef.current
    if (!anchor) return
    const text = event.clipboardData.getData('text/plain')
    if (!text) return
    const matrix = parseClipboardGrid(text)
    // 锚点行键 = 类别|材质|规格|定尺；拆出规格行与当前定尺，再定位到「品牌×定尺」格位
    const [category, material, spec, length] = anchor.rowKey.split('|')
    if (length === undefined) return
    const targetSpecKey = `${category}|${material}|${spec}`
    const startSlotIndex = slots.findIndex(
      (slot) => slot.brandName === anchor.brandName && slot.length === length,
    )
    const startRowIndex = displayRows.findIndex(
      (row) => specRowKey(row) === targetSpecKey,
    )
    if (!matrix.length || startSlotIndex < 0 || startRowIndex < 0) return

    const plan = buildSpecPastePlan({
      matrix,
      slots,
      specRows: displayRows,
      startSlotIndex,
      startRowIndex,
    })
    if (!plan.cells.length) return
    event.preventDefault()

    commitPaste(plan.cells, plan.dropped)
  }

  /**
   * 规格横置的数据：品牌分块 → 品类块（规格作列）→ 行 = 材质 + 定尺。
   *
   * <p>与品牌成列视图共用同一批 `rows` 与草稿键，只是转置了渲染方向；规格搜索/只看未填
   * 在这里直接过滤 QuoteRow，保证两个视图的语义一致。</p>
   */
  const transposedSections = useMemo(() => {
    const keyword = specKeyword.trim().toLowerCase()
    let list = rows
    if (keyword) {
      list = list.filter((row) =>
        `${row.category} ${row.material} Φ${row.spec} ${row.length}`
          .toLowerCase()
          .includes(keyword),
      )
    }
    if (onlyUnpriced) {
      list = list.filter((row) =>
        displayViews.every(
          (view) => view.cells.get(quoteRowKey(row)) === undefined,
        ),
      )
    }
    return buildTransposedSections(list, visibleBrands)
  }, [displayViews, onlyUnpriced, rows, specKeyword, visibleBrands])

  /** 规格横置下粘贴：以锚点格为左上角，向下按「材质 + 定尺」、向右按规格铺开。 */
  const handleTransposedPaste = (
    event: React.ClipboardEvent<HTMLDivElement>,
  ) => {
    const anchor = anchorRef.current
    if (!anchor) return
    const text = event.clipboardData.getData('text/plain')
    if (!text) return
    const matrix = parseClipboardGrid(text)
    if (!matrix.length) return
    const [category, material, specText, length] = anchor.rowKey.split('|')
    const spec = Number(specText)
    const block = transposedSections
      .find((section) => section.brandName === anchor.brandName)
      ?.blocks.find((item) => item.category === category)
    if (!block) return
    const startRow = block.rows.findIndex(
      (item) => item.material === material && item.length === length,
    )
    const startSpec = block.specs.indexOf(spec)
    if (startRow < 0 || startSpec < 0) return
    event.preventDefault()

    const cells: { brandName: string; rowKey: string; value: number | null }[] =
      []
    let dropped = 0
    matrix.forEach((values, rowOffset) => {
      values.forEach((raw, specOffset) => {
        const targetRow = block.rows[startRow + rowOffset]
        const targetSpec = block.specs[startSpec + specOffset]
        if (!targetRow || targetSpec === undefined) return
        const rowKey = targetRow.cells[targetSpec]
        if (!rowKey) {
          dropped += 1
          return
        }
        const trimmed = raw.trim()
        if (trimmed === '') {
          cells.push({ brandName: anchor.brandName, rowKey, value: null })
          return
        }
        const value = Number(trimmed.replace(/[,¥\s]/g, ''))
        if (!Number.isFinite(value)) {
          dropped += 1
          return
        }
        cells.push({ brandName: anchor.brandName, rowKey, value })
      })
    })
    if (!cells.length) return
    commitPaste(cells, dropped)
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

  const saveAll = () => {
    if (!supplierId) return
    const plans = buildPlans()
    if (!plans.length) {
      message.info(t('priceCompare.supplierPrice.saveNothing'))
      return
    }

    const runSave = async () => {
      setSaving(true)
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
      setRestoredDrafts(false)
      message.success(
        t('priceCompare.supplierPrice.savedBrands', { count: result.saved }),
      )
    }

    /*
     * 保存前先给差异，再落库：报价是给采购/报单用的，一次「全部保存」若默默改了几十条，
     * 事后只能靠审计才发现。这里用「新增/改价/取消」三个数让用户确认。
     */
    const diff = diffSavePlans(
      plans,
      (brandName) => viewByBrand.get(brandName)?.cells ?? new Map(),
    )
    if (diff.added + diff.changed + diff.removed === 0) {
      message.info(t('priceCompare.supplierPrice.saveNothing'))
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.saveDiffTitle'),
      content: t('priceCompare.supplierPrice.saveDiffContent', diff),
      okText: t('common.save'),
      cancelText: t('common.cancel'),
      onOk: runSave,
    })
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
      const prefs = parseBrandPrefs(
        window.localStorage.getItem(brandPrefsKey(nextSupplierId)),
      )
      const restored = parseDrafts(
        window.localStorage.getItem(draftsKey(nextSupplierId)),
      )
      setSupplierId(nextSupplierId)
      setExtraBrands([])
      setDrafts(restored)
      setHistory(EMPTY_HISTORY)
      setRestoredDrafts(draftMapDirty(restored))
      setBrandOrder(prefs.order)
      setHiddenBrands(prefs.hidden)
      setHiddenLengths(prefs.hiddenLengths)
      setSpecKeyword('')
      setOnlyUnpriced(false)
      setViewMode(readViewMode(nextSupplierId))
      setPriceMode(readPriceMode(nextSupplierId))
      anchorRef.current = null
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

  /**
   * 品牌多选的唯一改动入口：勾选即建列、取消即隐藏列（数据不动，可再勾回来）。
   *
   * <p>选择列表默认来自**供应商资料里的经营品牌**；同时保留两类来源以免历史数据「看不见」：
   * 已有价格表但没维护进经营品牌的、以及用户手动输入的新品牌。</p>
   */
  const changeBrandSelection = (next: readonly string[]) => {
    /*
     * 「本次添加」= 勾中的、且不在供应商资料经营品牌里的品牌。
     * 候选品牌全集里出现（例如商品资料里有这个品牌）并不等于要显示 —— 显示与否由勾选决定;
     * 否则勾选一个资料外的品牌会因为它只是"候选"而什么都不发生（实测踩过）。
     */
    const declared = new Set(declaredBrands)
    const added = next.filter(
      (brand) => !declared.has(brand) && !extraBrands.includes(brand),
    )
    if (added.length) setExtraBrands((current) => [...current, ...added])
    const all = [...new Set([...candidateBrands, ...next])]
    setHiddenBrands(all.filter((brand) => !next.includes(brand)))
  }

  /** 当前列顺序（含隐藏列），拖拽/左移右移都基于它重排。 */
  const currentOrderNames = () => orderedViews.map((view) => view.brandName)

  const handleDropBrand = (fromBrand: string, toBrand: string) => {
    if (fromBrand === toBrand) return
    const base = currentOrderNames()
    setBrandOrder(
      reorderBrands(base, base.indexOf(fromBrand), base.indexOf(toBrand)),
    )
  }

  /** 左移/右移：拖动排序的非拖动替代（WCAG 2.2 SC 2.5.7）。 */
  const shiftColumn = (brandName: string, delta: number) => {
    setBrandOrder(shiftBrand(currentOrderNames(), brandName, delta))
  }

  const hideColumn = (brandName: string) => {
    setHiddenBrands((current) => toggleHidden(current, brandName))
  }

  /**
   * 隐藏/显示某个定尺列（有些供应商只报 9米 或只报 12米）。
   *
   * <p>不允许把定尺列全部藏掉：那样整张表就没有可填价格的格子了。最后一个可见定尺保持显示。</p>
   */
  const toggleLengthColumn = (length: string) => {
    if (visibleLengths.length <= 1 && visibleLengths.includes(length)) return
    setHiddenLengths((current) => toggleHidden(current, length))
  }

  /** 清空本列：把该列已填价格全部标记为「清空」，保存后整组替换才真正落库。 */
  const clearColumn = (brandName: string) => {
    const view = viewByBrand.get(brandName)
    if (!view) return
    modal.confirm({
      title: t('priceCompare.supplierPrice.clearColumnTitle', {
        name: brandName,
      }),
      content: t('priceCompare.supplierPrice.clearColumnContent'),
      okText: t('priceCompare.supplierPrice.clearColumnOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: () => {
        setDrafts((current) => {
          const next = { ...current }
          const cleared: BrandDraft = { ...(next[brandName] ?? {}) }
          for (const rowKey of view.cells.keys()) cleared[rowKey] = null
          next[brandName] = cleared
          return next
        })
      },
    })
  }

  const brandMenuItems = (
    brandName: string,
  ): NonNullable<MenuProps['items']> => {
    const base = currentOrderNames()
    const index = base.indexOf(brandName)
    const column = viewByBrand.get(brandName)?.column ?? null
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'left',
        icon: <ArrowLeftOutlined />,
        label: t('priceCompare.supplierPrice.moveLeft'),
        disabled: index <= 0,
      },
      {
        key: 'right',
        icon: <ArrowRightOutlined />,
        label: t('priceCompare.supplierPrice.moveRight'),
        disabled: index < 0 || index >= base.length - 1,
      },
      { type: 'divider' },
      {
        key: 'rules',
        icon: <CalculatorOutlined />,
        label: t('priceCompare.supplierPrice.basePriceRuleMenu'),
        disabled: !canUpdate,
      },
      {
        key: 'hide',
        icon: <EyeInvisibleOutlined />,
        label: t('priceCompare.supplierPrice.hideColumn'),
      },
      {
        key: 'clear',
        icon: <ClearOutlined />,
        label: t('priceCompare.supplierPrice.clearColumn'),
        disabled: !canUpdate,
      },
    ]
    if (column && canDelete) {
      items.push(
        { type: 'divider' },
        {
          key: 'remove',
          danger: true,
          label: t('priceCompare.supplierPrice.removeColumn'),
        },
      )
    }
    return items
  }

  const onBrandMenuClick = (brandName: string, key: string) => {
    if (key === 'rules') {
      setRuleBrand(brandName)
      return
    }
    if (key === 'left') return shiftColumn(brandName, -1)
    if (key === 'right') return shiftColumn(brandName, 1)
    if (key === 'hide') return hideColumn(brandName)
    if (key === 'clear') return clearColumn(brandName)
    if (key === 'remove') return removeBrand(brandName)
  }

  /**
   * 品牌选择器的候选项，分三组:
   * ① 供应商资料里的经营品牌（默认来源）；
   * ② 已有价格表、但没维护进供应商资料的品牌（否则历史报价在页面上不可见）；
   * ③ 其余商品品牌（补充）。
   */
  const brandPickerOptions = useMemo(() => {
    const declared = new Set(declaredBrands)
    const withColumn = orderedViews
      .filter((view) => view.column !== null && !declared.has(view.brandName))
      .map((view) => view.brandName)
    const withColumnSet = new Set(withColumn)
    const rest = candidateBrands.filter(
      (brand) => !declared.has(brand) && !withColumnSet.has(brand),
    )
    const group = (label: string, brands: readonly string[]) =>
      brands.length === 0
        ? []
        : [
            {
              label,
              options: brands.map((brand) => ({ value: brand, label: brand })),
            },
          ]
    return [
      ...group(
        t('priceCompare.supplierPrice.brandGroupDeclared'),
        declaredBrands,
      ),
      ...group(t('priceCompare.supplierPrice.brandGroupQuoted'), withColumn),
      ...group(t('priceCompare.supplierPrice.brandGroupOther'), rest),
    ]
  }, [candidateBrands, declaredBrands, orderedViews, t])

  const supplierOptions = (suppliersQuery.data ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))

  /** 固定总宽：列宽之和。表格不随容器拉伸，窄屏时横向滚动（Excel 的观感）。 */
  const sheetWidth = sheetWidthOf(
    displayViews.length,
    Math.max(visibleLengths.length, 1),
  )

  /** Ctrl+Z / Ctrl+Y 撤销重做：两个视图共用。 */
  const guardUndoRedo = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey)) return
    const key = event.key.toLowerCase()
    if (key === 'z') {
      event.preventDefault()
      undo()
    } else if (key === 'y') {
      event.preventDefault()
      redo()
    }
  }

  /** 分组合并跨度：按当前可见行算，过滤（搜索/只看未填）后仍按新的连续段合并。 */
  const groupSpans = useMemo(
    () => specRowGroupSpans(displayRows),
    [displayRows],
  )

  /**
   * 基价模式：每个品牌「基价那一格 + 其余规格由基价算出」。
   *
   * <p>没有配置基价加价的品牌不进入这里 —— 它们在手填语义下仍可编辑，不会被锁死。</p>
   */
  const baseColumns = useMemo(() => {
    const map = new Map<
      string,
      { baseCellKey: string; basePrice?: number; prices: Map<string, number> }
    >()
    if (priceMode !== 'base') return map
    for (const view of orderedViews) {
      const rules = rulesByBrand.get(view.brandName)
      const base = rules?.base
      if (!base) continue
      const baseRow = specRows.find(
        (row) =>
          row.material === base.material &&
          row.spec === base.spec &&
          row.lengths.includes(base.length),
      )
      if (!baseRow) continue
      const baseCellKey = rowKeyOfCell(baseRow, base.length)
      const basePrice = draftPrice(
        drafts[view.brandName],
        baseCellKey,
        view.cells.get(baseCellKey)?.price,
      )
      const prices =
        basePrice !== null && basePrice > 0
          ? buildBasePriceColumnPrices({
              base,
              basePrice,
              items: rules.items,
              specRows,
            })
          : new Map<string, number>()
      map.set(view.brandName, {
        baseCellKey,
        basePrice: basePrice ?? undefined,
        prices,
      })
    }
    return map
  }, [drafts, orderedViews, priceMode, rulesByBrand, specRows])

  /**
   * 基价模式里改「基价」一格：把它自己和整列的「基价 + 加价」一起写进草稿。
   * 这样保存时提交的是完整一列，而不是只改了一格。
   */
  const applyBasePrice = (
    brandName: string,
    baseCellKey: string,
    price: number | null,
  ) => {
    const rules = rulesByBrand.get(brandName)
    const next: DraftMap = {
      ...drafts,
      [brandName]: { ...(drafts[brandName] ?? {}) },
    }
    next[brandName][baseCellKey] = price
    if (rules?.base && price !== null && price > 0) {
      const prices = buildBasePriceColumnPrices({
        base: rules.base,
        basePrice: price,
        items: rules.items,
        specRows,
      })
      for (const [rowKey, value] of prices) next[brandName][rowKey] = value
    }
    applyDrafts(next)
  }

  /**
   * 品牌列里「某个定尺」的一格。
   *
   * <p>报价单原先是一格里塞 9米/12米 两行输入；现在每个定尺各占一列，
   * 所以行里没有该定尺时这一格显示「—」而不是硬塞一个可编辑框（否则会写出不存在的规格组合）。</p>
   */
  const renderLengthCell = (
    view: BrandColumnView,
    row: SpecRow,
    length: string,
    merged = false,
  ) => {
    /*
     * 无定尺行（盘螺一类）的价格只有一个格：它横跨所有定尺列，落格定尺用自己的占位值（''/'-'）。
     * 这样既不会多出一个「不分定尺」列，也不会把盘螺价格写到 9米 的键上。
     */
    const noLength = hasNoLength(row)
    if (noLength && merged) return null
    if (!noLength && !row.lengths.includes(length)) {
      return (
        <span
          className="supplier-price-cell-na"
          aria-hidden="true"
          title={t('priceCompare.supplierPrice.notApplicable')}
        >
          —
        </span>
      )
    }
    const brandName = view.brandName
    const effectiveLength = noLength ? placementLengthOf(row) : length
    const cellKey = rowKeyOfCell(row, effectiveLength)
    const serverPrice = view.cells.get(cellKey)?.price
    const baseColumn = baseColumns.get(brandName)
    const isBaseCell = baseColumn?.baseCellKey === cellKey
    const computed = baseColumn?.prices.get(cellKey)
    // 基价模式：除基价格子外的已配置规格一律显示算出来的价，且只读
    const baseComputed = priceMode === 'base' && isBaseCell !== true
    const value =
      baseComputed && computed !== undefined
        ? computed
        : draftPrice(drafts[brandName], cellKey, serverPrice)
    const brandBase = rulesByBrand.get(brandName)?.base
    const isBase =
      Boolean(brandBase) &&
      `${brandBase?.material}|${brandBase?.spec}|${brandBase?.length}` ===
        `${row.material}|${row.spec}|${length}`
    const label = `${brandName} ${row.material} ${row.spec} ${effectiveLength}`
    return (
      <Flex
        align="center"
        className={`supplier-price-cell-wrap${
          isBase ? ' supplier-price-base-cell' : ''
        }${baseComputed && computed !== undefined ? ' supplier-price-computed-cell' : ''}`}
        gap={2}
        title={
          isBase
            ? t('priceCompare.supplierPrice.baseBadge')
            : baseComputed && computed !== undefined
              ? t('priceCompare.supplierPrice.computedFromBase', {
                  price: baseColumn?.basePrice ?? '',
                })
              : undefined
        }
      >
        {/* 基价只靠左色条会读屏不可知，这里补一句隐藏文案 */}
        {isBase ? (
          <span className="aries-sr-only">
            {t('priceCompare.supplierPrice.baseBadge')}
          </span>
        ) : null}
        <InputNumber
          aria-label={label}
          className="supplier-price-sheet-input"
          controls={false}
          data-grid-cell={cellIdOf(brandName, cellKey)}
          disabled={!canUpdate || (baseComputed && computed !== undefined)}
          min={0}
          precision={2}
          size="small"
          style={{ width: '100%' }}
          value={value}
          onChange={(next) => {
            const parsed = typeof next === 'number' ? next : null
            // 基价模式下改基价格子 = 按「基价 + 加价」重算整列；手填模式只改这一格
            if (priceMode === 'base' && isBaseCell) {
              applyBasePrice(brandName, cellKey, parsed)
              return
            }
            updateCell(brandName, cellKey, parsed)
          }}
          onFocus={() => {
            anchorRef.current = { brandName, rowKey: cellKey }
          }}
          onKeyDown={(event) => {
            /*
             * 移动成功时必须 stopPropagation：keydown 还会冒泡到 InputNumber 外层容器，
             * 内部处理会把 ↑/↓ 当成「步进」把价格 +1/-1（实测 3300 → 3301）。
             */
            const move = (deltaRow: number) => {
              if (
                !moveFocus(
                  brandName,
                  effectiveLength,
                  specRowKey(row),
                  deltaRow,
                )
              ) {
                return
              }
              event.preventDefault()
              event.stopPropagation()
            }
            if (event.key === 'ArrowDown' || event.key === 'Enter') {
              move(1)
              return
            }
            if (event.key === 'ArrowUp') {
              move(-1)
              return
            }
            if (event.key === 'Escape') {
              event.currentTarget.blur()
            }
          }}
        />
      </Flex>
    )
  }

  const sheetColumns: ColumnsType<SpecRow> = [
    {
      title: t('priceCompare.supplierPrice.rowIndex'),
      key: 'rowIndex',
      width: SHEET_COLUMN_WIDTH.index,
      align: 'center',
      fixed: 'left',
      render: (_value, _row, index) => (
        <span className="supplier-price-row-index">{index + 1}</span>
      ),
    },
    {
      /*
       * 类别/材质按「连续同类」合并成一个格：盘螺整块一组，螺纹再按材质分 HRB400 / HRB400E 两组，
       * 组与组之间画一条更粗的分隔线（行序由 groupSpecRows 负责）。
       */
      title: t('priceCompare.supplierPrice.category'),
      dataIndex: 'category',
      width: SHEET_COLUMN_WIDTH.category,
      align: 'center',
      fixed: 'left',
      onCell: (row) => {
        const span = groupSpans.get(specRowKey(row))
        return {
          rowSpan: span?.categorySpan ?? 1,
          className: span?.groupStart
            ? 'supplier-price-group-start'
            : undefined,
        }
      },
    },
    {
      title: t('priceCompare.supplierPrice.material'),
      dataIndex: 'material',
      width: SHEET_COLUMN_WIDTH.material,
      align: 'center',
      fixed: 'left',
      onCell: (row) => {
        const span = groupSpans.get(specRowKey(row))
        return {
          rowSpan: span?.materialSpan ?? 1,
          className: span?.groupStart
            ? 'supplier-price-group-start'
            : undefined,
        }
      },
    },
    {
      title: t('priceCompare.supplierPrice.specNo'),
      key: 'spec',
      width: SHEET_COLUMN_WIDTH.specNo,
      align: 'center',
      fixed: 'left',
      render: (_value, row) => row.spec,
    },
    ...displayViews.map<ColumnsType<SpecRow>[number]>((view) => {
      const brandName = view.brandName
      const column = view.column
      const dirty = draftCount(drafts[brandName])
      const title = (
        <Flex align="center" gap={0} key={brandName} vertical>
          <Flex align="center" gap={2} justify="center">
            <Tooltip title={t('priceCompare.supplierPrice.dragColumn')}>
              <span
                className="supplier-price-brand-handle"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = 'move'
                  event.dataTransfer.setData('text/plain', brandName)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  handleDropBrand(
                    event.dataTransfer.getData('text/plain'),
                    brandName,
                  )
                }}
              >
                {brandName}
              </span>
            </Tooltip>
            {dirty > 0 ? <Tag color="orange">{dirty}</Tag> : null}
            {priceMode === 'base' && !rulesByBrand.get(brandName)?.base ? (
              <Tooltip
                title={t('priceCompare.supplierPrice.baseNotConfiguredHint')}
              >
                <Tag color="warning">
                  {t('priceCompare.supplierPrice.baseNotConfigured')}
                </Tag>
              </Tooltip>
            ) : null}
            <Dropdown
              menu={{
                items: brandMenuItems(brandName),
                onClick: ({ key }) => onBrandMenuClick(brandName, key),
              }}
              trigger={['click']}
            >
              <Button
                aria-label={t('priceCompare.supplierPrice.columnActionsA11y', {
                  name: brandName,
                })}
                icon={<MoreOutlined />}
                size="small"
                type="text"
              />
            </Dropdown>
          </Flex>
          <Typography.Text
            className="supplier-price-brand-meta"
            type="secondary"
            style={{ fontSize: 12 }}
          >
            {column?.quotedOn
              ? t('priceCompare.supplierPrice.columnQuotedOn', {
                  date: column.quotedOn,
                })
              : t('priceCompare.supplierPrice.newColumn')}
          </Typography.Text>
        </Flex>
      )
      /*
       * 定尺列：每个真实定尺（9米/12米…）各一列；没有定尺的行（盘螺）价格横跨这些列，
       * 因此不会出现「不分定尺」这种不存在的列。
       */
      if (visibleLengths.length === 0) {
        return {
          title,
          key: brandName,
          width: SHEET_COLUMN_WIDTH.lengthCell,
          align: 'right' as const,
          render: (_value: unknown, row: SpecRow) =>
            renderLengthCell(view, row, placementLengthOf(row)),
        }
      }
      if (columnLengths.length === 1) {
        const onlyLength = columnLengths[0]
        return {
          title,
          key: brandName,
          width: SHEET_COLUMN_WIDTH.lengthCell,
          align: 'right' as const,
          render: (_value: unknown, row: SpecRow) =>
            renderLengthCell(view, row, onlyLength),
        }
      }
      const spanCount = visibleLengths.length
      return {
        title,
        key: brandName,
        children: visibleLengths.map((length, index) => ({
          title: length,
          key: `${brandName}|${length}`,
          width: SHEET_COLUMN_WIDTH.lengthCell,
          align: 'right' as const,
          onCell: (row: SpecRow) => {
            // 无定尺行把整段定尺列合并成一格
            if (!hasNoLength(row)) return {}
            return index === 0 ? { colSpan: spanCount } : { colSpan: 0 }
          },
          render: (_value: unknown, row: SpecRow) =>
            renderLengthCell(view, row, length, index > 0),
        })),
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
          aria-label={t('priceCompare.supplierPrice.undo')}
          disabled={history.past.length === 0}
          icon={<UndoOutlined />}
          title={t('priceCompare.supplierPrice.undo')}
          onClick={undo}
        />
        <Button
          aria-label={t('priceCompare.supplierPrice.redo')}
          disabled={history.future.length === 0}
          icon={<RedoOutlined />}
          title={t('priceCompare.supplierPrice.redo')}
          onClick={redo}
        />
        <Tooltip
          title={
            canUpdate ? undefined : t('priceCompare.supplierPrice.readOnlyHint')
          }
        >
          <Button
            disabled={!canUpdate || totalDirty === 0}
            icon={<SaveOutlined />}
            loading={saving}
            type="primary"
            onClick={() => void saveAll()}
          >
            {t('priceCompare.supplierPrice.saveAll', { count: totalDirty })}
          </Button>
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
        {/*
          选择品牌：勾选即建列、取消即隐藏列（不会删数据）。
          候选项默认来自「供应商资料 → 经营品牌」；同时列出已有价格表但未维护进资料的品牌,
          避免历史报价在页面上消失; 也允许直接输入资料里没有的品牌。
        */}
        <Flex align="center" gap={8} style={{ marginInlineStart: 'auto' }} wrap>
          <Typography.Text type="secondary">
            {t('priceCompare.supplierPrice.pickBrands')}
          </Typography.Text>
          <Tooltip title={t('priceCompare.supplierPrice.pickBrandsHint')}>
            <Select
              aria-label={t('priceCompare.supplierPrice.pickBrands')}
              className="supplier-price-brand-picker"
              disabled={!canCreate && extraBrands.length === 0}
              maxTagCount="responsive"
              mode="tags"
              options={brandPickerOptions}
              placeholder={t(
                'priceCompare.supplierPrice.pickBrandsPlaceholder',
              )}
              style={{ minWidth: 300, maxWidth: 460 }}
              tokenSeparators={[',', '，', ' ']}
              value={visibleBrands}
              onChange={(next) => changeBrandSelection(next)}
            />
          </Tooltip>
        </Flex>
      </Flex>

      {/* 行/列操作：规格搜索、只看未填、列显示（隐藏列不影响已填价格） */}
      <Flex align="center" gap={8} wrap>
        <Input
          allowClear
          aria-label={t('priceCompare.supplierPrice.searchSpecs')}
          placeholder={t('priceCompare.supplierPrice.searchSpecs')}
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          value={specKeyword}
          onChange={(event) => setSpecKeyword(event.target.value)}
        />
        <Checkbox
          checked={onlyUnpriced}
          onChange={(event) => setOnlyUnpriced(event.target.checked)}
        >
          {t('priceCompare.supplierPrice.onlyUnpriced')}
        </Checkbox>
        <Segmented<QuoteViewMode>
          options={[
            {
              label: t('priceCompare.supplierPrice.viewModeBrands'),
              value: 'brands',
            },
            {
              label: t('priceCompare.supplierPrice.viewModeSpecs'),
              value: 'specs',
            },
          ]}
          value={viewMode}
          onChange={(next) => setViewMode(next)}
        />
        {/*
          价格录入方式：基价模式只填基价、其余自动算；手填模式逐格录。
          做成显式切换而不是"自动判断"，因为这是两种业务习惯，同一批人也会按供应商切换。
        */}
        <Segmented<PriceEntryMode>
          aria-label={t('priceCompare.supplierPrice.priceMode')}
          options={[
            {
              label: t('priceCompare.supplierPrice.priceModeManual'),
              value: 'manual',
            },
            {
              label: t('priceCompare.supplierPrice.priceModeBase'),
              value: 'base',
            },
          ]}
          value={priceMode}
          onChange={(next) => setPriceMode(next)}
        />
        <Popover
          content={
            <Flex className="supplier-price-column-panel" vertical gap={2}>
              {orderedViews.length === 0 ? (
                <Typography.Text type="secondary">
                  {t('priceCompare.supplierPrice.noBrands')}
                </Typography.Text>
              ) : (
                orderedViews.map((view) => (
                  <Checkbox
                    checked={!hiddenBrandSet.has(view.brandName)}
                    key={view.brandName}
                    onChange={() => hideColumn(view.brandName)}
                  >
                    {view.brandName}
                  </Checkbox>
                ))
              )}
              {columnLengths.length > 1 ? (
                <>
                  <Typography.Text
                    className="supplier-price-column-panel-label"
                    type="secondary"
                  >
                    {t('priceCompare.supplierPrice.lengthColumns')}
                  </Typography.Text>
                  {columnLengths.map((length) => (
                    <Checkbox
                      checked={!hiddenLengthSet.has(length)}
                      key={length}
                      onChange={() => toggleLengthColumn(length)}
                    >
                      {length}
                    </Checkbox>
                  ))}
                </>
              ) : null}
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {t('priceCompare.supplierPrice.columnPanelHint')}
              </Typography.Text>
            </Flex>
          }
          placement="bottomLeft"
          title={t('priceCompare.supplierPrice.columns')}
          trigger="click"
        >
          <Button icon={<EyeOutlined />}>
            {t('priceCompare.supplierPrice.columns')}
            {hiddenBrands.length > 0 ? ` (${hiddenBrands.length})` : ''}
          </Button>
        </Popover>
      </Flex>

      <Typography.Text type="secondary">
        {priceMode === 'base'
          ? t('priceCompare.supplierPrice.priceModeBaseHint')
          : viewMode === 'specs'
            ? t('priceCompare.supplierPrice.entryHintSpecs')
            : t('priceCompare.supplierPrice.priceModeManualHint')}
      </Typography.Text>

      {!canUpdate ? (
        <Alert
          showIcon
          title={t('priceCompare.supplierPrice.readOnlyHint')}
          type="info"
        />
      ) : null}

      {restoredDrafts ? (
        <Alert
          action={
            <Button
              size="small"
              onClick={() => {
                setDrafts({})
                setHistory(EMPTY_HISTORY)
                setRestoredDrafts(false)
              }}
            >
              {t('priceCompare.supplierPrice.discardDrafts')}
            </Button>
          }
          showIcon
          title={t('priceCompare.supplierPrice.draftsRestored')}
          type="warning"
        />
      ) : null}

      {/*
        规格行来自商品资料：拉取失败时表格会是空的，若不提示就会被误读成「这个品牌还没报价」，
        所以把失败原因显式放到页面上，并提供重试。
      */}
      {specsQuery.isError ? (
        <Alert
          action={
            <Button size="small" onClick={() => void specsQuery.refetch()}>
              {t('priceCompare.supplierPrice.retry')}
            </Button>
          }
          showIcon
          title={t('priceCompare.supplierPrice.specsLoadFailed')}
          type="error"
        />
      ) : null}

      {!supplierId ? (
        <Empty description={t('priceCompare.supplierPrice.pickSupplier')} />
      ) : orderedViews.length === 0 ? (
        /*
         * 该供应商没有经营品牌、也没有有效价格表时，表格的列只有「序号/类别/规格」，
         * 根本无处输价。此时不渲染空表格，直接把「先去加一个品牌」放在页面上，
         * 避免用户对着 82 行规格找不到入口。
         */
        <Alert
          showIcon
          title={t('priceCompare.supplierPrice.noBrands')}
          type="info"
        />
      ) : displayViews.length === 0 ? (
        <Alert
          showIcon
          title={t('priceCompare.supplierPrice.allColumnsHidden')}
          type="warning"
        />
      ) : viewMode === 'specs' ? (
        <Spin spinning={saving || specsQuery.isPending || gridsLoading}>
          {/*
            规格横置：行 = 材质 + 定尺、列 = 规格（Φ），品牌分块；每个品类单独一块，
            因为不同品类的规格集合不同（螺纹钢 Φ12–Φ32、盘螺 Φ6–Φ12）。
          */}
          <div
            className="supplier-price-transposed"
            onKeyDownCapture={guardUndoRedo}
            onPaste={handleTransposedPaste}
            ref={gridRef}
          >
            {transposedSections.length === 0 ? (
              <Empty description={t('priceCompare.supplierPrice.empty')} />
            ) : (
              transposedSections.map((section) => {
                const view = viewByBrand.get(section.brandName)
                const dirty = draftCount(drafts[section.brandName])
                return (
                  <section
                    className="supplier-price-transposed-brand"
                    key={section.brandName}
                  >
                    <Flex
                      align="center"
                      className="supplier-price-transposed-head"
                      gap={8}
                      wrap
                    >
                      <Typography.Text strong>
                        {section.brandName}
                      </Typography.Text>
                      <Typography.Text
                        className="supplier-price-brand-meta"
                        type="secondary"
                      >
                        {view?.column?.quotedOn
                          ? t('priceCompare.supplierPrice.columnQuotedOn', {
                              date: view.column.quotedOn,
                            })
                          : t('priceCompare.supplierPrice.newColumn')}
                      </Typography.Text>
                      {dirty > 0 ? <Tag color="orange">{dirty}</Tag> : null}
                      <Dropdown
                        menu={{
                          items: brandMenuItems(section.brandName),
                          onClick: ({ key }) =>
                            onBrandMenuClick(section.brandName, key),
                        }}
                        trigger={['click']}
                      >
                        <Button
                          aria-label={t(
                            'priceCompare.supplierPrice.columnActionsA11y',
                            { name: section.brandName },
                          )}
                          icon={<MoreOutlined />}
                          size="small"
                          type="text"
                        />
                      </Dropdown>
                    </Flex>

                    {section.blocks.map((block) => (
                      <div
                        className="supplier-price-transposed-block"
                        key={block.category}
                        style={{
                          // 规格少的品类（如盘螺 3 列）不要被拉满整行
                          maxWidth: 132 + block.specs.length * 96,
                        }}
                      >
                        <Typography.Text className="supplier-price-transposed-category">
                          {block.category}
                        </Typography.Text>
                        <Table<TransposedRow>
                          bordered
                          columns={[
                            {
                              title: t(
                                'priceCompare.supplierPrice.materialLength',
                              ),
                              key: 'label',
                              width: 132,
                              fixed: 'left',
                              render: (_value, row) => (
                                <Flex vertical gap={0}>
                                  <Typography.Text>
                                    {row.material}
                                  </Typography.Text>
                                  <Typography.Text type="secondary">
                                    {row.length === '' ? '—' : row.length}
                                  </Typography.Text>
                                </Flex>
                              ),
                            },
                            ...block.specs.map((spec) => ({
                              title: specHeader(spec),
                              key: `spec-${spec}`,
                              width: 96,
                              align: 'right' as const,
                              render: (_value: unknown, row: TransposedRow) => {
                                const rowKey = row.cells[spec]
                                if (!rowKey) {
                                  return (
                                    <span className="supplier-price-transposed-empty">
                                      —
                                    </span>
                                  )
                                }
                                const brandBase = rulesByBrand.get(
                                  section.brandName,
                                )?.base
                                const isBase =
                                  Boolean(brandBase) &&
                                  `${brandBase?.material}|${brandBase?.spec}|${brandBase?.length}` ===
                                    `${row.material}|${spec}|${row.length}`
                                const serverPrice =
                                  view?.cells.get(rowKey)?.price
                                const baseColumn = baseColumns.get(
                                  section.brandName,
                                )
                                const computed = baseColumn?.prices.get(rowKey)
                                const baseComputed =
                                  priceMode === 'base' &&
                                  !isBase &&
                                  computed !== undefined
                                const value = baseComputed
                                  ? computed
                                  : draftPrice(
                                      drafts[section.brandName],
                                      rowKey,
                                      serverPrice,
                                    )
                                return (
                                  <InputNumber
                                    aria-label={`${section.brandName} ${row.material} ${spec} ${row.length}`}
                                    className={`supplier-price-sheet-input${
                                      isBase
                                        ? ' supplier-price-transposed-base'
                                        : ''
                                    }`}
                                    data-grid-cell={cellIdOf(
                                      section.brandName,
                                      rowKey,
                                    )}
                                    disabled={!canUpdate || baseComputed}
                                    min={0}
                                    precision={2}
                                    size="small"
                                    style={{ width: '100%' }}
                                    title={
                                      isBase
                                        ? t(
                                            'priceCompare.supplierPrice.baseBadge',
                                          )
                                        : baseComputed
                                          ? t(
                                              'priceCompare.supplierPrice.computedFromBase',
                                              {
                                                price:
                                                  baseColumn?.basePrice ?? '',
                                              },
                                            )
                                          : undefined
                                    }
                                    value={value}
                                    onChange={(next) => {
                                      const parsed =
                                        typeof next === 'number' ? next : null
                                      if (priceMode === 'base' && isBase) {
                                        applyBasePrice(
                                          section.brandName,
                                          rowKey,
                                          parsed,
                                        )
                                        return
                                      }
                                      updateCell(
                                        section.brandName,
                                        rowKey,
                                        parsed,
                                      )
                                    }}
                                    onFocus={() => {
                                      anchorRef.current = {
                                        brandName: section.brandName,
                                        rowKey,
                                      }
                                    }}
                                    onKeyDown={(event) => {
                                      const move = (delta: number) => {
                                        const index = block.rows.indexOf(row)
                                        const target = block.rows[index + delta]
                                        const targetKey = target?.cells[spec]
                                        if (!targetKey) return
                                        event.preventDefault()
                                        event.stopPropagation()
                                        focusCell(section.brandName, targetKey)
                                      }
                                      if (
                                        event.key === 'ArrowDown' ||
                                        event.key === 'Enter'
                                      ) {
                                        move(1)
                                        return
                                      }
                                      if (event.key === 'ArrowUp') {
                                        move(-1)
                                        return
                                      }
                                      if (event.key === 'Escape') {
                                        event.currentTarget.blur()
                                      }
                                    }}
                                  />
                                )
                              },
                            })),
                          ]}
                          dataSource={block.rows}
                          pagination={false}
                          rowKey={(row) => `${row.material}|${row.length}`}
                          scroll={{ x: 132 + block.specs.length * 96 }}
                          size="small"
                          tableLayout="fixed"
                        />
                      </div>
                    ))}
                  </section>
                )
              })
            )}
          </div>
        </Spin>
      ) : (
        <Spin spinning={saving || specsQuery.isPending || gridsLoading}>
          {/* Excel 式网格：行=规格、列=品牌；粘贴与键盘移动都以当前聚焦格为锚点 */}
          <div
            className="supplier-price-sheet"
            onKeyDownCapture={guardUndoRedo}
            onPaste={handlePaste}
            ref={gridRef}
          >
            <Table<SpecRow>
              bordered
              columns={sheetColumns}
              dataSource={displayRows}
              pagination={false}
              rowKey={specRowKey}
              scroll={{ x: sheetWidth, y: 560 }}
              tableLayout="fixed"
              size="small"
              sticky
              locale={{
                emptyText: (
                  <Empty description={t('priceCompare.supplierPrice.empty')} />
                ),
              }}
            />
          </div>
        </Spin>
      )}

      {supplierId && ruleBrand ? (
        <SupplierBasePriceRuleModal
          brandName={ruleBrand}
          onClose={() => setRuleBrand(undefined)}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: ['supplier-base-price-rules'],
            })
          }}
          open
          rows={specRows}
          supplierId={supplierId}
        />
      ) : null}
    </Flex>
  )
}
