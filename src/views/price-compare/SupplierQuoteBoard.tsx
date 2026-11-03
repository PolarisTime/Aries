import {
  DeleteOutlined,
  PlusOutlined,
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
  Table,
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
import { useMaterialBrands } from '@/hooks/useMaterialBrands'
import { useHasPermission } from '@/hooks/usePermission'
import { message, modal } from '@/utils/antd-app'
import {
  type BrandDraft,
  buildColumnSavePlan,
  draftCount,
  draftPrice,
  mergeQuoteRows,
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
const CHEAPEST_COLUMN_WIDTH = 104

/** 表格行的键（不含定尺）：定尺已经是列，行只区分 类别+材质+规格。 */
const matrixKeyOf = (row: QuoteRow) =>
  `${row.category}|${row.material}|${row.spec}`

/** 行 + 定尺 → 真正的商品组合（保存载荷的键就是它）。 */
const leafOf = (row: QuoteRow, length: string): QuoteRow => ({
  category: row.category,
  material: row.material,
  spec: row.spec,
  length,
})

/** 单元格定位键：列下标 + 商品组合键（列下标已包含品牌与定尺）。 */
const cellKey = (columnIndex: number, leafKey: string) =>
  `${columnIndex}\u0000${leafKey}`

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
  const materialBrands = useMaterialBrands()
  const canUpdate = useHasPermission('supplier-price-lists:update')
  const canDelete = useHasPermission('supplier-price-lists:delete')

  const [pickedSupplierId, setPickedSupplierId] = useState<string>()
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

  /*
   * 只选了一个供应商时直接进入，少一步点击（「傻瓜式」的第一条：别让人先做无意义的选择）。
   * 用派生值而不是 effect 里 setState：少一轮渲染，也不会踩「effect 里同步状态」的问题。
   */
  const supplierId =
    pickedSupplierId ??
    (suppliers.length === 1 ? suppliers[0].value : undefined)

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
   * 需要查询价格表的候选品牌 = 经营品牌 ∪ 商品品牌全集 ∪ 本次会话新建的列。
   *
   * <p><b>为什么必须含「商品品牌全集」</b>：供应商的经营品牌被改小过、或历史上先有价格表、
   * 后补主数据时，库里会存在「不在经营品牌里、但确实有报价」的品牌。只按经营品牌取数会让这些
   * 历史价格在界面彻底消失（数据还在库中，却没有任何入口能看到、维护它）。
   * 曾经专门有一条测试锁这个行为，重做工作台时被裁掉过，2026-11-03 按真实数据复现后补回：
   * 实测某供应商经营品牌为「武钢汉钢/萍钢/铜陵富鑫」，但库里有「中天」「万泰」两张价格表
   * （万泰含 2 条价格）。</p>
   */
  const candidateBrands = useMemo(() => {
    const extra = Object.keys(columns)
    return [
      ...new Set(
        [...declaredBrands, ...materialBrands, ...extra].filter(Boolean),
      ),
    ]
  }, [columns, declaredBrands, materialBrands])

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

  /**
   * 实际展示的品牌列 = 经营品牌 ∪ 本次新建的列 ∪ **库里已有价格表的品牌**。
   *
   * <p>前两类是「用户要报的品牌」（即使还没建列也必须显示，否则没地方输入）；
   * 最后一类是「历史价格不能被藏起来」的保证：不在经营品牌里、但只要库里有列就照常成列，
   * 用户能看见也能继续维护它。</p>
   */
  const brandNames = useMemo(() => {
    const declared = new Set(declaredBrands)
    const created = new Set(Object.keys(columns))
    return candidateBrands.filter(
      (brandName) =>
        declared.has(brandName) ||
        created.has(brandName) ||
        columnOf(brandName) !== null,
    )
  }, [candidateBrands, columnOf, columns, declaredBrands])

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
    () => mergeQuoteRows(specsQuery.data ?? []),
    [specsQuery.data],
  )

  /**
   * 表格行 = 「类别 + 材质 + 规格」；**定尺不再占行**，而是每个品牌下的独立列。
   *
   * <p>原来一行 = 一个 (材质, 规格, 定尺) 组合，于是同一个规格会拆成「9米」「12米」两行，
   * 行数翻倍、一屏看不出对比。现在 9米/12米 抽成列：一个规格一行，横着看就是一张
   * Excel 报价单（行 = 规格，列 = 品牌 × 定尺）。</p>
   */
  const matrixRows = useMemo(() => {
    const seen = new Map<string, QuoteRow>()
    for (const row of allRows) {
      const key = `${row.category}|${row.material}|${row.spec}`
      if (!seen.has(key)) seen.set(key, row)
    }
    return [...seen.values()]
  }, [allRows])

  /** 存在的商品组合（含定尺）：表格里没有的组合留空、不给输入框。 */
  const comboKeys = useMemo(
    () => new Set(allRows.map((row) => quoteRowKey(row))),
    [allRows],
  )

  /**
   * 定尺列：取商品资料里出现过的定尺，按「9米 → 12米 → 其它 → 不分定尺(-)」排序。
   *
   * <p>盘螺没有定尺（值为 {@code '-'}），排在最后并显示为「—」，这样直条与盘螺共用一张表
   * 也不会把「不分定尺」挤到最左边。</p>
   */
  const lengths = useMemo(() => {
    const set = new Set(allRows.map((row) => row.length))
    return [...set].sort((left, right) => {
      if (left === right) return 0
      if (left === '-') return 1
      if (right === '-') return -1
      const leftMeters = Number.parseInt(left, 10)
      const rightMeters = Number.parseInt(right, 10)
      if (Number.isFinite(leftMeters) && Number.isFinite(rightMeters)) {
        return leftMeters - rightMeters
      }
      return left.localeCompare(right)
    })
  }, [allRows])
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
   * 行级「最低价」：在该行所有 品牌 × 定尺 的有效格子里取最低。
   *
   * <p>定尺变成列之后，一行可能有多个可比价格（中天9米 3280 / 中天12米 3320 / 萍钢9米 3270），
   * 「本行最低」必须跨定尺比较，否则会漏掉更便宜的另一个定尺。</p>
   */
  const cheapestOfRow = (
    row: QuoteRow,
  ): { brandName: string; length: string; price: number } | undefined => {
    let cheapest:
      | { brandName: string; length: string; price: number }
      | undefined
    for (const brandName of brandNames) {
      for (const length of lengths) {
        const leaf = leafOf(row, length)
        if (!comboKeys.has(quoteRowKey(leaf))) continue
        const price = cellValueOfLeaf(brandName, leaf)
        if (price === null || price <= 0) continue
        if (!cheapest || price < cheapest.price) {
          cheapest = { brandName, length, price }
        }
      }
    }
    return cheapest
  }

  const displayRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    let list = matrixRows
    if (needle) {
      list = list.filter((row) =>
        `${row.category} ${row.material} ${row.spec} ${row.length}`
          .toLowerCase()
          .includes(needle),
      )
    }
    if (onlyUnpriced) {
      /*
       * 「未填」= 该行所有（品牌 × 定尺）有效格子都还没有值，按**已落库/已保存**判断，
       * 不看本次草稿：否则边敲边消失，录入被打断。
       */
      list = list.filter((row) =>
        brandNames.every((brandName) =>
          lengths.every((length) => {
            const leaf = leafOf(row, length)
            const key = quoteRowKey(leaf)
            if (!comboKeys.has(key)) return true
            const price =
              savedValues[brandName]?.[key] ?? serverPriceOf(brandName, key)
            return price === undefined || price === null
          }),
        ),
      )
    }
    return list
  }, [
    brandNames,
    comboKeys,
    keyword,
    lengths,
    matrixRows,
    onlyUnpriced,
    savedValues,
    serverPriceOf,
  ])

  /**
   * 按类别拆表：盘螺一张、直条一张。
   *
   * <p>两类商品的定尺完全不同 —— 盘螺不分定尺（值为 {@code '-'}），直条分 9米/12米。
   * 混在一张表里时，每行都会出现一半用不上的定尺格子（盘螺行在 9米/12米 上永远空着），
   * 而且表头宽度按两类定尺的并集算，横着滚很远。拆开后每张表只保留自己用得到的定尺列。</p>
   *
   * <p>表格顺序沿用 `CATEGORY_ORDER`（盘螺在前、直条在后），与报价单习惯一致。</p>
   */
  const categoryGroups = useMemo(() => {
    const order: string[] = []
    const byCategory = new Map<string, QuoteRow[]>()
    for (const row of displayRows) {
      const list = byCategory.get(row.category)
      if (list) {
        list.push(row)
        continue
      }
      byCategory.set(row.category, [row])
      order.push(row.category)
    }
    return order.map((category) => {
      const rows = byCategory.get(category) ?? []
      // 只保留这张表真正用得到的定尺；顺序沿用全局定尺顺序
      const categoryLengths = lengths.filter((length) =>
        rows.some((row) => comboKeys.has(quoteRowKey(leafOf(row, length)))),
      )
      const indexByKey = new Map<string, number>()
      for (const [index, row] of rows.entries()) {
        indexByKey.set(matrixKeyOf(row), index)
      }
      return {
        category,
        rows,
        indexByKey,
        lengths: categoryLengths,
        /** 该表的列顺序：品牌 × 定尺（粘贴按列下标落格、↑↓ 在同一列内移动）。 */
        cellColumns: brandNames.flatMap((brandName) =>
          categoryLengths.map((length) => ({ brandName, length })),
        ),
      }
    })
  }, [brandNames, comboKeys, displayRows, lengths])

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

  const changeSupplier = (nextSupplierId: string) => {
    const applyChange = () => {
      setPickedSupplierId(nextSupplierId)
      commitDrafts({})
      setHistory(EMPTY_HISTORY)
      setSavedValues({})
      setColumns({})
      setSaveState({})
      setKeyword('')
      setOnlyUnpriced(false)
    }
    if (Object.keys(drafts).length === 0) {
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

  /** 加一个品牌列：给这家供应商建一条 (供应商, 品牌) 价格表。 */
  const addBrand = async (brandName: string) => {
    const currentSupplierId = supplierIdRef.current
    if (!currentSupplierId) return
    try {
      const column = await addSupplierPriceColumn({
        brandName,
        supplierId: currentSupplierId,
        quotedOn: quotedOnRef.current.format('YYYY-MM-DD'),
      })
      setColumns((current) => ({ ...current, [brandName]: column }))
      await queryClient.invalidateQueries({ queryKey: gridQueryKey(brandName) })
    } catch {
      message.error(
        t('priceCompare.supplierPrice.saveFailed', { names: brandName }),
      )
    }
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
      (candidate) => candidate.category === anchor.category,
    )
    if (!group) return
    const startRow = group.indexByKey.get(anchor.rowKey) ?? -1
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
        const leaf = leafOf(row, column.length)
        const key = quoteRowKey(leaf)
        if (!comboKeys.has(key)) {
          dropped += 1
          return
        }
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

  const brandColumnOptions = useMemo(() => {
    const selected = new Set(brandNames)
    return materialBrands
      .filter((brand) => !selected.has(brand))
      .map((brand) => ({ key: brand, label: brand }))
  }, [brandNames, materialBrands])

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

  const columnsOfCategory = (
    group: (typeof categoryGroups)[number],
  ): ColumnsType<QuoteRow> => [
    {
      title: t('priceCompare.supplierPrice.material'),
      key: 'material',
      width: ROW_HEAD_WIDTHS.material,
      fixed: 'left',
      render: (_value, row) => row.material,
    },
    {
      title: t('priceCompare.supplierPrice.specNo'),
      key: 'spec',
      width: ROW_HEAD_WIDTHS.spec,
      align: 'center',
      fixed: 'left',
      render: (_value, row) => row.spec,
    },
    ...brandNames.map<ColumnsType<QuoteRow>[number]>((brandName) => {
      /*
       * 品牌表头：品牌名 + 保存状态圆点 + 「清空/移除本列」菜单。
       * 这张表只有一个定尺时（盘螺不分定尺）不套子表头，直接把品牌当列头。
       */
      const headerTitle = brandHeaderOf(brandName)

      const cellOf = (length: string): ColumnsType<QuoteRow>[number] => ({
        title: length === '-' ? '—' : length,
        key: `${brandName}\u0000${length}`,
        width: BRAND_COLUMN_WIDTH,
        align: 'right' as const,
        render: (_value: unknown, row: QuoteRow) => {
          const leaf = leafOf(row, length)
          const key = quoteRowKey(leaf)
          // 商品资料里没有这个「材质+规格+定尺」组合：留空，不给输入框
          if (!comboKeys.has(key)) return null
          const value = cellValueOfLeaf(brandName, leaf)
          const cheapest = cheapestOfRow(row)
          const isCheapest =
            value !== null &&
            value > 0 &&
            cheapest?.brandName === brandName &&
            cheapest?.length === length
          const columnIndex = group.cellColumns.findIndex(
            (column) =>
              column.brandName === brandName && column.length === length,
          )
          return (
            <InputNumber
              aria-label={`${brandName} ${row.material} ${row.spec} ${length}`}
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
                  category: group.category,
                  columnIndex,
                  rowKey: matrixKeyOf(row),
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
                  const index = group.indexByKey.get(matrixKeyOf(row)) ?? -1
                  const target = group.rows[index + delta]
                  if (!target) return
                  const targetLeafKey = quoteRowKey(leafOf(target, length))
                  if (!comboKeys.has(targetLeafKey)) return
                  const node = document.querySelector<HTMLInputElement>(
                    `input[data-grid-cell="${cellKey(columnIndex, targetLeafKey)}"]`,
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
      })
      return group.lengths.length > 1
        ? {
            title: headerTitle,
            key: brandName,
            children: group.lengths.map(cellOf),
          }
        : {
            ...cellOf(group.lengths[0] ?? '-'),
            title: headerTitle,
            key: brandName,
          }
    }),
    {
      /*
       * 本行最低价：不再需要表头文案（内容自带「品牌 + 价格」），
       * 也不借用「基价」这类语义不同的既有文案键。
       */
      title: '',
      key: 'cheapest',
      width: CHEAPEST_COLUMN_WIDTH,
      render: (_value, row) => {
        const cheapest = cheapestOfRow(row)
        // 没报价就留空：一列全是「—」只会让人以为页面坏了
        if (!cheapest) return null
        return (
          <span className="supplier-price-cheapest-label">
            {cheapest.brandName}
            {cheapest.length === '-' ? '' : ` ${cheapest.length}`}{' '}
            {cheapest.price}
          </span>
        )
      },
    },
  ]

  const supplierPicker = (
    <Dropdown
      trigger={['click']}
      menu={{
        items: suppliers.map((option) => ({
          key: option.value,
          label: option.label,
        })),
        onClick: ({ key }) => changeSupplier(key),
      }}
    >
      <Button loading={suppliersQuery.isPending} size="large">
        {supplier?.label ?? t('priceCompare.supplierPrice.supplierPlaceholder')}{' '}
        ▾
      </Button>
    </Dropdown>
  )

  if (!supplierId) {
    return (
      <Flex vertical gap={12} className="supplier-price-page">
        <Flex align="center" gap={8} wrap>
          <Typography.Text strong>
            {t('priceCompare.supplierPrice.supplier')}
          </Typography.Text>
          {supplierPicker}
        </Flex>
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.pickSupplier')}
        </Typography.Text>
      </Flex>
    )
  }

  return (
    <Flex vertical gap={12} className="supplier-price-page">
      <Flex align="center" gap={8} wrap>
        <Typography.Text strong>
          {t('priceCompare.supplierPrice.supplier')}
        </Typography.Text>
        {supplierPicker}
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
        <Dropdown
          disabled={!canUpdate || brandColumnOptions.length === 0}
          menu={{
            items: brandColumnOptions,
            onClick: ({ key }) => void addBrand(key),
          }}
          trigger={['click']}
        >
          <Button icon={<PlusOutlined />} style={{ marginInlineStart: 'auto' }}>
            {t('priceCompare.supplierPrice.brand')}
          </Button>
        </Dropdown>
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
      ) : displayRows.length === 0 ? (
        <Empty description={t('priceCompare.supplierPrice.empty')} />
      ) : (
        /*
         * 必须套上 `supplier-price-sheet` 这两层：紧凑行高、单元格内边距、框线颜色、
         * 输入框高度全部写在那套 CSS 里（行高 = 字号 × 1.8，约 25px）。重做工作台时
         * 漏了这几个类名，表格退回 antd 默认内边距 —— 行高翻倍、列被容器拉宽，
         * 一屏只能看到二十来行，就是「不像 Excel」的直接原因。
         */
        <div
          className="supplier-price-sheet supplier-price-sheet-shell"
          onKeyDownCapture={guardUndoRedo}
          onPaste={handlePaste}
        >
          <div className="supplier-price-sheet-body">
            {categoryGroups.map((group) => (
              <div
                className="supplier-price-sheet-category"
                key={group.category}
              >
                <Typography.Text className="supplier-price-transposed-category">
                  {group.category}
                </Typography.Text>
                <Table<QuoteRow>
                  bordered
                  columns={columnsOfCategory(group)}
                  dataSource={group.rows}
                  pagination={false}
                  rowKey={(row) => matrixKeyOf(row)}
                  scroll={{
                    x:
                      ROW_HEAD_WIDTHS.material +
                      ROW_HEAD_WIDTHS.spec +
                      group.cellColumns.length * BRAND_COLUMN_WIDTH +
                      CHEAPEST_COLUMN_WIDTH,
                  }}
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
