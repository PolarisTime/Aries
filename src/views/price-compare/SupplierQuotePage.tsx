import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalculatorOutlined,
  ClearOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  RedoOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
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
  buildCategoryMatrices,
  buildMatrixPastePlan,
  buildMatrixSlots,
  type CategoryMatrix,
  columnLengths as columnLengthsOf,
  filterSpecRows,
  groupSpecRows,
  isRealLength,
  matrixCellKeyOf,
  matrixLengthsOf,
  matrixMaterialsOf,
  parseBrandPrefs,
  parseClipboardGrid,
  reorderBrands,
  roundPrice,
  rowKeyOfCell,
  SHEET_COLUMN_WIDTH,
  SHEET_FIXED_COLUMNS,
  type SheetFixedColumnKey,
  type SheetMatrixRow,
  type SpecRow,
  serializeBrandPrefs,
  sheetWidthOf,
  shiftBrand,
  toggleHidden,
} from './supplier-quote-grid'
import { persistColumnPlans } from './supplier-quote-save'
import {
  buildTransposedSections,
  lengthHeader,
  specHeader,
  type TransposedBlock,
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
  const [saving, setSaving] = useState(false)
  /** 列显示偏好：顺序 + 隐藏集合（按供应商存 localStorage，刷新后保持）。 */
  const [brandOrder, setBrandOrder] = useState<string[]>([])
  const [hiddenBrands, setHiddenBrands] = useState<string[]>([])
  /** 隐藏的定尺列（9米/12米…）：有的供应商只报其中一种定尺。 */
  const [hiddenLengths, setHiddenLengths] = useState<string[]>([])
  /** 隐藏的固定列（序号/类别/材质/规格）：窗口窄或只想看价格时可以关掉。 */
  const [hiddenFixedColumns, setHiddenFixedColumns] = useState<
    SheetFixedColumnKey[]
  >([])
  /** 隐藏的「材质 × 定尺」整列（`材质\u0000定尺`）：有的组合这个供应商根本不报。 */
  const [hiddenMaterialColumns, setHiddenMaterialColumns] = useState<string[]>(
    [],
  )
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
   * 候选品牌 = **供应商资料里的经营品牌** ∪ 商品品牌全集（仅用于发现历史价格表）。
   *
   * <p>不再提供"手动选择品牌"：品牌的唯一来源是供应商资料（主数据），
   * 报价页只负责把该供应商该报的品牌列出来。商品品牌全集只用来**发现历史数据** ——
   * 经营品牌没维护、但价格表已经存在的品牌必须还能被看到，否则那些报价会凭空消失。</p>
   */
  const candidateBrands = useMemo(
    () =>
      brandColumnOrder({
        declared: declaredBrands,
        discover: materialBrands,
        extra: [],
      }),
    [declaredBrands, materialBrands],
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
    const shown = new Set(declaredBrands)
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
  }, [candidateBrands, declaredBrands, grids, specsQuery.data, supplierId])

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

  /** 规格搜索过滤后的规格行（材质抽到表头后，品牌成列视图再重组成矩阵行）。 */
  const displayRows = useMemo(
    () => filterSpecRows(specRows, specKeyword),
    [specKeyword, specRows],
  )

  /*
   * 品牌成列视图：**按品类拆成多张表**，每张表 行 = 规格，列 = 品牌 → 材质 → 定尺。
   *
   * <p>材质抽到表头后，同一规格在多个材质下各有一格，横向即可对比各材质报价；
   * 按品类拆是因为盘螺（卷材，无定尺）和直条（9米/12米）的定尺完全不同，
   * 混在一张表里会让一半的格子恒为「—」。</p>
   *
   * <p>「只看未填」按**整行**判断：该规格在所有材质、所有品牌下都没价才算未填。</p>
   */
  const categoryMatrices = useMemo(() => {
    const matrices = buildCategoryMatrices(displayRows, hiddenLengths)
    if (!onlyUnpriced) return matrices
    return matrices
      .map((matrix) => ({
        ...matrix,
        rows: matrix.rows.filter((row) =>
          [...row.cells.values()].every((rowKey) =>
            displayViews.every((view) => view.cells.get(rowKey) === undefined),
          ),
        ),
      }))
      .filter((matrix) => matrix.rows.length > 0)
  }, [displayRows, displayViews, hiddenLengths, onlyUnpriced])

  const hiddenMaterialColumnSet = useMemo(
    () => new Set(hiddenMaterialColumns),
    [hiddenMaterialColumns],
  )

  /**
   * 「材质 × 定尺」列选项（列显示面板用）。
   *
   * <p>数据里真实存在的组合才列出：某个材质的 12米 在商品资料里不存在，就不该出现在面板里，
   * 否则用户会去关一个本来就没有的列。</p>
   */
  const materialColumnOptions = useMemo(() => {
    const options: { key: string; label: string }[] = []
    const materials = matrixMaterialsOf(specRows)
    for (const material of materials) {
      for (const length of matrixLengthsOf(specRows, material)) {
        options.push({
          key: matrixCellKeyOf(material, length),
          label: `${material} ${lengthHeader(length)}`,
        })
      }
    }
    return options
  }, [specRows])

  /** 面板里按材质分组的列选项（材质名 + 该材质的定尺列）。 */
  const materialColumnGroups = useMemo(
    () =>
      matrixMaterialsOf(specRows).map((material) => ({
        material,
        options: matrixLengthsOf(specRows, material).map((length) => ({
          key: matrixCellKeyOf(material, length),
          length,
        })),
      })),
    [specRows],
  )

  /** 当前被隐藏的列总数（面板标题上的角标）。 */
  const hiddenColumnCount =
    hiddenBrands.length +
    hiddenLengths.length +
    hiddenFixedColumns.length +
    hiddenMaterialColumns.length

  /** 一键恢复：所有列都显示。 */
  const showAllColumns = () => {
    setHiddenBrands([])
    setHiddenLengths([])
    setHiddenFixedColumns([])
    setHiddenMaterialColumns([])
  }

  /**
   * 整组显隐：该材质的列全显示时点它 = 全部隐藏；否则全部显示。
   *
   * <p>想快速只看某个材质时有用（例如这一批只报 HRB400E）。</p>
   */
  const toggleMaterialGroup = (material: string) => {
    const group = materialColumnGroups.find(
      (item) => item.material === material,
    )
    if (!group) return
    const keys = group.options.map((option) => option.key)
    const allVisible = keys.every((key) => !hiddenMaterialColumnSet.has(key))
    setHiddenMaterialColumns((current) =>
      allVisible
        ? [...new Set([...current, ...keys])]
        : current.filter((key) => !keys.includes(key)),
    )
  }

  /** 该材质真正要渲染的定尺列 = 去掉全局隐藏的定尺 + 去掉整列隐藏的组合。 */
  const visibleLengthsOf = (matrix: CategoryMatrix, material: string) =>
    (matrix.lengthsOf.get(material) ?? []).filter(
      (length) =>
        !hiddenMaterialColumnSet.has(matrixCellKeyOf(material, length)),
    )

  /**
   * 隐藏/显示某个「材质 × 定尺」整列。
   *
   * <p>不允许把所有材质列都关掉：那样整张表只剩序号/规格，没有任何可填价格的格子。</p>
   */
  const toggleMaterialColumn = (key: string) => {
    setHiddenMaterialColumns((current) => {
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      const nextHidden = new Set(next)
      const remaining = materialColumnOptions.filter(
        (option) => !nextHidden.has(option.key),
      )
      return remaining.length === 0 ? current : next
    })
  }

  /** 每张表的表宽：可见固定列 + 品牌数 × 该品类（材质 × 定尺）列数 × 单列宽。 */
  const matrixWidthOf = (matrix: CategoryMatrix) => {
    const slotCount = matrix.materials.reduce(
      (total, material) => total + visibleLengthsOf(matrix, material).length,
      0,
    )
    return sheetWidthOf(
      displayViews.length,
      Math.max(slotCount, 1),
      hiddenFixedColumns,
    )
  }

  /** 粘贴格位（某品牌某品类内）：品牌 × 材质 × 定尺，与界面 DOM 顺序一致。 */
  const slotsOf = (matrix: CategoryMatrix) =>
    buildMatrixSlots(
      displayViews.map((view) => view.brandName),
      matrix.materials,
      (material) => matrix.lengthsOf.get(material) ?? [],
    )

  // 列顺序/隐藏集合落本地：这是个人视图偏好，不写服务端（换人不该被别人改了列顺序）
  useEffect(() => {
    if (!supplierId) return
    window.localStorage.setItem(
      brandPrefsKey(supplierId),
      serializeBrandPrefs({
        order: brandOrder,
        hidden: hiddenBrands,
        hiddenLengths,
        hiddenFixed: hiddenFixedColumns,
        hiddenMaterialColumns,
      }),
    )
  }, [
    brandOrder,
    hiddenBrands,
    hiddenFixedColumns,
    hiddenLengths,
    hiddenMaterialColumns,
    supplierId,
  ])

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
    const grid = parseClipboardGrid(text)
    // 锚点行键 = 类别|材质|规格|定尺；先按品类找到那张表，再定位行（类别+规格）与列（品牌+材质+定尺）
    const [category, material, spec, length] = anchor.rowKey.split('|')
    if (length === undefined) return
    const target = categoryMatrices.find((item) => item.category === category)
    if (!target) return
    const slots = slotsOf(target)
    const startSlotIndex = slots.findIndex(
      (slot) =>
        slot.brandName === anchor.brandName &&
        slot.material === material &&
        slot.length === length,
    )
    const startRowIndex = target.rows.findIndex(
      (row) => row.key === `${category}|${spec}`,
    )
    if (!grid.length || startSlotIndex < 0 || startRowIndex < 0) return

    const plan = buildMatrixPastePlan({
      matrix: grid,
      slots,
      rows: target.rows,
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
      ?.blocks.find(
        (item) => item.category === category && item.material === material,
      )
    if (!block) return
    const startRow = block.rows.findIndex((item) => item.spec === spec)
    const startColumn = block.lengths.indexOf(length)
    if (startRow < 0 || startColumn < 0) return
    event.preventDefault()

    const cells: { brandName: string; rowKey: string; value: number | null }[] =
      []
    let dropped = 0
    matrix.forEach((values, rowOffset) => {
      values.forEach((raw, columnOffset) => {
        const targetRow = block.rows[startRow + rowOffset]
        const targetLength = block.lengths[startColumn + columnOffset]
        if (!targetRow || targetLength === undefined) return
        const rowKey = targetRow.cells[targetLength]
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

  /**
   * 规格横置的单元格：行 = 规格、列 = 定尺。
   *
   * <p>键盘：↑/↓ 换规格（同定尺），←/→ 换定尺（同规格），Enter 下一行 —— 与表格软件一致。
   * 基价模式的只读/计算取值与品牌成列视图同源（`baseColumns`），不另写一套判据。</p>
   */
  const renderTransposedCell = (
    brandName: string,
    block: TransposedBlock,
    row: TransposedRow,
    length: string,
    baseColumn:
      | { baseCellKey: string; basePrice?: number; prices: Map<string, number> }
      | undefined,
  ) => {
    const rowKey = row.cells[length]
    if (!rowKey) {
      return <span className="supplier-price-transposed-empty">—</span>
    }
    const view = viewByBrand.get(brandName)
    const base = rulesByBrand.get(brandName)?.base
    const isBase =
      Boolean(base) &&
      `${base?.material}|${base?.spec}|${base?.length}` ===
        `${block.material}|${row.spec}|${length}`
    const computed = baseColumn?.prices.get(rowKey)
    const baseComputed =
      priceMode === 'base' && !isBase && computed !== undefined
    const value = baseComputed
      ? computed
      : draftPrice(drafts[brandName], rowKey, view?.cells.get(rowKey)?.price)
    return (
      <InputNumber
        aria-label={`${brandName} ${block.material} ${row.spec} ${length}`}
        className={`supplier-price-sheet-input${
          isBase ? ' supplier-price-transposed-base' : ''
        }`}
        data-grid-cell={cellIdOf(brandName, rowKey)}
        disabled={!canUpdate || baseComputed}
        min={0}
        size="small"
        style={{ width: '100%' }}
        title={
          isBase
            ? t('priceCompare.supplierPrice.baseBadge')
            : baseComputed
              ? t('priceCompare.supplierPrice.computedFromBase', {
                  price: baseColumn?.basePrice ?? '',
                })
              : undefined
        }
        value={value}
        onChange={(next) => {
          const parsed = typeof next === 'number' ? roundPrice(next) : null
          if (priceMode === 'base' && isBase) {
            applyBasePrice(brandName, rowKey, parsed)
            return
          }
          updateCell(brandName, rowKey, parsed)
        }}
        onFocus={() => {
          anchorRef.current = { brandName, rowKey }
        }}
        onKeyDown={(event) => {
          const rowIndex = block.rows.indexOf(row)
          const lengthIndex = block.lengths.indexOf(length)
          const moveTo = (
            nextRow: TransposedRow | undefined,
            nextLength: string | undefined,
          ) => {
            const targetKey =
              nextRow && nextLength ? nextRow.cells[nextLength] : undefined
            if (!targetKey) return false
            event.preventDefault()
            event.stopPropagation()
            focusCell(brandName, targetKey)
            return true
          }
          if (event.key === 'ArrowDown' || event.key === 'Enter') {
            moveTo(block.rows[rowIndex + 1], length)
            return
          }
          if (event.key === 'ArrowUp') {
            moveTo(block.rows[rowIndex - 1], length)
            return
          }
          if (event.key === 'ArrowRight') {
            moveTo(row, block.lengths[lengthIndex + 1])
            return
          }
          if (event.key === 'ArrowLeft') {
            moveTo(row, block.lengths[lengthIndex - 1])
            return
          }
          if (event.key === 'Escape') {
            event.currentTarget.blur()
          }
        }}
      />
    )
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

  /** 右上角设置的点击：key 可能是「动作」（单品牌平铺）或「品牌\u0000动作」（分组）。 */
  const onColumnSettingsClick = ({ key }: { key: string }) => {
    const [first, second] = key.split('\u0000')
    if (second === undefined) {
      const only = displayViews[0]?.brandName
      if (only) onBrandMenuClick(only, first)
      return
    }
    onBrandMenuClick(first, second)
  }

  /**
   * 右上角「列设置」菜单。
   *
   * <p>品牌的列操作（左移/右移/基价加价/隐藏/清空/移除）原来挂在每个品牌表头的 ⋮ 上，
   * 现在统一收到页面右上角一个设置图标里：表头只留品牌名与未保存数，把宽度全让给价格。
   * 只有一个品牌时直接平铺（多一层子菜单反而多一次点击）；多个品牌按品牌分组。</p>
   */
  const buildColumnSettingsItems = (): NonNullable<MenuProps['items']> => {
    const brands = displayViews.map((item) => item.brandName)
    if (brands.length === 1) return brandMenuItems(brands[0])
    return brands.map((brandName) => ({
      key: brandName,
      label: brandName,
      children: brandMenuItems(brandName),
    }))
  }

  /** 移除品牌列：已有价格表走确认+软删除。 */
  const removeBrand = (brandName: string) => {
    const column = viewByBrand.get(brandName)?.column
    if (!column) {
      // 没有落库过的列：只丢弃未保存草稿即可（品牌本身来自供应商资料，不在这里删）
      dropDraft(brandName)
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
      setDrafts(restored)
      setHistory(EMPTY_HISTORY)
      setRestoredDrafts(draftMapDirty(restored))
      setBrandOrder(prefs.order)
      setHiddenBrands(prefs.hidden)
      setHiddenLengths(prefs.hiddenLengths)
      setHiddenFixedColumns(prefs.hiddenFixed)
      setHiddenMaterialColumns(prefs.hiddenMaterialColumns)
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
   * 隐藏/显示某个固定列（序号/类别/材质/规格）。
   *
   * <p>固定列也可以关掉：窗口窄时「类别/材质」很占宽度，只看价格的人是愿意关的。
   * 但**不允许全部关掉** —— 那样每一行就没有任何可读的标识了，只留一格「最后一项」。</p>
   */
  const toggleFixedColumn = (key: SheetFixedColumnKey) => {
    setHiddenFixedColumns((current) => {
      const next: SheetFixedColumnKey[] = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
      const visible = SHEET_FIXED_COLUMNS.filter(
        (column) => !next.includes(column.key),
      )
      return visible.length === 0 ? current : next
    })
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

  const supplierOptions = (suppliersQuery.data ?? []).map((option) => ({
    value: option.value,
    label: option.label,
  }))

  /** 固定总宽：列宽之和。表格不随容器拉伸，窄屏时横向滚动（Excel 的观感）。 */

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
   * 品牌列的「材质 × 定尺」一格。
   *
   * <p>行 = 类别 + 规格，列 = 品牌 → 材质 → 定尺。某个材质没有这个规格/定尺时显示「—」，
   * 不给可编辑空框（否则会写出不存在的商品组合）。</p>
   */
  /**
   * 品牌列的「材质 × 定尺」一格（某品类表内）。
   *
   * <p>行 = 规格，列 = 品牌 → 材质 → 定尺。某个材质没有这个规格/定尺时显示「—」，
   * 不给可编辑空框（否则会写出不存在的商品组合）。</p>
   */
  const renderMatrixCell = (
    matrix: CategoryMatrix,
    brandName: string,
    material: string,
    length: string,
    row: SheetMatrixRow,
  ) => {
    const rowKey = row.cells.get(matrixCellKeyOf(material, length))
    if (!rowKey) {
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
    const view = viewByBrand.get(brandName)
    const serverPrice = view?.cells.get(rowKey)?.price
    const baseColumn = baseColumns.get(brandName)
    const brandBase = rulesByBrand.get(brandName)?.base
    const isBase =
      Boolean(brandBase) &&
      `${brandBase?.material}|${brandBase?.spec}|${brandBase?.length}` ===
        `${material}|${row.spec}|${length}`
    const computed = baseColumn?.prices.get(rowKey)
    const baseComputed =
      priceMode === 'base' && !isBase && computed !== undefined
    const value = baseComputed
      ? computed
      : draftPrice(drafts[brandName], rowKey, serverPrice)
    const label = `${brandName} ${material} ${row.spec} ${length}`
    const rowPosition = matrix.rows.findIndex((item) => item.key === row.key)
    return (
      <Flex
        align="center"
        className={`supplier-price-cell-wrap${
          isBase ? ' supplier-price-base-cell' : ''
        }${
          baseComputed && computed !== undefined
            ? ' supplier-price-computed-cell'
            : ''
        }`}
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
        {isBase ? (
          <span className="aries-sr-only">
            {t('priceCompare.supplierPrice.baseBadge')}
          </span>
        ) : null}
        <InputNumber
          aria-label={label}
          className="supplier-price-sheet-input"
          controls={false}
          data-grid-cell={cellIdOf(brandName, rowKey)}
          disabled={!canUpdate || (baseComputed && computed !== undefined)}
          min={0}
          size="small"
          style={{ width: '100%' }}
          value={value}
          onChange={(next) => {
            const parsed = typeof next === 'number' ? roundPrice(next) : null
            // 基价模式下改基价格子 = 按「基价 + 加价」重算整列；手填模式只改这一格
            if (priceMode === 'base' && isBase) {
              applyBasePrice(brandName, rowKey, parsed)
              return
            }
            updateCell(brandName, rowKey, parsed)
          }}
          onFocus={() => {
            anchorRef.current = { brandName, rowKey }
          }}
          onKeyDown={(event) => {
            /*
             * 上下移动 = 换规格（同一材质、同一定尺）；移动成功必须 stopPropagation，
             * 否则 InputNumber 会把 ↑/↓ 当成步进把价格 +1/-1（实测 3300 → 3301）。
             */
            const move = (delta: number) => {
              for (
                let index = rowPosition + delta;
                index >= 0 && index < matrix.rows.length;
                index += delta
              ) {
                const target = matrix.rows[index]
                const targetKey = target.cells.get(
                  matrixCellKeyOf(material, length),
                )
                if (!targetKey) continue
                if (!focusCell(brandName, targetKey)) return
                event.preventDefault()
                event.stopPropagation()
                return
              }
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

  const fixedColumnDefs: Record<
    SheetFixedColumnKey,
    ColumnsType<SheetMatrixRow>[number]
  > = {
    index: {
      title: t('priceCompare.supplierPrice.rowIndex'),
      key: 'rowIndex',
      width: SHEET_COLUMN_WIDTH.index,
      align: 'center',
      fixed: 'left',
      render: (_value, _row, index) => (
        <span className="supplier-price-row-index">{index + 1}</span>
      ),
    },
    spec: {
      title: t('priceCompare.supplierPrice.specNo'),
      key: 'spec',
      width: SHEET_COLUMN_WIDTH.specNo,
      align: 'center',
      fixed: 'left',
      render: (_value, row) => row.spec,
    },
  }

  /** 品牌列头（可拖动排序 + 未保存数 + 未配置基价提示；报价日期归单据头，不在这里重复）。 */
  const brandTitleOf = (brandName: string) => {
    const column = viewByBrand.get(brandName)?.column
    const dirty = draftCount(drafts[brandName])
    return (
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
        </Flex>
        {column?.quotedOn ? null : (
          <Typography.Text
            className="supplier-price-brand-meta"
            type="secondary"
            style={{ fontSize: 12 }}
          >
            {t('priceCompare.supplierPrice.newColumn')}
          </Typography.Text>
        )}
      </Flex>
    )
  }

  /**
   * 一张品类表的列：可见固定列 + 品牌 → 材质 → 定尺。
   *
   * <p>材质进表头后，同一规格横向即可对比 HRB400 / HRB400E 的报价。</p>
   */
  const sheetColumnsOf = (
    matrix: CategoryMatrix,
  ): ColumnsType<SheetMatrixRow> => [
    ...SHEET_FIXED_COLUMNS.filter(
      (column) => !hiddenFixedColumns.includes(column.key),
    ).map((column) => fixedColumnDefs[column.key]),
    ...displayViews.map<ColumnsType<SheetMatrixRow>[number]>((view) => ({
      title: brandTitleOf(view.brandName),
      key: view.brandName,
      children: matrix.materials
        .filter((material) => visibleLengthsOf(matrix, material).length > 0)
        .map((material) => {
          const lengths = visibleLengthsOf(matrix, material)
          const realLengths = lengths.filter(isRealLength)
          /*
           * 该材质没有真实定尺（盘螺一类卷材）：材质直接作叶子列，
           * 不再多出一层全是「—」的表头行（用户反馈：盘螺没有长度就把这行去掉）。
           */
          if (realLengths.length === 0) {
            const length = lengths[0] ?? ''
            return {
              title: material,
              key: `${view.brandName}|${material}`,
              width: SHEET_COLUMN_WIDTH.lengthCell,
              align: 'right' as const,
              render: (_value: unknown, row: SheetMatrixRow) =>
                renderMatrixCell(matrix, view.brandName, material, length, row),
            }
          }
          return {
            title: material,
            key: `${view.brandName}|${material}`,
            children: lengths.map((length) => ({
              title: lengthHeader(length),
              key: `${view.brandName}|${material}|${length}`,
              width: SHEET_COLUMN_WIDTH.lengthCell,
              align: 'right' as const,
              render: (_value: unknown, row: SheetMatrixRow) =>
                renderMatrixCell(matrix, view.brandName, material, length, row),
            })),
          }
        }),
    })),
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
        <Dropdown
          menu={{
            items: buildColumnSettingsItems(),
            onClick: onColumnSettingsClick,
          }}
          placement="bottomRight"
          trigger={['click']}
        >
          <Button
            aria-label={t('priceCompare.supplierPrice.columnMenu')}
            icon={<SettingOutlined />}
            style={{ marginInlineStart: 'auto' }}
          >
            {t('priceCompare.supplierPrice.columnMenu')}
          </Button>
        </Dropdown>
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
            <div className="supplier-price-column-panel">
              <div className="supplier-price-column-panel-head">
                <span className="supplier-price-column-panel-title">
                  {t('priceCompare.supplierPrice.columns')}
                </span>
                <Button
                  disabled={hiddenColumnCount === 0}
                  size="small"
                  type="link"
                  onClick={showAllColumns}
                >
                  {t('priceCompare.supplierPrice.showAllColumns')}
                </Button>
              </div>

              {orderedViews.length === 0 ? (
                <Typography.Text type="secondary">
                  {t('priceCompare.supplierPrice.noBrands')}
                </Typography.Text>
              ) : (
                <div className="supplier-price-column-panel-section">
                  <span className="supplier-price-column-panel-label">
                    {t('priceCompare.supplierPrice.brandColumns')}
                  </span>
                  <div className="supplier-price-column-panel-chips">
                    {orderedViews.map((view) => (
                      <Checkbox
                        checked={!hiddenBrandSet.has(view.brandName)}
                        key={view.brandName}
                        onChange={() => hideColumn(view.brandName)}
                      >
                        {view.brandName}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              )}

              <div className="supplier-price-column-panel-section">
                <span className="supplier-price-column-panel-label">
                  {t('priceCompare.supplierPrice.fixedColumns')}
                </span>
                <div className="supplier-price-column-panel-chips">
                  {SHEET_FIXED_COLUMNS.map((column) => (
                    <Checkbox
                      checked={!hiddenFixedColumns.includes(column.key)}
                      key={column.key}
                      onChange={() => toggleFixedColumn(column.key)}
                    >
                      {t(`priceCompare.supplierPrice.${column.labelKey}`)}
                    </Checkbox>
                  ))}
                </div>
              </div>

              {columnLengths.length > 1 ? (
                <div className="supplier-price-column-panel-section">
                  <span className="supplier-price-column-panel-label">
                    {t('priceCompare.supplierPrice.lengthAllMaterials')}
                  </span>
                  <div className="supplier-price-column-panel-chips">
                    {columnLengths.map((length) => (
                      <Checkbox
                        checked={!hiddenLengthSet.has(length)}
                        key={length}
                        onChange={() => toggleLengthColumn(length)}
                      >
                        {length}
                      </Checkbox>
                    ))}
                  </div>
                </div>
              ) : null}

              {materialColumnGroups.length > 0 ? (
                <div className="supplier-price-column-panel-section">
                  <span className="supplier-price-column-panel-label">
                    {t('priceCompare.supplierPrice.materialColumns')}
                  </span>
                  <div className="supplier-price-column-panel-materials">
                    {materialColumnGroups.map((group) => (
                      <div
                        className="supplier-price-column-panel-material"
                        key={group.material}
                      >
                        <Button
                          className="supplier-price-column-panel-material-name"
                          size="small"
                          title={t(
                            'priceCompare.supplierPrice.toggleMaterialGroup',
                            { name: group.material },
                          )}
                          type="text"
                          onClick={() => toggleMaterialGroup(group.material)}
                        >
                          {group.material}
                        </Button>
                        <div className="supplier-price-column-panel-chips">
                          {group.options.map((option) => (
                            <Checkbox
                              checked={!hiddenMaterialColumnSet.has(option.key)}
                              key={option.key}
                              onChange={() => toggleMaterialColumn(option.key)}
                            >
                              {lengthHeader(option.length)}
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <span className="supplier-price-column-panel-hint">
                {t('priceCompare.supplierPrice.columnPanelHint')}
              </span>
            </div>
          }
          placement="bottomLeft"
          trigger="click"
        >
          <Button icon={<EyeOutlined />}>
            {t('priceCompare.supplierPrice.columns')}
            {hiddenColumnCount > 0 ? (
              <Tag className="supplier-price-column-count">
                {hiddenColumnCount}
              </Tag>
            ) : null}
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
                      {view?.column?.quotedOn ? null : (
                        <Typography.Text
                          className="supplier-price-brand-meta"
                          type="secondary"
                        >
                          {t('priceCompare.supplierPrice.newColumn')}
                        </Typography.Text>
                      )}
                      {dirty > 0 ? <Tag color="orange">{dirty}</Tag> : null}
                    </Flex>

                    {section.blocks.map((block, blockIndex) => {
                      // 品类名只在同一个品类的第一张表上面出现一次，不跟着每个材质重复
                      const showCategory =
                        blockIndex === 0 ||
                        section.blocks[blockIndex - 1].category !==
                          block.category
                      return (
                        <div
                          className="supplier-price-transposed-block"
                          key={`${block.category}|${block.material}`}
                          style={{
                            // 定尺少的商品（如盘螺只有一列）不要被拉满整行
                            maxWidth:
                              SHEET_COLUMN_WIDTH.labelCell * 2 +
                              block.lengths.length *
                                SHEET_COLUMN_WIDTH.lengthCell,
                          }}
                        >
                          {showCategory ? (
                            <Typography.Text className="supplier-price-transposed-category">
                              {block.category}
                            </Typography.Text>
                          ) : null}
                          {/*
                          材质作为列组表头横跨各定尺（对齐纸质报价单的两层表头）：
                          「规格 | 9米 | 12米」。
                        */}
                          <Table<TransposedRow>
                            bordered
                            columns={[
                              {
                                title: t(
                                  'priceCompare.supplierPrice.materialColumn',
                                ),
                                key: 'material',
                                width: 96,
                                fixed: 'left',
                                children: [
                                  {
                                    title: t(
                                      'priceCompare.supplierPrice.specColumn',
                                    ),
                                    dataIndex: 'spec',
                                    key: 'specValue',
                                    width: 96,
                                    render: (spec: number) => specHeader(spec),
                                  },
                                ],
                              },
                              {
                                title: block.material,
                                key: 'lengths',
                                children: block.lengths.map((length) => ({
                                  title: lengthHeader(length),
                                  key: `length-${length}`,
                                  width: SHEET_COLUMN_WIDTH.lengthCell,
                                  align: 'right' as const,
                                  render: (
                                    _value: unknown,
                                    row: TransposedRow,
                                  ) =>
                                    renderTransposedCell(
                                      section.brandName,
                                      block,
                                      row,
                                      length,
                                      baseColumns.get(section.brandName),
                                    ),
                                })),
                              },
                            ]}
                            dataSource={block.rows}
                            pagination={false}
                            rowKey={(row) => `${block.material}|${row.spec}`}
                            scroll={{
                              x:
                                SHEET_COLUMN_WIDTH.labelCell * 2 +
                                block.lengths.length *
                                  SHEET_COLUMN_WIDTH.lengthCell,
                            }}
                            size="small"
                            tableLayout="fixed"
                          />
                        </div>
                      )
                    })}
                  </section>
                )
              })
            )}
          </div>
        </Spin>
      ) : (
        <div
          className="supplier-price-sheet supplier-price-sheet-shell"
          onKeyDownCapture={guardUndoRedo}
          onPaste={handlePaste}
        >
          <Spin spinning={saving || specsQuery.isPending || gridsLoading}>
            {/* Excel 式网格：每个品类一张表，行=规格、列=品牌 → 材质 → 定尺 */}
            <div className="supplier-price-sheet-body" ref={gridRef}>
              {categoryMatrices.length === 0 ? (
                <Empty
                  description={t('priceCompare.supplierPrice.empty')}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                categoryMatrices.map((matrix) => (
                  <div
                    className="supplier-price-sheet-category"
                    key={matrix.category}
                  >
                    <Typography.Text className="supplier-price-transposed-category">
                      {matrix.category}
                    </Typography.Text>
                    <Table<SheetMatrixRow>
                      bordered
                      columns={sheetColumnsOf(matrix)}
                      dataSource={matrix.rows}
                      pagination={false}
                      rowKey={(row) => row.key}
                      scroll={{ x: matrixWidthOf(matrix) }}
                      tableLayout="fixed"
                      size="small"
                      sticky
                    />
                  </div>
                ))
              )}
            </div>
          </Spin>
        </div>
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
