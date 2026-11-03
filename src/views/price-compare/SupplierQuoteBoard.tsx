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
import { gridQueryKey } from './supplier-quote-view-prefs'
import './supplier-price.css'

/** 一列的保存状态：安静地告诉用户「存了没」，不需要点保存按钮。 */
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** 自动保存的防抖时长：打字停顿这么久就落库。 */
const AUTOSAVE_DELAY_MS = 800

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
   * 品牌列 = 供应商资料里维护的「经营品牌」。
   *
   * <p>品牌来自主数据，报价页不自己发明；「加品牌」本质上也是给这家供应商建一条
   * (供应商, 品牌) 价格表，仍以主数据为最后口径。</p>
   */
  const brandNames = useMemo(() => {
    const declared = (supplier?.brands ?? []).map((name) => name.trim())
    const extra = Object.keys(columns)
    return [...new Set([...declared, ...extra].filter(Boolean))]
  }, [columns, supplier?.brands])

  const gridQueries = useQueries({
    queries: supplierId
      ? brandNames.map((brandName) => ({
          queryKey: gridQueryKey(brandName),
          queryFn: ({ signal }: { signal: AbortSignal }) =>
            fetchSupplierPriceGrid(brandName, signal),
          staleTime: 0,
        }))
      : [],
  })

  /** 品牌 → 网格 / 该供应商的列 / 服务端价格。三张表一次算好，避免每格都重算一遍。 */
  const byBrand = useMemo(() => {
    const grids = new Map<string, SupplierPriceGrid | undefined>()
    const columnMap = new Map<string, SupplierPriceColumn | null>()
    const cellMap = new Map<string, Map<string, ServerCell>>()
    brandNames.forEach((brandName, index) => {
      const grid = gridQueries[index]?.data
      const column =
        columns[brandName] ??
        grid?.columns.find((item) => item.supplierId === supplierId) ??
        null
      grids.set(brandName, grid)
      columnMap.set(brandName, column)
      cellMap.set(brandName, serverCellsOf(grid, column))
    })
    return { grids, columns: columnMap, cells: cellMap }
  }, [brandNames, columns, gridQueries, supplierId])

  const byBrandRef = useRef(byBrand)

  useEffect(() => {
    byBrandRef.current = byBrand
  }, [byBrand])

  /** 商品的全部行（只来自商品资料）——保存载荷必须用它，不能用过滤后的行。 */
  const allRows = useMemo(
    () => mergeQuoteRows(specsQuery.data ?? []),
    [specsQuery.data],
  )
  const allRowsRef = useRef(allRows)

  useEffect(() => {
    allRowsRef.current = allRows
  }, [allRows])

  const serverPriceOf = useCallback(
    (brandName: string, key: string) =>
      byBrand.cells.get(brandName)?.get(key)?.price,
    [byBrand],
  )

  const cellValue = (brandName: string, row: QuoteRow): number | null => {
    const key = quoteRowKey(row)
    return draftPrice(
      drafts[brandName],
      key,
      savedValues[brandName]?.[key] ?? serverPriceOf(brandName, key),
    )
  }

  /** 行级「最低价品牌」：报价时最关心的一句话。 */
  const cheapestOfRow = (
    row: QuoteRow,
  ): { brandName: string; price: number } | undefined => {
    let cheapest: { brandName: string; price: number } | undefined
    for (const brandName of brandNames) {
      const price = cellValue(brandName, row)
      if (price === null || price <= 0) continue
      if (!cheapest || price < cheapest.price) {
        cheapest = { brandName, price }
      }
    }
    return cheapest
  }

  const displayRows = useMemo(() => {
    const needle = keyword.trim().toLowerCase()
    let list = allRows
    if (needle) {
      list = list.filter((row) =>
        `${row.category} ${row.material} ${row.spec} ${row.length}`
          .toLowerCase()
          .includes(needle),
      )
    }
    if (onlyUnpriced) {
      /*
       * 「未填」按**已落库/已保存**判断，不看本次草稿：否则边敲边消失，录入被打断。
       */
      list = list.filter((row) => {
        const key = quoteRowKey(row)
        return brandNames.every((brandName) => {
          const price =
            savedValues[brandName]?.[key] ?? serverPriceOf(brandName, key)
          return price === undefined || price === null
        })
      })
    }
    return list
  }, [allRows, brandNames, keyword, onlyUnpriced, savedValues, serverPriceOf])

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

  const commitDrafts = (next: Record<string, BrandDraft>) => {
    draftsRef.current = next
    setDrafts(next)
  }

  const applyDrafts = (next: Record<string, BrandDraft>) => {
    setHistory((current) => pushHistory(current, draftsRef.current))
    commitDrafts(next)
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

  const anchorRef = useRef<{ brandName: string; rowKey: string } | null>(null)

  /**
   * 从 Excel 粘贴：以当前格为左上角，**向下填规格、向右填品牌列**。
   *
   * <p>这是真实录入方式（供应商发来一张表，一次贴一列或一块），所以必须保留；
   * 落点按当前可见行计算，粘贴后按受影响品牌排队自动保存。</p>
   */
  const handlePaste = (event: ReactClipboardEvent<HTMLDivElement>) => {
    if (!canUpdate) return
    const anchor = anchorRef.current
    if (!anchor) return
    const text = event.clipboardData.getData('text/plain')
    if (!text) return
    const matrix = parseClipboardGrid(text)
    if (!matrix.length) return
    const startRow = displayRows.findIndex(
      (row) => quoteRowKey(row) === anchor.rowKey,
    )
    const startBrand = brandNames.indexOf(anchor.brandName)
    if (startRow < 0 || startBrand < 0) return
    event.preventDefault()

    const next: Record<string, BrandDraft> = { ...draftsRef.current }
    const touched = new Set<string>()
    let filled = 0
    let dropped = 0
    matrix.forEach((values, rowOffset) => {
      values.forEach((raw, columnOffset) => {
        const row = displayRows[startRow + rowOffset]
        const brandName = brandNames[startBrand + columnOffset]
        if (!row || !brandName) {
          dropped += 1
          return
        }
        const key = quoteRowKey(row)
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

  const cellKey = (brandName: string, rowKey: string) =>
    `${brandName}\u0000${rowKey}`

  /** 行键 → 可见行下标：↑/↓ 移动时直接查表，不在每格做一次 indexOf。 */
  const rowIndexByKey = useMemo(() => {
    const map = new Map<string, number>()
    displayRows.forEach((row, index) => {
      map.set(quoteRowKey(row), index)
    })
    return map
  }, [displayRows])

  const columnsOfTable: ColumnsType<QuoteRow> = [
    {
      title: t('priceCompare.supplierPrice.material'),
      key: 'material',
      width: 104,
      fixed: 'left',
      render: (_value, row) => row.material,
    },
    {
      title: t('priceCompare.supplierPrice.specNo'),
      key: 'spec',
      width: 72,
      align: 'center',
      fixed: 'left',
      render: (_value, row) => row.spec,
    },
    {
      title: t('priceCompare.supplierPrice.length'),
      key: 'length',
      width: 80,
      align: 'center',
      render: (_value, row) => (row.length === '-' ? '—' : row.length),
    },
    {
      title: t('priceCompare.supplierPrice.brand'),
      key: 'category',
      width: 80,
      align: 'center',
      render: (_value, row) => row.category,
    },
    ...brandNames.map<ColumnsType<QuoteRow>[number]>((brandName) => ({
      title: (
        <Flex align="center" gap={4} justify="center">
          <span>{brandName}</span>
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
      ),
      key: brandName,
      width: 136,
      align: 'right' as const,
      render: (_value: unknown, row: QuoteRow) => {
        const key = quoteRowKey(row)
        const value = cellValue(brandName, row)
        const cheapest = cheapestOfRow(row)
        const isCheapest =
          value !== null && value > 0 && cheapest?.brandName === brandName
        return (
          <InputNumber
            aria-label={`${brandName} ${row.material} ${row.spec} ${row.length}`}
            className={`supplier-price-sheet-input${isCheapest ? ' supplier-price-cheapest' : ''}`}
            data-grid-cell={cellKey(brandName, key)}
            controls={false}
            disabled={!canUpdate}
            min={0}
            size="small"
            style={{ width: '100%' }}
            value={value}
            onFocus={() => {
              anchorRef.current = { brandName, rowKey: key }
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
                const index = rowIndexByKey.get(quoteRowKey(row)) ?? -1
                const target = displayRows[index + delta]
                if (!target) return
                const node = document.querySelector<HTMLInputElement>(
                  `input[data-grid-cell="${cellKey(brandName, quoteRowKey(target))}"]`,
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
    })),
    {
      title: t('priceCompare.supplierPrice.basePriceColumn'),
      key: 'cheapest',
      width: 176,
      render: (_value, row) => {
        const cheapest = cheapestOfRow(row)
        if (!cheapest) return <span className="supplier-price-cell-na">—</span>
        return (
          <span>
            {cheapest.brandName} {cheapest.price}
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
        <div onKeyDownCapture={guardUndoRedo} onPaste={handlePaste}>
          <Table<QuoteRow>
            bordered
            columns={columnsOfTable}
            dataSource={displayRows}
            pagination={false}
            rowKey={(row) => quoteRowKey(row)}
            scroll={{ x: 104 + 72 + 80 + 80 + brandNames.length * 136 + 176 }}
            size="small"
            sticky
          />
        </div>
      )}

      <Typography.Text type="secondary">
        {t('priceCompare.supplierPrice.entryHint')}
      </Typography.Text>
    </Flex>
  )
}
