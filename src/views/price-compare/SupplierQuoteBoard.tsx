import {
  DeleteOutlined,
  EllipsisOutlined,
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
  Modal,
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
  type ChangeEvent as ReactChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
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
import { ColumnResizeHandle } from './supplier-quote-column-resize'
import {
  type ColumnWidthPrefs,
  columnKeyOf,
  readColumnWidths,
  resetColumnWidth,
  setColumnWidth,
  sheetKeyOf,
  widthOf,
  writeColumnWidths,
} from './supplier-quote-column-widths'
import {
  type DraftHistory,
  EMPTY_HISTORY,
  pushHistory,
  redoDrafts,
  undoDrafts,
} from './supplier-quote-edits'
import {
  evaluatePriceFormula,
  type FormulaFailureReason,
  isPlainPriceText,
} from './supplier-quote-formula'
import { parseClipboardGrid, roundPrice } from './supplier-quote-grid'
import {
  abnormalRatioPercent,
  isAbnormalPrice,
  rowPriceStats,
} from './supplier-quote-price'
import {
  boundsContain,
  buildClearPlan,
  buildFillPlan,
  extendSelection,
  type GridAddress,
  type GridCellValue,
  type GridLookup,
  type GridSelection,
  listSelectionCells,
  nextCell,
  type SelectionBounds,
  selectionBounds,
  selectSingle,
} from './supplier-quote-selection'
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
/*
 * 价格列宽 = 刚好装下 4 位数字。
 * 14px 字宽约 7px/位 → 4 位 ≈ 28px，加输入框左右内边距（0.25em×2）与单元格内边距（0.3em×2）
 * 约 16px，再留一点余量：64px。**不要给得更宽**：价格列一宽，整表就被拉得很散，
 * 一屏看不下几列；四位数（几万块一吨）已经覆盖实际报价。
 */
const BRAND_COLUMN_WIDTH = 64
/* 单定尺（盘螺）时品牌表头直接坐在价格列上，64px 放不下「武钢汉钢」+ ⋯，列宽单独放宽。 */
const BRAND_FLAT_COLUMN_WIDTH = 96

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
const PREFERRED_CATEGORY_ORDER = ['直条', '盘螺']

/** 一个价格列 = 类别 + 品牌 + 材质 + 定尺；材质与定尺都已经进了表头。 */
type CellColumn = {
  category: string
  brandName: string
  material: string
  length: string
}

/**
 * 单元格定位键：列下标 + 商品组合键（列下标已包含品牌、材质与定尺）。
 *
 * <p>分隔符用 `~` 而不是 NUL（`\u0000`）：这个键会拼进
 * `input[data-grid-cell="..."]` 作为 CSS 选择器，而含 NUL 的属性选择器是**非法选择器** ——
 * `document.querySelector` 会直接抛 `SyntaxError`，上下方向键的移动因此整体失效
 * （异常被吞在事件回调里，看起来只是"按键没反应"）。`~` 在引号内的属性值里没有特殊含义。</p>
 */
const cellKey = (columnIndex: number, leafKey: string) =>
  `${columnIndex}~${leafKey}`

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

type SheetCellProps = {
  ariaLabel: string
  /** `data-grid-cell`：Tab / 上下方向键据此定位目标格（列下标 + 商品组合键）。 */
  cellId: string
  className: string
  disabled: boolean
  /** 已提交的价格（null = 空格）。 */
  value: number | null
  /** 批量操作令牌：变化时丢弃本格正在输入的算式文本。 */
  resetToken: number
  onCommit: (next: number | null) => void
  /** 求值一条算式；成功时已提交并返回结果，失败返回 null（提示由调用方负责）。 */
  onSubmitFormula: (text: string) => number | null
  /** 上下移动一格；返回是否真的移动了（决定要不要 preventDefault）。 */
  onMove: (delta: 1 | -1) => boolean
  /** Tab / Shift+Tab；返回是否移动。 */
  onTab: (backward: boolean) => boolean
  onFocusCell: () => void
  onPointerDownCell: (event: ReactPointerEvent<HTMLInputElement>) => void
  onPointerEnterCell: () => void
  /**
   * 悬停/聚焦说明（目前只用于异常价：「高于本行最低价 N%」）。
   *
   * <p>必须由**格子内部**包 Tooltip：Tooltip 要把事件与 ref 挂到真实 DOM 节点上，
   * 而 SheetCell 是个不转发 ref 的函数组件 —— 在外面 `<Tooltip><SheetCell/></Tooltip>`
   * 会把事件挂丢，气泡永远不出现。</p>
   */
  tooltip?: string
}

/**
 * 报价表格子：一个能直接敲算式的文本输入框。
 *
 * <p>为什么不再是 `InputNumber`：Excel 式录入允许敲 `3200+50`、`*1.02` 这类算式，而
 * `InputNumber` 会把非数字字符过掉，运算符根本敲不进去。这里用受控文本，逐键分流：
 * 普通数字立即落草稿（保持「敲完即存」），含运算符的文本等回车再整体求值 —— 否则敲到
 * `3200+` 这种半截算式时会被当成一次改价。</p>
 *
 * <p>本地文本只在「正在输入」时优先于 `value`：失焦、提交、批量操作都会把它丢掉，
 * 于是格子里显示的一定是**已经落草稿的值**，不会留一个看起来已保存的半截算式。</p>
 */
function SheetCell({
  ariaLabel,
  cellId,
  className,
  disabled,
  value,
  resetToken,
  onCommit,
  onSubmitFormula,
  onMove,
  onTab,
  onFocusCell,
  onPointerDownCell,
  onPointerEnterCell,
  tooltip,
}: SheetCellProps) {
  const [text, setText] = useState<string | null>(null)
  const [seenResetToken, setSeenResetToken] = useState(resetToken)
  /**
   * 已经处理过的那段算式文本。
   *
   * <p>Tab / ↑↓ 会先显式收尾，紧接着 `focus()` 又触发一次 blur；若不做这个去重，
   * 同一个错误算式会连弹两次提示、成功时也会重复提交一次。
   */
  const handledTextRef = useRef<string | null>(null)
  /*
   * 批量操作（清空 / 填充 / 批量调价）改的是外面这格的值：本格若还留着半截算式文本，
   * 界面就会显示一个已经不成立的值。用渲染期状态校正（React 文档的
   * "adjusting state when a prop changes" 写法）而不是 effect，免得先画一帧旧文本。
   */
  if (seenResetToken !== resetToken) {
    setSeenResetToken(resetToken)
    setText(null)
    // 文本已清空，commitPendingFormula 会直接返回；「已处理」标记也由下一次输入/聚焦重置
  }

  const display = text ?? (value === null ? '' : String(value))

  const handleChange = (event: ReactChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value
    /*
     * 新一轮输入：清掉上一轮的「已处理」标记。
     *
     * 否则同一格再次敲同样的算式（第一次 +50 已经 Tab 提交过，回头再敲一次 +50）会被
     * 误判成「这段文本处理过了」而静默丢掉 —— 去重只能作用于**一次编辑会话**。
     */
    handledTextRef.current = null
    setText(raw)
    // 含运算符的文本要等离开格子时整体求值；普通数字逐键落草稿
    if (!isPlainPriceText(raw)) return
    const trimmed = raw.trim()
    if (trimmed === '') {
      onCommit(null)
      return
    }
    const parsed = Number(trimmed)
    // `12.`、`.` 这类半成品不提交：等用户把数字敲完
    if (Number.isFinite(parsed)) onCommit(roundPrice(parsed))
  }

  /**
   * 离开格子（blur / Tab / ↑↓）前收尾正在输入的算式。
   *
   * <p>算式不能像普通数字那样逐键落草稿（`3200+` 这种半截串会被当成一次改价），也不能在
   * 离开时静默丢掉 —— 用户敲完 `3200+50` 直接按 Tab 是常见操作。所以离开前统一整体求值：
   * 成功落草稿并把文本换成结果，失败回退到已提交值（提示由 `onSubmitFormula` 负责，
   * 与回车路径共用 `reportFormulaFailure` 的口径）。</p>
   */
  const commitPendingFormula = () => {
    if (text === null || isPlainPriceText(text)) return
    if (handledTextRef.current === text) return
    handledTextRef.current = text
    onSubmitFormula(text)
    setText(null)
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      if (text !== null && !isPlainPriceText(text)) {
        // 算式：整体求值。成功时把文本换成结果，失败时留着让用户就地改
        event.preventDefault()
        if (onSubmitFormula(text) !== null) {
          setText(null)
        } else {
          // 已经提示过一次，离开格子时不再重复报警
          handledTextRef.current = text
        }
        return
      }
      // 普通数字沿用「回车下移一格」
      setText(null)
      if (onMove(1)) event.preventDefault()
      return
    }
    if (event.key === 'ArrowDown') {
      commitPendingFormula()
      if (onMove(1)) event.preventDefault()
      return
    }
    if (event.key === 'ArrowUp') {
      commitPendingFormula()
      if (onMove(-1)) event.preventDefault()
      return
    }
    if (event.key === 'Tab') {
      // Tab 由 nextCell 决定落点（行优先、跳过不存在的格子、不回环）
      commitPendingFormula()
      if (onTab(event.shiftKey)) event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      // 放弃本格正在输入的算式，回到已提交值（与「离开时提交」相对的另一条路径）
      handledTextRef.current = text
      setText(null)
      event.currentTarget.blur()
    }
  }

  const input = (
    <Input
      aria-label={ariaLabel}
      className={className}
      data-editing={text === null ? undefined : 'true'}
      data-grid-cell={cellId}
      disabled={disabled}
      size="small"
      value={display}
      onBlur={() => {
        commitPendingFormula()
        setText(null)
      }}
      onChange={handleChange}
      onFocus={() => {
        // 重新聚焦 = 新一次编辑会话（与 handleChange 同一个理由）
        handledTextRef.current = null
        onFocusCell()
      }}
      onKeyDown={handleKeyDown}
      onPointerDown={onPointerDownCell}
      onPointerEnter={onPointerEnterCell}
    />
  )
  if (!tooltip) return input
  /*
   * `focus` 也触发：异常价目前还靠底色表达（WCAG 1.4.1 不能只用颜色传递信息），
   * 键盘 / 读屏用户 Tab 到这一格时要能读到"高出本行最低价多少"。
   * 与本仓库 TonCell 里短状态标签的气泡保持一致（同样是 `trigger={['hover','focus']}`）。
   */
  return (
    <Tooltip title={tooltip} trigger={['hover', 'focus']}>
      {input}
    </Tooltip>
  )
}

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
  /**
   * 当前选区（Excel 式区域选择）。
   *
   * <p>只记坐标、不记价格；anchor 是按下时的格子，focus 是当前拖到 / Shift 点到的格子。
   * 选区只在同一「类别 + 材质」表内扩展 —— 跨表框选没有意义（行/列下标在两表间不可比）。</p>
   */
  const [selection, setSelection] = useState<GridSelection | null>(null)
  /** 列宽偏好（视图偏好，不落库）：按供应商从 localStorage 读回，调整后写回。 */
  const [columnWidths, setColumnWidths] = useState<ColumnWidthPrefs>({})
  /** 批量调价弹窗。 */
  const [batchOpen, setBatchOpen] = useState(false)
  const [batchText, setBatchText] = useState('')
  /** 批量操作令牌：自增后让所有格子丢掉正在输入的算式文本（见 {@link SheetCell}）。 */
  const [bulkResetToken, setBulkResetToken] = useState(0)

  /** 归一化后的选区矩形；批量清空 / 填充 / 拖拽高亮都读它，避免各处各算一遍。 */
  const selectedBounds = selection ? selectionBounds(selection) : null
  /** 是否正在用指针拖拽框选（pointerdown 打开，window pointerup/cancel 收尾）。 */
  const draggingRef = useRef(false)

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
   * 列宽按供应商记忆：换供应商必须重新读，否则上一家的宽度会被带到下一家的表上
   * （同一个品牌在两家供应商下的列需求不同）。读失败返回空偏好，页面照常打开。
   */
  useEffect(() => {
    setColumnWidths(supplierId ? readColumnWidths(supplierId) : {})
  }, [supplierId])

  /*
   * 拖拽框选只在表格内用 pointerenter 扩展焦点，但指针可能在表格外松开 —— 收尾必须挂在
   * window 上，否则「按下后拖到表外松手」会让之后每次划过的格子都继续扩展选区。
   * pointercancel 覆盖触屏手势被系统抢走的情况。
   */
  useEffect(() => {
    const stopDragging = () => {
      draggingRef.current = false
    }
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    return () => {
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [])

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

  /**
   * 一格当前应显示的价格：草稿优先（含清空）→ 已保存值 → 服务端值。
   *
   * <p>选区批量操作（清空 / 填充 / 批量调价）拿到的只有 `{brandName, rowKey}` 这样的**地址**，
   * 没有 `QuoteRow`，所以以地址为主入口；`cellValueOfLeaf` 只是它的便利包装 ——
   * 「这一格显示多少」与「这一格要清成什么」必须是同一个口径。</p>
   */
  const cellValueAt = (address: GridAddress): number | null =>
    draftPrice(
      drafts[address.brandName],
      address.rowKey,
      savedValues[address.brandName]?.[address.rowKey] ??
        serverPriceOf(address.brandName, address.rowKey),
    )

  const cellValueOfLeaf = (brandName: string, leaf: QuoteRow): number | null =>
    cellValueAt({ brandName, rowKey: quoteRowKey(leaf) })

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
      /*
       * 材质做成二级 tab：每个材质一张表（行 = 规格，列 = 品牌 × 定尺）。
       * 行的范围也只取**该材质**下的组合，避免出现「这一页没有任何可填格子」的行。
       */
      const materialNames: string[] = []
      for (const column of cellColumns) {
        if (!materialNames.includes(column.material)) {
          materialNames.push(column.material)
        }
      }
      const sheets = materialNames.map((material) => {
        const materialColumns = cellColumns.filter(
          (column) => column.material === material,
        )
        const specSet = new Set<number>()
        for (const column of materialColumns) {
          const specsOfColumn =
            category?.byBrand
              .get(column.brandName)
              ?.materials.get(column.material)
              ?.get(column.length) ?? []
          for (const spec of specsOfColumn) specSet.add(spec)
        }
        let specs = [...specSet].sort((left, right) => left - right)
        if (needle) {
          const lengthHit = materialColumns.some((column) =>
            column.length.toLowerCase().includes(needle),
          )
          specs = specs.filter(
            (spec) => lengthHit || String(spec).includes(needle),
          )
        }
        const rows: SpecRow[] = specs.map((spec) => ({ spec }))
        if (onlyUnpriced) {
          rows.splice(
            0,
            rows.length,
            ...rows.filter((row) =>
              materialColumns.every((column) => {
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
        for (const [index, row] of rows.entries()) {
          indexBySpec.set(row.spec, index)
        }
        return { material, rows, indexBySpec, cellColumns: materialColumns }
      })
      return {
        categoryName,
        category,
        sheets,
      }
    })
  }, [brandNames, catalog, keyword, onlyUnpriced, savedValues, serverPriceOf])

  /** 一张类别表 / 一张材质表的类型别名：选区、列宽与批量操作都以它们为单位。 */
  type CategoryGroup = (typeof categoryGroups)[number]
  type CategorySheet = CategoryGroup['sheets'][number]

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

  /** 切到某个供应商前先清空这一屏的临时状态（草稿、历史、搜索、选区、新建列缓存）。 */
  const resetBoardState = () => {
    commitDrafts({})
    setHistory(EMPTY_HISTORY)
    setSavedValues({})
    setColumns({})
    setSaveState({})
    setKeyword('')
    setOnlyUnpriced(false)
    // 选区坐标只对上一家供应商的表有意义
    setSelection(null)
    setBatchOpen(false)
    setBatchText('')
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
      // 少了一列，列下标整体前移：按列下标记的选区失效
      setSelection(null)
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
        // 与其它会改变列集合的操作一致：列少了，选区的列下标不再指向同一批格子
        setSelection(null)
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

  /* ------------------------------------------------------------ Excel 式选区操作 */

  /**
   * 一张表的「(行下标, 列下标) → 可写格子」查表。
   *
   * <p>批量计划（清空 / 填充 / 批量调价）只认坐标，格子是否存在由这里回答：商品资料里没有的
   * 「品牌 + 材质 + 定尺 + 规格」组合连输入框都没有，必须跳过而不是写脏键。</p>
   */
  const lookupOfSheet =
    (group: CategoryGroup, sheet: CategorySheet): GridLookup =>
    (row, col) => {
      const column = sheet.cellColumns[col]
      const specRow = sheet.rows[row]
      if (!column || !specRow) return null
      if (
        !catalogHas(
          group.category,
          column.brandName,
          column.material,
          specRow.spec,
          column.length,
        )
      ) {
        return null
      }
      return {
        brandName: column.brandName,
        rowKey: quoteRowKey(leafOfSpec(column, specRow.spec)),
      }
    }

  /**
   * 一次写入多格：清空 / 填充 / 批量调价共用。
   *
   * <p>合并成**一条**撤销记录（`applyDrafts` 只 push 一次历史），并按受影响品牌排队自动保存 ——
   * 逐格写会让 Ctrl+Z 要按十几次才能回到操作前。</p>
   */
  const applyBulkValues = (cells: readonly GridCellValue[]) => {
    if (!cells.length) return
    const next: Record<string, BrandDraft> = { ...draftsRef.current }
    const touched = new Set<string>()
    for (const cell of cells) {
      next[cell.brandName] = setDraftPrice(
        next[cell.brandName],
        cell.rowKey,
        cell.value,
      )
      touched.add(cell.brandName)
    }
    applyDrafts(next)
    for (const brandName of touched) scheduleSave(brandName)
    // 让格子里正在输入的算式文本失效：值已经被批量操作覆盖掉了
    setBulkResetToken((token) => token + 1)
  }

  /** 选区所在的表；与当前可见表对不上（切表 / 换供应商后的残留）时返回 null。 */
  const selectionTarget = (): {
    group: CategoryGroup
    sheet: CategorySheet
    bounds: SelectionBounds
  } | null => {
    if (!selection) return null
    const group = categoryGroups.find(
      (item) => item.categoryName === selection.category,
    )
    const sheet = group?.sheets.find(
      (item) => item.material === selection.material,
    )
    if (!group || !sheet) return null
    return { group, sheet, bounds: selectionBounds(selection) }
  }

  /**
   * 选区里**真正可写**的格子（商品资料里没有的组合连输入框都没有）。
   *
   * <p>「已选 N 格」、批量按钮的可用状态、Ctrl+D/Ctrl+R 的拦截条件都读它 ——
   * 按矩形面积算会把不存在的格子算进去，于是按钮亮着却什么也做不了。</p>
   */
  const selectionWritableCells = (() => {
    const target = selectionTarget()
    if (!target) return []
    return listSelectionCells({
      bounds: target.bounds,
      lookup: lookupOfSheet(target.group, target.sheet),
    })
  })()
  const selectionWritableCount = selectionWritableCells.length

  /** Delete：清空选区内本来有价的格子（空的不算清空，免得草稿里塞一堆 null）。 */
  const clearSelectedCells = () => {
    const target = selectionTarget()
    if (!canUpdate || !target) return
    const plan = buildClearPlan({
      bounds: target.bounds,
      lookup: lookupOfSheet(target.group, target.sheet),
      valueOf: cellValueAt,
    })
    if (!plan.cells.length) {
      message.info(t('priceCompare.supplierPrice.clearNothing'))
      return
    }
    applyBulkValues(plan.cells)
    message.success(
      t('priceCompare.supplierPrice.clearApplied', {
        count: plan.cells.length,
      }),
    )
  }

  /** Ctrl+D / Ctrl+R：把选区首行向下 / 首列向右填满。 */
  const fillSelectedCells = (mode: 'down' | 'right') => {
    const target = selectionTarget()
    if (!canUpdate || !target) return
    const plan = buildFillPlan({
      bounds: target.bounds,
      mode,
      lookup: lookupOfSheet(target.group, target.sheet),
      valueOf: cellValueAt,
    })
    if (plan.cells.length) {
      applyBulkValues(plan.cells)
      message.success(
        t('priceCompare.supplierPrice.fillApplied', {
          count: plan.cells.length,
        }),
      )
    }
    // 0 格时不出提示：界面上按钮/快捷键都要求选区 >1 格，走到这里说明目标格全都不存在，
    // 下面的 skipped 警告已经如实说明；再报一句「已填充 0 格」只是噪声。
    if (plan.skipped > 0) {
      message.warning(
        t('priceCompare.supplierPrice.fillSkipped', { count: plan.skipped }),
      )
    }
  }

  /**
   * 算式失败的原因 → 提示文案。
   *
   * <p>「除以 0」与「语法错误」要分开报：一个能改（换个除数）、一个只能重敲；
   * 「没有基价」也不是算式写错，而是这一格还没有价格可作基准。</p>
   */
  const reportFormulaFailure = (failure: {
    reason: FormulaFailureReason | 'invalid'
    text: string
  }) => {
    if (failure.reason === 'no-base') {
      message.warning(t('priceCompare.supplierPrice.formulaNoBase'))
      return
    }
    if (failure.reason === 'divide-by-zero') {
      message.warning(t('priceCompare.supplierPrice.formulaDivideByZero'))
      return
    }
    if (failure.reason === 'negative') {
      message.warning(t('priceCompare.supplierPrice.formulaNegative'))
      return
    }
    message.warning(
      t('priceCompare.supplierPrice.formulaInvalid', { text: failure.text }),
    )
  }

  /** 格子里回车：求值一条算式并落草稿；成功返回结果，失败返回 null（提示已弹出）。 */
  const applyCellFormula = (
    brandName: string,
    rowKey: string,
    text: string,
  ): number | null => {
    const result = evaluatePriceFormula(text, {
      base: cellValueAt({ brandName, rowKey }),
    })
    if (!result.ok) {
      reportFormulaFailure({ reason: result.reason, text })
      return null
    }
    const value = roundPrice(result.value)
    updateCell(brandName, rowKey, value)
    return value
  }

  /** 批量调价：逐格求值后一次落草稿；任何一格不合法都保持弹窗打开让用户改。 */
  const applyBatchAdjust = () => {
    const target = selectionTarget()
    if (!canUpdate || !target) return
    const text = batchText.trim()
    if (!text) {
      // 空输入不是「什么都不发生」：确认按钮已禁用，但回车仍会走到这里。
      // 复用 batchAdjustHint 提示可填什么，不静默返回。
      message.info(t('priceCompare.supplierPrice.batchAdjustHint'))
      return
    }
    // 以运算符开头 = 在该格当前值上调整；否则整块设为该价
    const relative = /^[+\-*/]/.test(text)
    const absolute = Number(text.replace(/^=/, '').replace(/[,¥￥\s]/g, ''))
    if (!relative && !Number.isFinite(absolute)) {
      reportFormulaFailure({ reason: 'invalid', text })
      return
    }
    const cells = listSelectionCells({
      bounds: target.bounds,
      lookup: lookupOfSheet(target.group, target.sheet),
    })
    const next: GridCellValue[] = []
    for (const cell of cells) {
      const current = cellValueAt(cell.address)
      // 空格跳过：批量调价只改「本来有价」的格子（见 batchAdjustHint）
      if (current === null) continue
      if (relative) {
        const result = evaluatePriceFormula(text, { base: current })
        if (!result.ok) {
          reportFormulaFailure({ reason: result.reason, text })
          return
        }
        next.push({ ...cell.address, value: roundPrice(result.value) })
        continue
      }
      next.push({ ...cell.address, value: roundPrice(absolute) })
    }
    if (!next.length) {
      message.info(t('priceCompare.supplierPrice.batchAdjustNothing'))
      setBatchOpen(false)
      return
    }
    applyBulkValues(next)
    message.success(
      t('priceCompare.supplierPrice.batchAdjustApplied', {
        count: next.length,
      }),
    )
    setBatchOpen(false)
  }

  /** 点格子：普通单击 = 单格选区；Shift+单击 = 从 anchor 扩展（仅同一张表）。 */
  const selectOnPointerDown = (
    event: ReactPointerEvent<HTMLInputElement>,
    category: string,
    material: string,
    row: number,
    col: number,
  ) => {
    // 只响应左键：右键要留给上下文菜单，中键留给浏览器
    if (event.button !== 0) return
    draggingRef.current = true
    const point = { row, col }
    setSelection((current) =>
      event.shiftKey &&
      current?.category === category &&
      current.material === material
        ? extendSelection(current, point)
        : selectSingle(category, material, point),
    )
  }

  /** 拖过其它格子：拖拽中才扩展焦点，且只在同一张表内（跨表的行/列下标不可比）。 */
  const extendSelectionTo = (
    category: string,
    material: string,
    row: number,
    col: number,
  ) => {
    if (!draggingRef.current) return
    const point = { row, col }
    setSelection((current) =>
      current && current.category === category && current.material === material
        ? extendSelection(current, point)
        : current,
    )
  }

  /** 聚焦一个格子并全选内容（Tab / 方向键 / Enter 共用；定位键就是 `data-grid-cell`）。 */
  const focusGridCell = (id: string): boolean => {
    const node = document.querySelector<HTMLInputElement>(
      `input[data-grid-cell="${id}"]`,
    )
    if (!node) return false
    node.focus()
    node.select()
    return true
  }

  /** 同一列里上下移动（↑ / ↓ / 回车）：目标格不存在就不动。 */
  const moveWithinColumn = (
    group: CategoryGroup,
    sheet: CategorySheet,
    columnIndex: number,
    spec: number,
    delta: 1 | -1,
  ): boolean => {
    const index = sheet.indexBySpec.get(spec) ?? -1
    const target = sheet.rows[index + delta]
    const column = sheet.cellColumns[columnIndex]
    if (!target || !column) return false
    if (
      !catalogHas(
        group.category,
        column.brandName,
        column.material,
        target.spec,
        column.length,
      )
    ) {
      return false
    }
    return focusGridCell(
      cellKey(columnIndex, quoteRowKey(leafOfSpec(column, target.spec))),
    )
  }

  /** Tab / Shift+Tab：行优先走到下一个可写格（跳过不存在的格子，走到末尾不回环）。 */
  const moveToNextCell = (
    group: CategoryGroup,
    sheet: CategorySheet,
    rowIndex: number,
    columnIndex: number,
    backward: boolean,
  ): boolean => {
    const point = nextCell({
      rows: sheet.rows.length,
      cols: sheet.cellColumns.length,
      current: { row: rowIndex, col: columnIndex },
      step: backward ? -1 : 1,
      exists: (candidate) => {
        const column = sheet.cellColumns[candidate.col]
        const row = sheet.rows[candidate.row]
        if (!column || !row) return false
        return catalogHas(
          group.category,
          column.brandName,
          column.material,
          row.spec,
          column.length,
        )
      },
    })
    if (!point) return false
    const column = sheet.cellColumns[point.col]
    const row = sheet.rows[point.row]
    if (!column || !row) return false
    return focusGridCell(
      cellKey(point.col, quoteRowKey(leafOfSpec(column, row.spec))),
    )
  }

  /**
   * 调整列宽并写回本地记忆。
   *
   * <p>用函数式更新：键盘连按方向键时不会读到上一帧的偏好。写在更新函数里是安全的 ——
   * `writeColumnWidths` 用同一份偏好整体覆盖，重复调用结果一样（幂等），不会写出半份数据。</p>
   */
  const resizeSheetColumn = (
    sheetKey: string,
    columnKey: string,
    next: number,
  ) => {
    setColumnWidths((current) => {
      const updated = setColumnWidth(current, sheetKey, columnKey, next)
      if (supplierId) writeColumnWidths(supplierId, updated)
      return updated
    })
  }

  /** 恢复某列默认宽度（Home / 双击把手），同样写回本地记忆。 */
  const resetSheetColumn = (sheetKey: string, columnKey: string) => {
    setColumnWidths((current) => {
      const updated = resetColumnWidth(current, sheetKey, columnKey)
      if (supplierId) writeColumnWidths(supplierId, updated)
      return updated
    })
  }

  /* ---------------------------------------------------------------- 粘贴与撤销 */

  /**
   * 粘贴锚点：哪一张类别表（category）+ 第几列（品牌 × 定尺）+ 哪一行。
   * 拆表后同一页有多张 Table，锚点必须带上类别才能定位回落点。
   */
  const anchorRef = useRef<{
    category: string
    material: string
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
    const sheet = group?.sheets.find(
      (candidate) => candidate.material === anchor.material,
    )
    if (!group || !sheet) return
    const startRow = sheet.indexBySpec.get(Number(anchor.rowKey)) ?? -1
    const startColumn = anchor.columnIndex
    if (startRow < 0 || startColumn < 0) return
    event.preventDefault()

    const next: Record<string, BrandDraft> = { ...draftsRef.current }
    const touched = new Set<string>()
    let filled = 0
    let dropped = 0
    matrix.forEach((values, rowOffset) => {
      values.forEach((raw, columnOffset) => {
        const row = sheet.rows[startRow + rowOffset]
        const column = sheet.cellColumns[startColumn + columnOffset]
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
  /**
   * 表格容器上的快捷键（捕获阶段：格子里的输入框还没处理就先分流）。
   *
   * <ul>
   *   <li>Ctrl+Z / Ctrl+Y：撤销 / 重做（与逐格输入、粘贴共用同一份草稿历史）；</li>
   *   <li>Ctrl+D / Ctrl+R：把选区首行向下 / 首列向右填满；</li>
   *   <li>Delete：清空选区内已有价格 —— **正在格子里输入时除外**（那时 Delete 只删字符，
   *       交给输入框的原生行为，否则敲到一半想删个字会把整块选区清空）。</li>
   *   <li>Esc：清掉选区 —— 否则「有选区时 Ctrl+D / Ctrl+R 被拦截」会一直生效，用户没有
   *       别的入口把选区收起来。</li>
   * </ul>
   *
   * <p>只在**有选区**时才拦截 Ctrl+D / Ctrl+R：Ctrl+R 是浏览器刷新、Ctrl+D 是加书签，
   * 没有选区时把这两个键吞掉纯属添乱。按下 Esc 或点成单格即可恢复浏览器默认行为。</p>
   */
  const handleBoardKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        undo()
        return
      }
      if (key === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if ((key === 'd' || key === 'r') && selectionWritableCount > 1) {
        event.preventDefault()
        fillSelectedCells(key === 'd' ? 'down' : 'right')
        return
      }
    }
    if (event.key !== 'Delete' && event.key !== 'Escape') return
    if (!selection) return
    // SheetCell 在有未提交文本时挂 `data-editing`：此时 Delete / Esc 归输入框
    // （删字符 / 放弃这段算式），表格不再拦截。
    const editing =
      (event.target as HTMLElement | null)?.dataset.editing === 'true'
    if (editing) return
    if (event.key === 'Escape') {
      setSelection(null)
      return
    }
    event.preventDefault()
    clearSelectedCells()
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
  /**
   * 品牌列头：品牌名**独立居中**，保存状态与「更多」图标贴在格子右侧。
   *
   * <p>三段式而不是 flex 居中：品牌名绝对定位铺满整格并居中，右侧工具叠在上面，
   * 所以工具出现/消失（保存中、保存失败、⋯）都不会把品牌文字挤偏。</p>
   */
  const brandHeaderOf = (brandName: string) => (
    <span className="supplier-price-brand-head">
      <span className="supplier-price-brand-head-title">{brandName}</span>
      <span className="supplier-price-brand-head-tools">
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
            icon={<EllipsisOutlined />}
            size="small"
            type="text"
          />
        </Dropdown>
      </span>
    </span>
  )

  /**
   * 一张类别表（盘螺 / 直条）的列定义：行 = 规格，列 = 品牌 → 材质 → 定尺。
   *
   * <p>三级表头都来自商品资料：某个品牌没有的材质、没有的定尺，连列都不出现（见
   * {@link buildBrandCatalog}）。只有一个定尺时（盘螺）不套定尺层，避免每个品牌头顶挂一个「—」。</p>
   *
   * <p>同时返回 {@code totalWidth}：表格的 `scroll.x` 必须是「固定列宽 + 各叶列宽度之和」，
   * 而叶列宽度可以被用户拖动 / 方向键调。若列定义与 `scroll.x` 各算一遍，调完列宽就会出现
   * 「列变宽了、横向滚动范围还是老样子」的错位。</p>
   */
  const columnsOfSheet = (
    group: CategoryGroup,
    sheet: CategorySheet,
  ): { columns: ColumnsType<SpecRow>; totalWidth: number } => {
    /** 表身份（类别 + 材质）：列宽偏好按它分组，同一品牌在不同材质下各记各的宽度。 */
    const sheetKey = sheetKeyOf(group.categoryName, sheet.material)
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
    let totalWidth = ROW_HEAD_WIDTHS.spec

    /*
     * 每行只算一次最低价：最低价高亮与异常价标黄**共用这一个 min**（唯一口径）。
     *
     * 放在 render 里逐格算会让同一行被算 N 次（N = 该行可见列数），而且两处各算一份就可能
     * 出现「标了最低价、又被判成异常」的自相矛盾。
     */
    const minBySpec = new Map<number, number | null>()
    for (const row of sheet.rows) {
      const prices: (number | null)[] = []
      for (const column of sheet.cellColumns) {
        if (
          !catalogHas(
            group.category,
            column.brandName,
            column.material,
            row.spec,
            column.length,
          )
        ) {
          continue
        }
        prices.push(
          cellValueOfLeaf(column.brandName, leafOfSpec(column, row.spec)),
        )
      }
      minBySpec.set(row.spec, rowPriceStats(prices).min)
    }

    const material = sheet.material
    for (const brandName of brandNames) {
      const lengths = group.category?.byBrand
        .get(brandName)
        ?.materials.get(material)
      if (!lengths) continue
      const materialColumns: ColumnsType<SpecRow> = []
      {
        const lengthKeys = [...lengths.keys()].sort(sortLengths)
        /*
         * `label` 是叶子表头显示的文字：多定尺时是定尺名（9米 / 12米），单定尺时退回材质名
         * （品牌名已经在上一行）。**列宽把手必须跟着它一起渲染** —— 单定尺列也需要能调宽，
         * 早期版本把整格 title 覆盖成纯文本，把手就只存在于多定尺列上。
         */
        const cellOf = (
          length: string,
          label: string,
        ): ColumnsType<SpecRow>[number] => {
          const columnIndex = sheet.cellColumns.findIndex(
            (column) =>
              column.brandName === brandName &&
              column.material === material &&
              column.length === length,
          )
          const column = sheet.cellColumns[columnIndex]
          const columnKey = columnKeyOf(brandName, length)
          /*
           * 叶子列宽：默认刚好装下 4 位数字；盘螺（定尺 '-'）单定尺列的品牌表头直接坐在价格列上，
           * 所以默认 96px。用户拖动 / 方向键调整后按 localStorage 的记忆值（按供应商隔离）。
           */
          const leafWidth = widthOf(
            columnWidths,
            sheetKey,
            columnKey,
            length === '-' ? BRAND_FLAT_COLUMN_WIDTH : BRAND_COLUMN_WIDTH,
          )
          totalWidth += leafWidth
          return {
            title: (
              <span className="supplier-price-col-head">
                <span className="supplier-price-col-head-label">{label}</span>
                <ColumnResizeHandle
                  label={
                    length === '-'
                      ? `${brandName} ${material}`
                      : `${brandName} ${material} ${length}`
                  }
                  width={leafWidth}
                  onReset={() => resetSheetColumn(sheetKey, columnKey)}
                  onResize={(next) =>
                    resizeSheetColumn(sheetKey, columnKey, next)
                  }
                />
              </span>
            ),
            key: `${brandName}\u0000${material}\u0000${length}`,
            width: leafWidth,
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
              const rowKey = quoteRowKey(leaf)
              const value = cellValueOfLeaf(brandName, leaf)
              // 与异常价标黄共用同一个 min（每行只算一次，见上面的 minBySpec）
              const min = minBySpec.get(row.spec) ?? null
              const isCheapest =
                value !== null && value > 0 && min !== null && value === min
              const isAbnormal = isAbnormalPrice(value, min)
              const rowIndex = sheet.indexBySpec.get(row.spec) ?? -1
              const isSelected =
                selectedBounds !== null &&
                selection !== null &&
                selection.category === group.categoryName &&
                selection.material === material &&
                boundsContain(selectedBounds, rowIndex, columnIndex)
              const className = [
                'supplier-price-sheet-input',
                isCheapest ? 'supplier-price-cheapest' : '',
                isSelected ? 'supplier-price-cell-selected' : '',
                isAbnormal ? 'supplier-price-cell-abnormal' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <SheetCell
                  ariaLabel={`${brandName} ${material} ${row.spec} ${length}`}
                  cellId={cellKey(columnIndex, rowKey)}
                  className={className}
                  disabled={!canUpdate}
                  onCommit={(next) => updateCell(brandName, rowKey, next)}
                  onSubmitFormula={(text) =>
                    applyCellFormula(brandName, rowKey, text)
                  }
                  onFocusCell={() => {
                    anchorRef.current = {
                      category: group.categoryName,
                      material,
                      columnIndex,
                      rowKey: String(row.spec),
                    }
                  }}
                  onMove={(delta) =>
                    moveWithinColumn(group, sheet, columnIndex, row.spec, delta)
                  }
                  onPointerDownCell={(event) =>
                    selectOnPointerDown(
                      event,
                      group.categoryName,
                      material,
                      rowIndex,
                      columnIndex,
                    )
                  }
                  onPointerEnterCell={() =>
                    extendSelectionTo(
                      group.categoryName,
                      material,
                      rowIndex,
                      columnIndex,
                    )
                  }
                  onTab={(backward) =>
                    moveToNextCell(
                      group,
                      sheet,
                      rowIndex,
                      columnIndex,
                      backward,
                    )
                  }
                  resetToken={bulkResetToken}
                  /*
                   * 异常价与最低价都是**只用颜色**表达的语义（WCAG 1.4.1 不允许）：各给一条
                   * 文字说明，`SheetCell` 内部用 Tooltip 以 hover+focus 触发，键盘可达。
                   * 两者互斥（最低价 = min，异常价 > min × 1.05），所以一条字符串就够。
                   */
                  tooltip={
                    isAbnormal && value !== null && min !== null
                      ? t('priceCompare.supplierPrice.abnormalPrice', {
                          ratio: abnormalRatioPercent(value, min),
                          min,
                        })
                      : isCheapest
                        ? t('priceCompare.supplierPrice.cheapestHint')
                        : undefined
                  }
                  value={value}
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
            children: lengthKeys.map((length) =>
              cellOf(length, length === '-' ? '—' : length),
            ),
          })
        } else {
          // 单定尺（盘螺）：不套定尺层，叶子格直接显示材质名；列宽把手照样保留
          materialColumns.push({
            ...cellOf(lengthKeys[0] ?? '-', material),
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

    return { columns, totalWidth }
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
          onChange={(event) => {
            setKeyword(event.target.value)
            // 改了搜索词，可见行整批换掉：按行下标记的选区随之失效
            setSelection(null)
          }}
        />
        <Checkbox
          checked={onlyUnpriced}
          onChange={(event) => {
            setOnlyUnpriced(event.target.checked)
            // 「只看未填」同样会换掉可见行：按行下标记的选区随之失效
            setSelection(null)
          }}
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

      {/*
       * 选区工具栏：选中格数 + 四个批量动作。
       *
       * 键盘路径（Ctrl+D / Ctrl+R / Delete）是主路径，但按钮不能省：鼠标用户、触屏用户
       * 和读屏用户都要有可点的等价入口；按钮文案里同时带着快捷键，等于一处可见的说明。
       */}
      <Flex align="center" gap={8} wrap>
        {selection ? (
          <Typography.Text type="secondary">
            {t('priceCompare.supplierPrice.selectionCount', {
              count: selectionWritableCount,
            })}
          </Typography.Text>
        ) : null}
        <Button
          disabled={!canUpdate || selectionWritableCount <= 1}
          onClick={() => fillSelectedCells('down')}
          size="small"
        >
          {t('priceCompare.supplierPrice.fillDown')}
        </Button>
        <Button
          disabled={!canUpdate || selectionWritableCount <= 1}
          onClick={() => fillSelectedCells('right')}
          size="small"
        >
          {t('priceCompare.supplierPrice.fillRight')}
        </Button>
        <Button
          disabled={!canUpdate || !selection}
          onClick={() => {
            setBatchText('')
            setBatchOpen(true)
          }}
          size="small"
        >
          {t('priceCompare.supplierPrice.batchAdjust')}
        </Button>
        <Button
          disabled={!canUpdate || !selection}
          onClick={clearSelectedCells}
          size="small"
        >
          {t('priceCompare.supplierPrice.clearSelection')}
        </Button>
        <Tooltip
          title={
            <Flex gap={2} vertical>
              <span>{t('priceCompare.supplierPrice.shortcutTab')}</span>
              <span>{t('priceCompare.supplierPrice.shortcutFill')}</span>
              <span>{t('priceCompare.supplierPrice.shortcutDelete')}</span>
              <span>{t('priceCompare.supplierPrice.shortcutClear')}</span>
            </Flex>
          }
        >
          <Button size="small" type="text">
            {t('priceCompare.supplierPrice.shortcuts')}
          </Button>
        </Tooltip>
      </Flex>

      {/*
       * 批量调价：一个输入框，两套语义（以运算符开头 = 相对调整，否则 = 设为该价）。
       * 不合法时**不关弹窗**，让用户就地改；调完/没可调的格子才关。
       */}
      <Modal
        cancelText={t('common.cancel')}
        destroyOnHidden
        okButtonProps={{ disabled: !batchText.trim() }}
        okText={t('priceCompare.supplierPrice.batchAdjust')}
        open={batchOpen}
        title={t('priceCompare.supplierPrice.batchAdjustTitle', {
          count: selectionWritableCount,
        })}
        onCancel={() => setBatchOpen(false)}
        onOk={applyBatchAdjust}
      >
        <Flex gap={8} vertical>
          <Input
            aria-label={t('priceCompare.supplierPrice.batchAdjust')}
            placeholder={t('priceCompare.supplierPrice.batchAdjustPlaceholder')}
            value={batchText}
            onChange={(event) => setBatchText(event.target.value)}
            onPressEnter={applyBatchAdjust}
          />
          <Typography.Text type="secondary">
            {t('priceCompare.supplierPrice.batchAdjustHint')}
          </Typography.Text>
        </Flex>
      </Modal>

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
      ) : categoryGroups.every((group) =>
          group.sheets.every((sheet) => sheet.rows.length === 0),
        ) ? (
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
          onKeyDownCapture={handleBoardKeyDown}
          onPaste={handlePaste}
        >
          <div className="supplier-price-sheet-body supplier-price-board-columns">
            {categoryGroups.map((group) => (
              <div
                className="supplier-price-sheet-category"
                key={group.categoryName}
              >
                <Typography.Text className="supplier-price-transposed-category">
                  {group.categoryName}
                </Typography.Text>
                {/*
                 * 材质做成二级 tab：一个材质一张表（行 = 规格，列 = 品牌 × 定尺）。
                 * 直条有 HRB400/HRB400E/HRB500E 三种材质，混在一张表里列会翻三倍；
                 * 分开后每张表只有该材质的列，价格列宽压到 4 位数字也放得下。
                 */}
                <Tabs
                  destroyOnHidden={false}
                  items={group.sheets.map((sheet) => {
                    /*
                     * 列定义与 `scroll.x` 取自**同一处**：叶列宽可被用户拖动 / 方向键调整，
                     * 两处各算一遍就会变成「列变宽了、横向滚动范围还是老宽度」。
                     */
                    const { columns: sheetColumns, totalWidth } =
                      columnsOfSheet(group, sheet)
                    return {
                      key: sheet.material,
                      label: sheet.material,
                      children: (
                        <Table<SpecRow>
                          bordered
                          columns={sheetColumns}
                          dataSource={sheet.rows}
                          pagination={false}
                          rowKey={(row) => row.spec}
                          /*
                           * 始终给 `scroll.x`：表格宽度 = 各列宽之和，**不随容器拉伸**。
                           * 之前不传 scroll 时表格会撑满 100%，价格列被摊到几百像素宽
                           * （用户反馈「怎么变成自动拉伸了」）。
                           */
                          scroll={{ x: totalWidth }}
                          size="small"
                          tableLayout="fixed"
                        />
                      ),
                    }
                  })}
                  onChange={() => {
                    // 切材质就是换了一张表：行/列下标不再可比，选区必须清空
                    setSelection(null)
                  }}
                  size="small"
                  type="card"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </Flex>
  )
}
