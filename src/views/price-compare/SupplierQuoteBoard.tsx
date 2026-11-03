import {
  DeleteOutlined,
  RedoOutlined,
  ReloadOutlined,
  SearchOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
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
  Select,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  type CSSProperties,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import {
  addSupplierPriceColumn,
  fetchSpecRows,
  fetchSupplierPriceGrid,
  removeSupplierPriceColumn,
  type SupplierPriceCellInput,
  type SupplierPriceColumn,
  type SupplierPriceGrid,
  saveSupplierPriceColumnItems,
} from '@/api/market/supplier-price-lists'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useHasPermission } from '@/hooks/usePermission'
import { message, modal } from '@/utils/antd-app'
import {
  type BrandDraft,
  buildBrandCatalog,
  buildColumnSavePlan,
  type CategoryCatalog,
  catalogHas,
  draftCount,
  draftPrice,
  mergeSpecRows,
  type QuoteRow,
  quoteRowKey,
  type ServerCell,
  serverCellsOf,
  setDraftPrice,
} from './supplier-price-list-model'
import {
  type DraftHistory,
  EMPTY_HISTORY,
  pushHistory,
  redoDrafts,
  undoDrafts,
} from './supplier-quote-edits'
import { parseClipboardGrid, roundPrice } from './supplier-quote-grid'
import {
  gridQueryKey,
  readDrafts,
  writeDrafts,
} from './supplier-quote-view-prefs'
import './supplier-price.css'

/** 一列的保存状态：安静地告诉用户「存了没」，不需要点保存按钮。 */
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** 自动保存的防抖时长：打字停顿这么久就落库。 */
const AUTOSAVE_DELAY_MS = 800

/**
 * 列宽（px）。
 *
 * <p>按「Excel 报价单」的密度定：材质/规格/类别三列只放短文本，能窄就窄；
 * 品牌价格列 96 ≈ 6 位数金额 + 内边距。整表在 1280 宽下能容下 6~8 个品牌列而不横向滚动。</p>
 */
const ROW_HEAD_WIDTHS = {
  material: 88,
  spec: 52,
  category: 56,
} as const
const BRAND_COLUMN_WIDTH = 96

/** 定尺排序：9米 → 12米 → 其它 → 不分定尺(-)，与报价单习惯一致。 */
const sortLengths = (left: string, right: string) => {
  if (left === right) return 0
  if (left === '-') return 1
  if (right === '-') return -1
  const leftMeters = Number.parseInt(left, 10)
  const rightMeters = Number.parseInt(right, 10)
  if (Number.isFinite(leftMeters) && Number.isFinite(rightMeters)) {
    return leftMeters - rightMeters
  }
  return left.localeCompare(right)
}

/** 该类别下的列顺序：品牌 → 材质 → 定尺（只含商品资料里真实存在的组合）。 */
const cellColumnsOf = (
  category: CategoryCatalog | undefined,
  brandNames: readonly string[],
): CellColumn[] => {
  if (!category) return []
  const columns: CellColumn[] = []
  for (const brandName of brandNames) {
    const brandCatalog = category.byBrand.get(brandName)
    if (!brandCatalog) continue
    for (const [material, lengths] of brandCatalog.materials) {
      for (const length of [...lengths.keys()].sort(sortLengths)) {
        columns.push({
          category: category.category,
          brandName,
          material,
          length,
        })
      }
    }
  }
  return columns
}

/** 类别显示顺序：盘螺在前、直条在后，其余按字典序接在后面（不硬编码业务清单，只定优先级）。 */
const PREFERRED_CATEGORY_ORDER = ['盘螺', '直条']

/** 一个价格列 = 类别 + 品牌 + 材质 + 定尺；材质与定尺都已经进了表头。 */
type CellColumn = {
  category: string
  brandName: string
  material: string
  length: string
}

/** 单元格定位键：列下标 + 商品组合键（列下标已包含品牌、材质与定尺）。 */
const cellKey = (columnIndex: number, leafKey: string) =>
  `${columnIndex}\u0000${leafKey}`

/** 列 + 规格 → 真正的商品组合（保存载荷的键就是它）。 */
const leafOfSpec = (column: CellColumn, spec: number): QuoteRow => ({
  brand: column.brandName,
  category: column.category,
  material: column.material,
  spec,
  length: column.length,
})

const dotStyle = (color: string): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: color,
  display: 'inline-block',
})

/**
 * 供应商报价表（比价一手价）——**以供应商为主轴**的报价工作台。
 *
 * <p>业务动作只有一个：「这家供应商，这几个品牌，每个规格报多少」。页面结构就是这句话：</p>
 * <ul>
 *   <li><b>一张表 = 一个供应商</b>（顶部选供应商）；</li>
 *   <li><b>行 = 商品规格</b>（只来自商品资料，见 {@link mergeQuoteRows}）；</li>
 *   <li><b>列 = 该供应商的经营品牌</b>：一个品牌一列，材质/定尺退回成行字段，
 *       不再拆「品牌 → 材质 → 定尺」多级表头 —— 于是不会再有满屏的「—」；</li>
 *   <li><b>格 = 报价</b>：敲完即存（防抖自动保存），没有保存按钮、没有确认弹窗；</li>
 *   <li><b>行末 = 本行最低价品牌</b>，直接回答报价时最关心的问题。</li>
 * </ul>
 */
export function SupplierQuoteBoard() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const canUpdate = useHasPermission('supplier-price-lists:update')
  const canDelete = useHasPermission('supplier-price-lists:delete')

  /** 已打开的供应商标签页（key = supplierId）；按需打开、可关闭。 */
  const [openSupplierIds, setOpenSupplierIds] = useState<string[]>([])
  /** 当前激活的供应商标签页。 */
  const [activeSupplierId, setActiveSupplierId] = useState<string>()
  const [quotedOn, setQuotedOn] = useState(() => dayjs())
  /** 未落库的改动：品牌 →（行键 → 价格；null = 明确清空）。 */
  const [drafts, setDrafts] = useState<Record<string, BrandDraft>>({})
  /** 已保存但缓存可能尚未刷新的值：让「敲完即显示」不依赖一次网络往返。 */
  const [savedValues, setSavedValues] = useState<
    Record<string, Record<string, number>>
  >({})
  /** 本次会话内建/更新过的列（保存后版本号以服务端返回为准）。 */
  const [columns, setColumns] = useState<Record<string, SupplierPriceColumn>>(
    {},
  )
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({})
  const [history, setHistory] = useState<DraftHistory>(EMPTY_HISTORY)
  const [keyword, setKeyword] = useState('')
  const [onlyUnpriced, setOnlyUnpriced] = useState(false)
  /** 本次进页是否从 localStorage 恢复了上次未保存的草稿（恢复后提示「已恢复 / 放弃」）。 */
  const [restoredDrafts, setRestoredDrafts] = useState(false)
  /** 已完成「恢复判断」的供应商；只有它等于当前供应商时才允许把草稿写回本地。 */
  const [draftsRestoredFor, setDraftsRestoredFor] = useState<string>()

  const suppliersQuery = useQuery({
    queryKey: QUERY_KEYS.masterOptions.supplier,
    queryFn: () => fetchSupplierOptions(),
    staleTime: Number.POSITIVE_INFINITY,
  })
  const specsQuery = useQuery({
    queryKey: ['supplier-price-specs'],
    queryFn: ({ signal }) => fetchSpecRows(signal),
    staleTime: Number.POSITIVE_INFINITY,
  })

  const suppliers = suppliersQuery.data ?? []

  const supplierId = activeSupplierId

  /*
   * 默认把第一个供应商开成标签页：标签是按需打开/关闭的（antd 规范：只有 card 类型支持
   * 添加与关闭），但不能让用户一进来面对空白页。
   */
  useEffect(() => {
    if (suppliers.length === 0 || openSupplierIds.length > 0) return
    const first = suppliers[0].value
    setOpenSupplierIds([first])
    setActiveSupplierId(first)
  }, [openSupplierIds.length, suppliers])

  const supplier = useMemo(
    () => suppliers.find((option) => option.value === supplierId),
    [supplierId, suppliers],
  )

  /**
   * 「经营品牌」= 供应商资料里维护的品牌，是品牌列的**主口径**。
   *
   * <p>品牌来自主数据，报价页不自己发明；「加品牌」本质上也是给这家供应商建一条
   * (供应商, 品牌) 价格表，仍以主数据为最后口径。</p>
   */
  const declaredBrands = useMemo(
    () => (supplier?.brands ?? []).map((name) => name.trim()).filter(Boolean),
    [supplier?.brands],
  )

  /**
   * 需要查询价格表的品牌 = **供应商资料的经营品牌** ∪ 本次会话手动加的列。
   *
   * <p>口径只有一个：供应商资料里配了什么品牌，报价表就只出现这些品牌。
   * 库里若残留不在经营品牌内的价格表（例如经营品牌被改小过），那些表**不展示、也不改写** ——
   * 保存只针对展示出来的列，所以它们的数据原样留在库中，不会被清空。</p>
   *
   * <p>2026-11-03 曾按「历史价格不能被藏起来」把这类品牌也成列，用户指出与经营品牌配置不符，
   * 已改回严格按经营品牌。</p>
   */
  const candidateBrands = useMemo(
    () => [...new Set([...declaredBrands, ...Object.keys(columns)])],
    [columns, declaredBrands],
  )

  const gridQueries = useQueries({
    queries: supplierId
      ? candidateBrands.map((brandName) => ({
          queryKey: gridQueryKey(brandName),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchSupplierPriceGrid(brandName, signal),
          staleTime: 0,
        }))
      : [],
  })

  /** 品牌 → 网格。以 Map 传递，避免下游还要按下标回查 candidateBrands。 */
  const gridByBrand = useMemo(() => {
    const map = new Map<string, SupplierPriceGrid | undefined>()
    candidateBrands.forEach((brandName, index) => {
      map.set(brandName, gridQueries[index]?.data)
    })
    return map
  }, [candidateBrands, gridQueries])

  /** 该供应商在这个品牌下的价格表列；没有则 null（= 该品牌尚未建列）。 */
  const columnOf = useCallback(
    (brandName: string): SupplierPriceColumn | null =>
      columns[brandName] ??
      gridByBrand
        .get(brandName)
        ?.columns.find((item) => item.supplierId === supplierId) ??
      null,
    [columns, gridByBrand, supplierId],
  )

  /** 展示的品牌列 = 供应商资料的经营品牌 ∪ 本次手动加的列（不再按「库里有没有价格表」扩展）。 */
  const brandNames = candidateBrands

  /** 品牌 → 网格 / 该供应商的列 / 服务端价格。三张表一次算好，避免每格都重算一遍。 */
  const byBrand = useMemo(() => {
    const grids = new Map<string, SupplierPriceGrid | undefined>()
    const columnMap = new Map<string, SupplierPriceColumn | null>()
    const cellMap = new Map<string, Map<string, ServerCell>>()
    for (const brandName of brandNames) {
      const grid = gridByBrand.get(brandName)
      const column = columnOf(brandName)
      grids.set(brandName, grid)
      columnMap.set(brandName, column)
      cellMap.set(brandName, serverCellsOf(grid, column))
    }
    return { grids, columns: columnMap, cells: cellMap }
  }, [brandNames, columnOf, gridByBrand])

  const byBrandRef = useRef(byBrand)

  useEffect(() => {
    byBrandRef.current = byBrand
  }, [byBrand])

  /** 商品的全部行（只来自商品资料）——保存载荷必须用它，不能用过滤后的行。 */
  const allRows = useMemo(
    () => mergeSpecRows(specsQuery.data ?? []),
    [specsQuery.data],
  )

  /** 商品资料按品牌切好的目录：行 = 规格，列 = 品牌 × 材质 × 定尺（唯一口径，见 buildBrandCatalog）。 */
  const catalog = useMemo(() => buildBrandCatalog(allRows), [allRows])

  /** 表格行：只有规格（材质与定尺都已经在表头里）。 */
  type SpecRow = { spec: number }

  const allRowsRef = useRef(allRows)

  useEffect(() => {
    allRowsRef.current = allRows
  }, [allRows])

  const serverPriceOf = useCallback(
    (brandName: string, key: string) =>
      byBrand.cells.get(brandName)?.get(key)?.price,
    [byBrand],
  )

  const cellValueOfLeaf = (
    brandName: string,
    leaf: QuoteRow,
  ): number | null => {
    const key = quoteRowKey(leaf)
    return draftPrice(
      drafts[brandName],
      key,
      savedValues[brandName]?.[key] ?? serverPriceOf(brandName, key),
    )
  }

  /**
   * 行级「最低价」：在该规格下所有存在的（品牌 × 材质 × 定尺）格子里取最低。
   *
   * <p>材质与定尺都进了表头，所以一行可能有几十个可比价格；「本行最低」必须跨它们比较，
   * 否则会漏掉更便宜的材质/定尺组合。</p>
   */
  const cheapestOfSpec = (
    category: CategoryCatalog | undefined,
    cellColumns: readonly CellColumn[],
    spec: number,
  ):
    | { brandName: string; material: string; length: string; price: number }
    | undefined => {
    let cheapest:
      | { brandName: string; material: string; length: string; price: number }
      | undefined
    for (const column of cellColumns) {
      if (
        !catalogHas(
          category,
          column.brandName,
          column.material,
          spec,
          column.length,
        )
      ) {
        continue
      }
      const price = cellValueOfLeaf(column.brandName, leafOfSpec(column, spec))
      if (price === null || price <= 0) continue
      if (!cheapest || price < cheapest.price) {
        cheapest = { ...column, price }
      }
    }
    return cheapest
  }

  /**
   * 每个类别的表格数据：行 = 规格，列 = 品牌 × 材质 × 定尺。
   *
   * <p>行的范围来自该类别商品资料里出现过的全部规格；搜索按规格与材质过滤，
   * 「只看未填」按已落库值判断（不看草稿，否则边敲边消失）。</p>
   */
  const categoryGroups = useMemo(() => {
    const order: string[] = []
    for (const categoryName of PREFERRED_CATEGORY_ORDER) {
      if (catalog.has(categoryName)) order.push(categoryName)
    }
    for (const categoryName of catalog.keys()) {
      if (!order.includes(categoryName)) order.push(categoryName)
    }

    const needle = keyword.trim().toLowerCase()
    return order.map((categoryName) => {
      const category = catalog.get(categoryName)
      const cellColumns = cellColumnsOf(category, brandNames)
      /*
       * 行只取**已成名品牌的**规格并集，不能取整个类别的规格并集。
       *
       * <p>商品资料里存在一些不成列的品牌（`圆钢`、`盘螺调直`、E2E 夹具等：既不是该供应商的
       * 经营品牌，也没有任何价格表），如果行按整个类别的规格算，它们独有的规格会变成
       * 「整行没有任何可填格子」的死行 —— 用户看到的正是这种行。列按品牌筛、行却按全量算，
       * 是口径不一致。</p>
       */
      const specSet = new Set<number>()
      for (const column of cellColumns) {
        const specsOfColumn =
          category?.byBrand
            .get(column.brandName)
            ?.materials.get(column.material)
            ?.get(column.length) ?? []
        for (const spec of specsOfColumn) specSet.add(spec)
      }
      let specs = [...specSet].sort((left, right) => left - right)
      if (needle) {
        // 规格可以直接按数字匹配；材质/定尺名命中时保留该类别下这些材质拥有的规格
        const materialMatch = cellColumns.some((column) =>
          `${column.material} ${column.length}`.toLowerCase().includes(needle),
        )
        specs = specs.filter(
          (spec) => materialMatch || String(spec).includes(needle),
        )
      }
      const rows: SpecRow[] = specs.map((spec) => ({ spec }))
      if (onlyUnpriced) {
        rows.splice(
          0,
          rows.length,
          ...rows.filter((row) =>
            cellColumns.every((column) => {
              if (
                !catalogHas(
                  category,
                  column.brandName,
                  column.material,
                  row.spec,
                  column.length,
                )
              ) {
                return true
              }
              const key = quoteRowKey(leafOfSpec(column, row.spec))
              const price =
                savedValues[column.brandName]?.[key] ??
                serverPriceOf(column.brandName, key)
              return price === undefined || price === null
            }),
          ),
        )
      }
      const indexBySpec = new Map<number, number>()
      for (const [index, row] of rows.entries())
        indexBySpec.set(row.spec, index)
      return {
        categoryName,
        category,
        rows,
        indexBySpec,
        cellColumns,
      }
    })
  }, [brandNames, catalog, keyword, onlyUnpriced, savedValues, serverPriceOf])

  /* ---------------------------------------------------------------- 自动保存 */

  /*
   * 异步保存要读到「最新值」，但**不能在渲染期写 ref**（会破坏并发渲染与 React Compiler 的
   * 优化假设）。草稿走 commitDrafts（只在事件/异步回调里写），其余用 effect 在提交后同步。
   */
  const draftsRef = useRef<Record<string, BrandDraft>>({})
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const savingRef = useRef(new Set<string>())
  const quotedOnRef = useRef(quotedOn)
  const supplierIdRef = useRef(supplierId)

  useEffect(() => {
    quotedOnRef.current = quotedOn
  }, [quotedOn])

  useEffect(() => {
    supplierIdRef.current = supplierId
  }, [supplierId])

  /** 稳定引用：草稿恢复 effect 依赖它，普通函数每次渲染都会换身份、把 effect 变成每次都跑。 */
  const commitDrafts = useCallback((next: Record<string, BrandDraft>) => {
    draftsRef.current = next
    setDrafts(next)
  }, [])

  const applyDrafts = (next: Record<string, BrandDraft>) => {
    setHistory((current) => pushHistory(current, draftsRef.current))
    commitDrafts(next)
  }

  /*
   * 草稿的本地持久化 —— 自动保存有 800ms 防抖，保存失败还会把改动留在内存；
   * 只要用户在这个窗口内切页或刷新，改动就静默消失。写进 localStorage 后回到页面能恢复。
   *
   * 两个 effect 的先后顺序很重要：先「恢复判断」再「写回」，否则首次挂载时空草稿会立刻
   * 把待恢复的内容删掉。用 draftsRestoredFor 当作「该供应商已完成恢复判断」的闸门。
   */
  useEffect(() => {
    if (!supplierId || draftsRestoredFor === supplierId) return
    const stored = readDrafts(supplierId)
    if (Object.keys(stored).length) {
      commitDrafts(stored)
      setRestoredDrafts(true)
    }
    setDraftsRestoredFor(supplierId)
  }, [commitDrafts, supplierId, draftsRestoredFor])

  useEffect(() => {
    if (!supplierId || draftsRestoredFor !== supplierId) return
    writeDrafts(supplierId, drafts)
    if (!Object.keys(drafts).length) setRestoredDrafts(false)
  }, [drafts, supplierId, draftsRestoredFor])

  /** 放弃恢复出来的草稿：清空草稿与本地存储，价格回到服务端值。 */
  const discardRestoredDrafts = () => {
    commitDrafts({})
    setHistory(EMPTY_HISTORY)
    setRestoredDrafts(false)
    if (supplierId) writeDrafts(supplierId, {})
  }

  /** 把保存结果写回缓存：不刷新页面也能立刻看到刚存的值。 */
  const applySavedToGrid = (
    grid: SupplierPriceGrid | undefined,
    column: SupplierPriceColumn,
    items: readonly SupplierPriceCellInput[],
  ) => {
    if (!grid) return
    const byKey = new Map(
      items.map((item) => [
        `${item.category}|${item.material}|${item.spec}|${item.length}`,
        item,
      ]),
    )
    const rows = grid.rows.map((row) => {
      const saved = byKey.get(quoteRowKey(row))
      const prices = { ...row.prices }
      const priceStatuses = { ...row.priceStatuses }
      const remarks = { ...row.remarks }
      if (saved) {
        prices[column.listId] = saved.price
        if (saved.priceStatus) priceStatuses[column.listId] = saved.priceStatus
        if (saved.remark) remarks[column.listId] = saved.remark
      } else {
        delete prices[column.listId]
        delete priceStatuses[column.listId]
        delete remarks[column.listId]
      }
      return { ...row, prices, priceStatuses, remarks }
    })
    for (const item of items) {
      const key = `${item.category}|${item.material}|${item.spec}|${item.length}`
      if (rows.some((row) => quoteRowKey(row) === key)) continue
      rows.push({
        category: item.category,
        material: item.material,
        spec: item.spec,
        length: item.length,
        prices: { [column.listId]: item.price },
        priceStatuses: item.priceStatus
          ? { [column.listId]: item.priceStatus }
          : {},
        remarks: item.remark ? { [column.listId]: item.remark } : {},
      })
    }
    const nextColumns = grid.columns.some(
      (item) => item.listId === column.listId,
    )
      ? grid.columns.map((item) =>
          item.listId === column.listId ? column : item,
        )
      : [...grid.columns, column]
    queryClient.setQueryData<SupplierPriceGrid>(gridQueryKey(grid.brandName), {
      ...grid,
      columns: nextColumns,
      rows,
    })
  }

  /**
   * 落库一列。
   *
   * <p>保存接口是 `PUT .../items` 的整列替换，载荷由 {@link buildColumnSavePlan} 生成 ——
   * 「可见行 ∪ 服务端已有条目」，所以商品资料里已停用的历史行不会被清掉；这里传的是
   * **全部商品行**（不是表格里过滤后的行），否则搜索/只看未填会把其它行的价格删掉。</p>
   */
  const saveBrand = async (brandName: string) => {
    const currentSupplierId = supplierIdRef.current
    if (!currentSupplierId || savingRef.current.has(brandName)) return
    const snapshot = draftsRef.current[brandName]
    if (draftCount(snapshot) === 0) return

    const existing = byBrandRef.current.columns.get(brandName) ?? null
    const serverCells = byBrandRef.current.cells.get(brandName) ?? new Map()
    savingRef.current.add(brandName)
    setSaveState((current) => ({ ...current, [brandName]: 'saving' }))
    try {
      // 没有列就先建一条 (供应商, 品牌) 价格表，再整列提交
      const created = existing
        ? null
        : await addSupplierPriceColumn({
            brandName,
            supplierId: currentSupplierId,
            quotedOn: quotedOnRef.current.format('YYYY-MM-DD'),
          })
      const target = existing ?? created
      if (created) {
        setColumns((current) => ({ ...current, [brandName]: created }))
      }
      const plan = buildColumnSavePlan({
        brandName,
        column: target,
        rows: allRowsRef.current,
        draft: snapshot,
        serverCells,
      })
      if (!plan) {
        const cleared = { ...draftsRef.current }
        delete cleared[brandName]
        commitDrafts(cleared)
        setSaveState((current) => ({ ...current, [brandName]: 'saved' }))
        return
      }
      // target 一定非空（刚创建或本来就存在）；这里的守卫只用于满足类型收窄
      if (!target) return
      const saved = await saveSupplierPriceColumnItems(
        target.listId,
        target.version,
        plan.items,
      )
      setColumns((current) => ({ ...current, [brandName]: saved }))
      applySavedToGrid(
        byBrandRef.current.grids.get(brandName),
        saved,
        plan.items,
      )
      setSavedValues((current) => {
        const values = { ...(current[brandName] ?? {}) }
        for (const item of plan.items) {
          values[
            `${item.category}|${item.material}|${item.spec}|${item.length}`
          ] = item.price
        }
        return { ...current, [brandName]: values }
      })
      // 只丢弃「已提交的那部分」草稿：保存期间继续敲的格子留着，接着自动存
      const now = draftsRef.current[brandName]
      if (now) {
        const rest: BrandDraft = { ...now }
        for (const [key, value] of Object.entries(snapshot ?? {})) {
          if (rest[key] === value) delete rest[key]
        }
        const next = { ...draftsRef.current }
        if (Object.keys(rest).length === 0) delete next[brandName]
        else next[brandName] = rest
        commitDrafts(next)
      }
      setSaveState((current) => ({ ...current, [brandName]: 'saved' }))
    } catch {
      // 失败保留草稿：用户不必重敲，点列头圆点即可重试
      setSaveState((current) => ({ ...current, [brandName]: 'error' }))
    } finally {
      savingRef.current.delete(brandName)
      if (draftCount(draftsRef.current[brandName]) > 0) {
        scheduleSave(brandName)
      }
    }
  }

  const scheduleSave = (brandName: string) => {
    const timers = timersRef.current
    const existing = timers.get(brandName)
    if (existing) clearTimeout(existing)
    timers.set(
      brandName,
      setTimeout(() => {
        timers.delete(brandName)
        void saveBrand(brandName)
      }, AUTOSAVE_DELAY_MS),
    )
  }

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
      timers.clear()
    }
  }, [])

  const updateCell = (
    brandName: string,
    rowKey: string,
    value: number | null,
  ) => {
    applyDrafts({
      ...draftsRef.current,
      [brandName]: setDraftPrice(draftsRef.current[brandName], rowKey, value),
    })
    scheduleSave(brandName)
  }

  /* ---------------------------------------------------------------- 操作 */

  /** 撤销/重做后按受影响品牌重新排队保存，避免界面与库不一致。 */
  const flushDirtyBrands = () => {
    for (const brandName of Object.keys(draftsRef.current)) {
      scheduleSave(brandName)
    }
  }

  const undo = () => {
    const next = undoDrafts(history, draftsRef.current)
    setHistory(next.history)
    commitDrafts(next.drafts)
    flushDirtyBrands()
  }
  const redo = () => {
    const next = redoDrafts(history, draftsRef.current)
    setHistory(next.history)
    commitDrafts(next.drafts)
    flushDirtyBrands()
  }

  /** 切到某个供应商前先清空这一屏的临时状态（草稿、历史、搜索、新建列缓存）。 */
  const resetBoardState = () => {
    commitDrafts({})
    setHistory(EMPTY_HISTORY)
    setSavedValues({})
    setColumns({})
    setSaveState({})
    setKeyword('')
    setOnlyUnpriced(false)
  }

  /** 有未保存改动时先确认：切标签页会丢弃草稿，不能静默丢。 */
  const confirmDiscardIfDirty = (run: () => void) => {
    if (Object.keys(drafts).length === 0) {
      run()
      return
    }
    modal.confirm({
      title: t('priceCompare.supplierPrice.discardTitle'),
      content: t('priceCompare.supplierPrice.discardContent'),
      okText: t('priceCompare.supplierPrice.discardOk'),
      okButtonProps: { danger: true },
      cancelText: t('common.cancel'),
      onOk: run,
    })
  }

  /** 切换供应商标签：有未保存草稿时先确认（切页会丢弃草稿）。 */
  const switchSupplierTab = (nextSupplierId: string) => {
    if (nextSupplierId === supplierId) return
    confirmDiscardIfDirty(() => {
      resetBoardState()
      setActiveSupplierId(nextSupplierId)
    })
  }

  /** 打开（或激活）某个供应商的标签页。 */
  const openSupplierTab = (nextSupplierId: string) => {
    setOpenSupplierIds((current) =>
      current.includes(nextSupplierId) ? current : [...current, nextSupplierId],
    )
    switchSupplierTab(nextSupplierId)
  }

  /** 关闭标签页：关掉当前页时按 antd 示例切到左邻，没有左邻就切第一个。 */
  const closeSupplierTab = (closingId: string) => {
    const close = () => {
      const remaining = openSupplierIds.filter((id) => id !== closingId)
      setOpenSupplierIds(remaining)
      if (closingId !== activeSupplierId) return
      const closedIndex = openSupplierIds.indexOf(closingId)
      const nextActive = remaining[Math.max(0, closedIndex - 1)] ?? remaining[0]
      resetBoardState()
      setActiveSupplierId(nextActive)
    }
    if (closingId === activeSupplierId) confirmDiscardIfDirty(close)
    else close()
  }

  const removeBrand = (brandName: string) => {
    const column = byBrandRef.current.columns.get(brandName) ?? null
    if (!column) {
      setColumns((current) => {
        const next = { ...current }
        delete next[brandName]
        return next
      })
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
        setColumns((current) => {
          const next = { ...current }
          delete next[brandName]
          return next
        })
        if (draftsRef.current[brandName]) {
          const nextDrafts = { ...draftsRef.current }
          delete nextDrafts[brandName]
          commitDrafts(nextDrafts)
        }
        await queryClient.invalidateQueries({
          queryKey: gridQueryKey(brandName),
        })
      },
    })
  }

  /** 清空本列：把该品牌已有报价全部标成「不报价」，随后自动落库。 */
  const clearBrand = (brandName: string) => {
    const cells = byBrandRef.current.cells.get(brandName)
    if (!cells || cells.size === 0) return
    const nextDraft: BrandDraft = { ...(draftsRef.current[brandName] ?? {}) }
    for (const key of cells.keys()) nextDraft[key] = null
    applyDrafts({ ...draftsRef.current, [brandName]: nextDraft })
    scheduleSave(brandName)
  }

  /* ---------------------------------------------------------------- 粘贴与撤销 */

  /**
   * 粘贴锚点：哪一张类别表（category）+ 第几列（品牌 × 定尺）+ 哪一行。
   * 拆表后同一页有多张 Table，锚点必须带上类别才能定位回落点。
   */
  const anchorRef = useRef<{
    category: string
    columnIndex: number
    rowKey: string
  } | null>(null)

  /**
   * 从 Excel 粘贴：以当前格为左上角，**向下填规格、向右填「品牌 × 定尺」列**。
   *
   * <p>这是真实录入方式（供应商发来一张表，一次贴一列或一块），所以必须保留；
   * 落点按当前可见行计算，粘贴后按受影响品牌排队自动保存。落在商品资料不存在的
   * 组合（行 × 定尺）上时丢弃该格，不写脏数据。</p>
   */
  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!canUpdate) return
    const anchor = anchorRef.current
    if (!anchor) return
    const text = event.clipboardData.getData('text/plain')
    if (!text) return
    const matrix = parseClipboardGrid(text)
    if (!matrix.length) return
    const group = categoryGroups.find(
      (candidate) => candidate.categoryName === anchor.category,
    )
    if (!group) return
    const startRow = group.indexBySpec.get(Number(anchor.rowKey)) ?? -1
    const startColumn = anchor.columnIndex
    if (startRow < 0 || startColumn < 0) return
    event.preventDefault()

    const next: Record<string, BrandDraft> = { ...draftsRef.current }
    const touched = new Set<string>()
    let filled = 0
    let dropped = 0
    matrix.forEach((values, rowOffset) => {
      values.forEach((raw, columnOffset) => {
        const row = group.rows[startRow + rowOffset]
        const column = group.cellColumns[startColumn + columnOffset]
        if (!row || !column) {
          dropped += 1
          return
        }
        // 商品资料里没有这个「品牌 + 材质 + 定尺 + 规格」：丢弃该格，不写脏数据
        if (
          !catalogHas(
            group.category,
            column.brandName,
            column.material,
            row.spec,
            column.length,
          )
        ) {
          dropped += 1
          return
        }
        const leaf = leafOfSpec(column, row.spec)
        const key = quoteRowKey(leaf)
        const brandName = column.brandName
        const trimmed = raw.trim()
        if (trimmed === '') {
          next[brandName] = setDraftPrice(next[brandName], key, null)
          touched.add(brandName)
          filled += 1
          return
        }
        const value = Number(trimmed.replace(/[,¥\s]/g, ''))
        if (!Number.isFinite(value)) {
          dropped += 1
          return
        }
        next[brandName] = setDraftPrice(next[brandName], key, roundPrice(value))
        touched.add(brandName)
        filled += 1
      })
    })
    if (!filled) return
    applyDrafts(next)
    for (const brandName of touched) scheduleSave(brandName)
    message.success(
      t('priceCompare.supplierPrice.pasteApplied', { count: filled }),
    )
    if (dropped > 0) {
      message.warning(
        t('priceCompare.supplierPrice.pasteDropped', { count: dropped }),
      )
    }
  }

  /** Ctrl+Z / Ctrl+Y 撤销重做（与逐格输入、粘贴共用同一份草稿历史）。 */
  const guardUndoRedo = (event: ReactKeyboardEvent<HTMLDivElement>) => {
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

  /* ---------------------------------------------------------------- 渲染 */

  const pendingCount = Object.values(drafts).reduce(
    (sum, draft) => sum + draftCount(draft),
    0,
  )

  /**
   * 一张类别表（盘螺 / 直条）的列定义。
   *
   * <p>类别已经由分区标题表达，所以表里不再保留「品牌（类别）」列；定尺子列只取这一张表
   * 用得到的，盘螺表就不会出现 9米/12米 这种永远空着的列。</p>
   */
  /** 品牌列头：品牌名 + 保存状态圆点 + 「清空/移除本列」菜单（列定义与表头两处共用）。 */
  const brandHeaderOf = (brandName: string) => (
    <Flex align="center" gap={4} justify="center">
      <span style={{ whiteSpace: 'nowrap' }}>{brandName}</span>
      {saveState[brandName] === 'saving' ? (
        <span aria-hidden="true" style={dotStyle('#faad14')} />
      ) : null}
      {saveState[brandName] === 'error' ? (
        <Tooltip
          title={t('priceCompare.supplierPrice.saveFailed', {
            names: brandName,
          })}
        >
          <Button
            aria-label={t('priceCompare.supplierPrice.saveFailed', {
              names: brandName,
            })}
            size="small"
            type="text"
            onClick={() => void saveBrand(brandName)}
          >
            <span style={dotStyle('#ff4d4f')} />
          </Button>
        </Tooltip>
      ) : null}
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'clear',
              icon: <DeleteOutlined />,
              label: t('priceCompare.supplierPrice.clearColumn'),
              disabled: !canUpdate,
            },
            {
              key: 'remove',
              danger: true,
              label: t('priceCompare.supplierPrice.removeColumn'),
              disabled: !canDelete,
            },
          ],
          onClick: ({ key }) => {
            if (key === 'clear') clearBrand(brandName)
            if (key === 'remove') removeBrand(brandName)
          },
        }}
      >
        <Button
          aria-label={t('priceCompare.supplierPrice.removeColumnA11y', {
            name: brandName,
          })}
          size="small"
          type="text"
        >
          ⋯
        </Button>
      </Dropdown>
    </Flex>
  )

  /**
   * 一张类别表（盘螺 / 直条）的列定义：行 = 规格，列 = 品牌 → 材质 → 定尺。
   *
   * <p>三级表头都来自商品资料：某个品牌没有的材质、没有的定尺，连列都不出现（见
   * {@link buildBrandCatalog}）。只有一个定尺时（盘螺）不套定尺层，避免每个品牌头顶挂一个「—」。</p>
   */
  const columnsOfCategory = (
    group: (typeof categoryGroups)[number],
  ): ColumnsType<SpecRow> => {
    const columns: ColumnsType<SpecRow> = [
      {
        title: t('priceCompare.supplierPrice.specNo'),
        key: 'spec',
        width: ROW_HEAD_WIDTHS.spec,
        align: 'center',
        fixed: 'left',
        render: (_value, row) => row.spec,
      },
    ]

    for (const brandName of brandNames) {
      const brandCatalog = group.category?.byBrand.get(brandName)
      if (!brandCatalog) continue
      const materialColumns: ColumnsType<SpecRow> = []
      for (const [material, lengths] of brandCatalog.materials) {
        const lengthKeys = [...lengths.keys()].sort(sortLengths)
        const cellOf = (length: string): ColumnsType<SpecRow>[number] => {
          const columnIndex = group.cellColumns.findIndex(
            (column) =>
              column.brandName === brandName &&
              column.material === material &&
              column.length === length,
          )
          const column = group.cellColumns[columnIndex]
          return {
            title: length === '-' ? '—' : length,
            key: `${brandName}\u0000${material}\u0000${length}`,
            width: BRAND_COLUMN_WIDTH,
            // 金额与表头（定尺名）都居中：一列里文字与数字对齐在同一条中轴上
            align: 'center' as const,
            render: (_value: unknown, row: SpecRow) => {
              if (
                !catalogHas(
                  group.category,
                  brandName,
                  material,
                  row.spec,
                  length,
                )
              ) {
                // 商品资料里没有这个「品牌 + 材质 + 定尺 + 规格」：格子都不出现
                return null
              }
              const leaf = leafOfSpec(column, row.spec)
              const key = quoteRowKey(leaf)
              const value = cellValueOfLeaf(brandName, leaf)
              const cheapest = cheapestOfSpec(
                group.category,
                group.cellColumns,
                row.spec,
              )
              const isCheapest =
                value !== null &&
                value > 0 &&
                cheapest?.brandName === brandName &&
                cheapest?.material === material &&
                cheapest?.length === length
              return (
                <InputNumber
                  aria-label={`${brandName} ${material} ${row.spec} ${length}`}
                  className={`supplier-price-sheet-input${isCheapest ? ' supplier-price-cheapest' : ''}`}
                  data-grid-cell={cellKey(columnIndex, key)}
                  controls={false}
                  disabled={!canUpdate}
                  min={0}
                  size="small"
                  style={{ width: '100%' }}
                  value={value}
                  onFocus={() => {
                    anchorRef.current = {
                      category: group.categoryName,
                      columnIndex,
                      rowKey: String(row.spec),
                    }
                  }}
                  onChange={(next) =>
                    updateCell(
                      brandName,
                      key,
                      typeof next === 'number' ? roundPrice(next) : null,
                    )
                  }
                  onKeyDown={(event) => {
                    const move = (delta: number) => {
                      const index = group.indexBySpec.get(row.spec) ?? -1
                      const target = group.rows[index + delta]
                      if (!target) return
                      const targetLeaf = leafOfSpec(column, target.spec)
                      if (
                        !catalogHas(
                          group.category,
                          brandName,
                          material,
                          target.spec,
                          length,
                        )
                      ) {
                        return
                      }
                      const node = document.querySelector<HTMLInputElement>(
                        `input[data-grid-cell="${cellKey(columnIndex, quoteRowKey(targetLeaf))}"]`,
                      )
                      if (!node) return
                      event.preventDefault()
                      node.focus()
                      node.select()
                    }
                    if (event.key === 'ArrowDown' || event.key === 'Enter') {
                      move(1)
                      return
                    }
                    if (event.key === 'ArrowUp') {
                      move(-1)
                      return
                    }
                    if (event.key === 'Escape') event.currentTarget.blur()
                  }}
                />
              )
            },
          }
        }
        if (lengthKeys.length > 1) {
          materialColumns.push({
            title: material,
            key: `${brandName}\u0000${material}`,
            align: 'center',
            children: lengthKeys.map(cellOf),
          })
        } else {
          materialColumns.push({
            ...cellOf(lengthKeys[0] ?? '-'),
            title: material,
            key: `${brandName}\u0000${material}`,
            align: 'center',
          })
        }
      }
      if (materialColumns.length) {
        columns.push({
          title: brandHeaderOf(brandName),
          key: brandName,
          align: 'center',
          children: materialColumns,
        })
      }
    }

    return columns
  }

  /** 还没打开的供应商（「添加」下拉的候选）。 */
  const unopenedSuppliers = suppliers.filter(
    (option) => !openSupplierIds.includes(option.value),
  )

  /*
   * 标签页管理按 antd 规范来：**只有 `editable-card` 类型支持添加与关闭**，
   * 溢出由内置的 `more`（省略号）自动折叠，不用自己算宽度。
   *
   * 「添加」不用 `onEdit('add')` 弹菜单：供应商四十多家，菜单会铺成一整屏（用户已反馈过）。
   * 改成标签栏右侧一个**可搜索的 Select**，输入公司名即时过滤，选中即打开标签。
   */
  const supplierTabs = (
    <Tabs
      activeKey={supplierId}
      hideAdd
      items={openSupplierIds.map((id) => ({
        key: id,
        label: suppliers.find((option) => option.value === id)?.label ?? id,
      }))}
      onChange={switchSupplierTab}
      onEdit={(
        targetKey: React.MouseEvent | React.KeyboardEvent | string,
        action: 'add' | 'remove',
      ) => {
        if (action === 'remove' && typeof targetKey === 'string') {
          closeSupplierTab(targetKey)
        }
      }}
      style={{ width: '100%' }}
      tabBarExtraContent={{
        right: (
          <Select
            aria-label={t('priceCompare.supplierPrice.addSupplierTab')}
            loading={suppliersQuery.isPending}
            notFoundContent={
              unopenedSuppliers.length
                ? undefined
                : t('priceCompare.supplierPrice.allSuppliersOpened')
            }
            onChange={(value: string) => openSupplierTab(value)}
            options={unopenedSuppliers.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            placeholder={t('priceCompare.supplierPrice.addSupplierTab')}
            showSearch={{ optionFilterProp: 'label' }}
            style={{ width: 220 }}
            value={null}
          />
        ),
      }}
      type="editable-card"
    />
  )

  if (!supplierId) {
    return (
      <Flex vertical gap={12} className="supplier-price-page">
        {supplierTabs}
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.pickSupplier')}
        </Typography.Text>
      </Flex>
    )
  }

  return (
    <Flex vertical gap={12} className="supplier-price-page">
      {supplierTabs}
      <Flex align="center" gap={8} wrap>
        <Tooltip title={t('priceCompare.supplierPrice.quotedOnHint')}>
          <DatePicker
            allowClear={false}
            aria-label={t('priceCompare.supplierPrice.quotedOn')}
            style={{ width: 156 }}
            value={quotedOn}
            onChange={(value) => value && setQuotedOn(value)}
          />
        </Tooltip>
        <Button
          aria-label={t('priceCompare.supplierPrice.undo')}
          disabled={history.past.length === 0}
          icon={<UndoOutlined />}
          onClick={undo}
          title={t('priceCompare.supplierPrice.undo')}
        />
        <Button
          aria-label={t('priceCompare.supplierPrice.redo')}
          disabled={history.future.length === 0}
          icon={<RedoOutlined />}
          onClick={redo}
          title={t('priceCompare.supplierPrice.redo')}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => {
            for (const brandName of brandNames) {
              void queryClient.invalidateQueries({
                queryKey: gridQueryKey(brandName),
              })
            }
          }}
        >
          {t('priceCompare.supplierPrice.refresh')}
        </Button>
      </Flex>

      <Flex align="center" gap={8} wrap>
        <Input
          allowClear
          aria-label={t('priceCompare.supplierPrice.searchSpecs')}
          placeholder={t('priceCompare.supplierPrice.searchSpecs')}
          prefix={<SearchOutlined />}
          style={{ width: 260 }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Checkbox
          checked={onlyUnpriced}
          onChange={(event) => setOnlyUnpriced(event.target.checked)}
        >
          {t('priceCompare.supplierPrice.onlyUnpriced')}
        </Checkbox>
        {pendingCount > 0 ? (
          <Typography.Text type="secondary">
            {t('priceCompare.supplierPrice.saveAll', { count: pendingCount })}
          </Typography.Text>
        ) : null}
        {!canUpdate ? (
          <Typography.Text type="warning">
            {t('priceCompare.supplierPrice.readOnlyHint')}
          </Typography.Text>
        ) : null}
      </Flex>

      {restoredDrafts ? (
        <Alert
          showIcon
          action={
            <Button size="small" onClick={discardRestoredDrafts}>
              {t('priceCompare.supplierPrice.discardDrafts')}
            </Button>
          }
          title={t('priceCompare.supplierPrice.draftsRestored')}
          type="warning"
        />
      ) : null}

      {brandNames.length === 0 ? (
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.noBrands')}
        </Typography.Text>
      ) : specsQuery.isError ? (
        <Flex align="center" gap={8}>
          <Typography.Text type="danger">
            {t('priceCompare.supplierPrice.specsLoadFailed')}
          </Typography.Text>
          <Button size="small" onClick={() => void specsQuery.refetch()}>
            {t('priceCompare.supplierPrice.retry')}
          </Button>
        </Flex>
      ) : categoryGroups.every((group) => group.rows.length === 0) ? (
        <Empty description={t('priceCompare.supplierPrice.empty')} />
      ) : (
        /*
         * 必须套上 `supplier-price-sheet` 这两层：紧凑行高、单元格内边距、框线颜色、
         * 输入框高度全部写在那套 CSS 里（行高 = 字号 × 1.8，约 25px）。重做工作台时
         * 漏了这几个类名，表格退回 antd 默认内边距 —— 行高翻倍、列被容器拉宽，
         * 一屏只能看到二十来行，就是「不像 Excel」的直接原因。
         */
        <div
          className="supplier-price-sheet supplier-price-sheet-shell supplier-price-board"
          onKeyDownCapture={guardUndoRedo}
          onPaste={handlePaste}
        >
          <div className="supplier-price-sheet-body">
            {categoryGroups.map((group) => (
              <div
                className="supplier-price-sheet-category"
                key={group.categoryName}
              >
                <Typography.Text className="supplier-price-transposed-category">
                  {group.categoryName}
                </Typography.Text>
                <Table<SpecRow>
                  bordered
                  columns={columnsOfCategory(group)}
                  dataSource={group.rows}
                  pagination={false}
                  rowKey={(row) => row.spec}
                  /*
                   * 列少时**不给 scroll.x**：给了固定宽度，表格就只占那么多，右侧留一大片
                   * 页面空白（用户反馈的「最右边还是空行」就是它）。不给则表格宽度 100%，
                   * 多出来的宽度按比例摊到各列，正好铺满内容区。
                   * 列多到装不下时（>12 列）才给固定宽度，让表体内部横向滚动。
                   */
                  scroll={
                    group.cellColumns.length > 12
                      ? {
                          x:
                            ROW_HEAD_WIDTHS.spec +
                            group.cellColumns.length * BRAND_COLUMN_WIDTH,
                        }
                      : undefined
                  }
                  size="small"
                  tableLayout="fixed"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <Typography.Text type="secondary">
        {t('priceCompare.supplierPrice.entryHint')}
      </Typography.Text>
    </Flex>
  )
}
