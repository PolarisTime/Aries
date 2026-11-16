import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import type { MenuProps } from 'antd'
import {
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  Tabs,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  Fragment,
  type ChangeEvent as ReactChangeEvent,
  type ClipboardEvent as ReactClipboardEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
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
  addSupplierPriceColumn,
  fetchSpecRows,
  fetchSupplierPriceGrid,
  type SupplierPriceCellInput,
  type SupplierPriceColumn,
  type SupplierPriceGrid,
  saveSupplierPriceColumnItems,
} from '@/api/market/supplier-price-lists'
import { fetchSupplierOptions } from '@/api/master/supplier-options'
import { ContextMenu } from '@/components/ContextMenu'
import { EmptyState } from '@/components/EmptyState'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useHasPermission } from '@/hooks/usePermission'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import { message, modal, notification } from '@/utils/antd-app'
import { CollabStatusBar } from './collab/CollabStatusBar'
import { isCollabFeatureEnabled } from './collab/collab-config'
import {
  type CollabCellValue,
  collabCellKeyOf,
  collabCellKeyOfRowKey,
  collabRowKeyOfCellKey,
} from './collab/collab-doc'
import type { CollabPeer } from './collab/collab-presence'
import { CollabCellCursors } from './collab/RemoteCursors'
import {
  type CollabTarget,
  useSupplierPriceCollab,
} from './collab/useSupplierPriceCollab'
import { SHEET_WIDTH_BASE_FONT_SIZE, scaleSheetColumnWidth } from './core'
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
import {
  evaluatePriceFormula,
  type FormulaFailureReason,
  isPlainPriceText,
} from './supplier-quote-formula'
import {
  materialRankOf,
  parseClipboardGrid,
  roundPrice,
  templateLengthsOf,
  templateSpecsOf,
} from './supplier-quote-grid'
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
  readMaterialTabs,
  readSupplierTabs,
  writeDrafts,
  writeMaterialTabs,
  writeSupplierTabs,
} from './supplier-quote-view-prefs'
import './supplier-price.css'

/** 一列的保存状态：安静地告诉用户「存了没」，不需要点保存按钮。 */
type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** 自动保存的防抖时长：打字停顿这么久就落库。 */
const AUTOSAVE_DELAY_MS = 800

/**
 * 保存失败后的重试退避（毫秒）：只在网络错误 / 5xx 时使用。
 *
 * <p>依次 2s → 4s → 8s → 16s → 30s，最多 5 次；4xx（409/412/422）是用户可修复的错误，
 * 自动重试没有意义（S6：负价会让整列保存永久失败，旧实现每 800ms 重发一次，10 秒 12 次）。</p>
 */
const SAVE_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000] as const

/**
 * 列宽（px）。
 *
 * <p>按「Excel 报价单」的密度定：材质/规格/类别三列只放短文本，能窄就窄；
 * 品牌价格列 96 ≈ 6 位数金额 + 内边距。整表在 1280 宽下能容下 6~8 个品牌列而不横向滚动。</p>
 */
const ROW_HEAD_WIDTHS = {
  material: 88,
  /** 规格列同时承载材质名（HRB400E），52px 放不下，按 6 个字符留宽。 */
  spec: 72,
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

/**
 * 列宽随个人设置字号等比换算（与报单比价 `useSheetColumnWidths` 同一口径）。
 *
 * <p>上面几条宽度都是按 **14px 基准字号**量出来的设计值（"64px 刚好装下 4 位数字"）。字号调到
 * 16/18 后数字变宽，列宽不跟就会把第 4 位裁掉，所以列宽一律由字号换算，而不是各处写死。</p>
 */
export function supplierBoardWidths(fontSize: number) {
  return {
    rowHead: {
      material: scaleSheetColumnWidth(ROW_HEAD_WIDTHS.material, fontSize),
      spec: scaleSheetColumnWidth(ROW_HEAD_WIDTHS.spec, fontSize),
      category: scaleSheetColumnWidth(ROW_HEAD_WIDTHS.category, fontSize),
    },
    brand: scaleSheetColumnWidth(BRAND_COLUMN_WIDTH, fontSize),
    brandFlat: scaleSheetColumnWidth(BRAND_FLAT_COLUMN_WIDTH, fontSize),
  }
}

/** 订阅个人设置字号 → 现算列宽（字号是唯一真源，保存设置的同一帧就重算）。 */
function useSupplierBoardWidths() {
  const fontSize = useUiSettingsStore(
    (state) => state.settings?.fontSize ?? SHEET_WIDTH_BASE_FONT_SIZE,
  )
  return useMemo(() => supplierBoardWidths(fontSize), [fontSize])
}

/*
 * 通知卡片的固定 key：同一类提示只保留一张。重复失败时 key 相同 → antd 原地刷新卡片，
 * 不会一失败就叠出一串；失败消除后调用 `notification.destroy(key)` 主动收起。
 */
const SAVE_FAILED_NOTIFICATION_KEY = 'supplier-price-save-failed'
const DRAFTS_RESTORED_NOTIFICATION_KEY = 'supplier-price-drafts-restored'
const SPECS_FAILED_NOTIFICATION_KEY = 'supplier-price-specs-failed'

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

/**
 * 该类别下的列顺序：品牌 → 材质 → 定尺。
 *
 * <p>定尺取**品类模板**（直条固定 9米/12米，盘螺单列）：品牌在商品资料里没有某个定尺时，
 * 列仍然保留，只是整列不可填（渲染层用 `catalogHas` 判断并画斜纹）。
 * 这样同一材质下所有供应商的表结构一致，可以直接横向对比。</p>
 */
const cellColumnsOf = (
  category: CategoryCatalog | undefined,
  brandNames: readonly string[],
): CellColumn[] => {
  if (!category) return []
  const columns: CellColumn[] = []
  for (const brandName of brandNames) {
    const brandCatalog = category.byBrand.get(brandName)
    if (!brandCatalog) continue
    const materials = [...brandCatalog.materials.entries()].sort(
      ([left], [right]) =>
        materialRankOf(left) - materialRankOf(right) ||
        left.localeCompare(right, 'zh-Hans-CN'),
    )
    for (const [material, lengths] of materials) {
      const orderedLengths = templateLengthsOf(category.category, [
        ...lengths.keys(),
      ]).sort(sortLengths)
      for (const length of orderedLengths) {
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

/**
 * 空的远端光标列表（模块级常量）。
 *
 * <p>协作未开启或这一格没人停留时复用它，避免每次渲染都造一个新数组 ——
 * `SheetCell` 是逐格渲染的热点路径。</p>
 */
const EMPTY_COLLAB_PEERS: readonly CollabPeer[] = []

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

/**
 * 「最后编辑」显示口径（列头与工具栏共用这一处，避免两处格式不一致）。
 *
 * <p>`updatedAt` 是带时间的 ISO；`quotedOn` 只有日期（历史数据 / 后端建列时的默认值）。
 * 有时间的显示到分钟，只有日期的显示 `MM-DD`。</p>
 */
const formatLastEdit = (value: string | null): string | null => {
  if (!value) return null
  const parsed = dayjs(value)
  if (!parsed.isValid()) return null
  return value.length > 10
    ? parsed.format('MM-DD HH:mm')
    : parsed.format('MM-DD')
}

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
  /** 远端光标（谁正停在这一格）；空数组 = 没人停留，不渲染覆盖层。 */
  remoteCursors?: readonly CollabPeer[]
  /** 离开格子（失焦）时回调：协作模式用它清掉自己的光标。 */
  onBlurCell?: () => void
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
  remoteCursors,
  onBlurCell,
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
  /**
   * 本地文本的同步镜像。
   *
   * <p>`setText` 是异步的，而 Tab 提交会**同步**移动焦点、立刻触发旧格的 blur：
   * 只读 state 会让同一次编辑被提交两次（多推一条重复历史，Ctrl+Z 一次看不出变化，S9）。
   * 提交/放弃时先清这个 ref 再 `setText(null)`，blur 再来时就是空操作。</p>
   */
  const pendingTextRef = useRef<string | null>(null)
  /*
   * 错误反馈：算式求值失败时给这一格红色闪一下（同时父级已弹 message.warning）。
   *
   * <p>只闪 900ms：用户看到"这一格出错了"，改对后红色消失，不需要常驻错误态
   * （常驻的话每格都要带红框，整张表会变成报错墙）。</p>
   */
  const [errorFlash, setErrorFlash] = useState(false)
  const errorFlashTimerRef = useRef<number | null>(null)
  const flashError = () => {
    if (errorFlashTimerRef.current !== null) {
      window.clearTimeout(errorFlashTimerRef.current)
    }
    setErrorFlash(true)
    errorFlashTimerRef.current = window.setTimeout(() => {
      errorFlashTimerRef.current = null
      setErrorFlash(false)
    }, 900)
  }
  useEffect(() => {
    return () => {
      if (errorFlashTimerRef.current !== null) {
        window.clearTimeout(errorFlashTimerRef.current)
      }
    }
  }, [])

  /*
   * 批量操作（清空 / 填充 / 批量调价）改的是外面这格的值：本格若还留着半截算式文本，
   * 界面就会显示一个已经不成立的值。用渲染期状态校正（React 文档的
   * "adjusting state when a prop changes" 写法）而不是 effect，免得先画一帧旧文本。
   */
  if (seenResetToken !== resetToken) {
    setSeenResetToken(resetToken)
    setText(null)
    // 文本已清空，commitEditing 会直接返回；「已处理」标记也由下一次输入/聚焦重置
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
    /*
     * 输入期只更新本地文本，不逐键落草稿：逐键 onCommit 会让「一个键 = 一条历史 +
     * 一次排保存」，撤销一次只退一个字符（S9），Esc 也失去了「恢复原值」的语义（S8）。
     * 数字与算式统一在 Enter / Tab / ↑↓ / 失焦时提交一次。
     */
    pendingTextRef.current = raw
    setText(raw)
  }

  /**
   * 提交当前编辑会话（一次会话只提交一次）。
   *
   * <p>普通数字与算式走同一入口：普通数字直接落草稿；算式整体求值，失败时红色闪一下
   * 并保留文本（Enter 路径）或回退到已提交值（失焦 / 移动路径），提示由 `onSubmitFormula`
   * 统一负责，避免重复弹消息。</p>
   *
   * @param keepOnFailure 失败时是否保留文本：回车保留让用户就地改，失焦/移动则丢弃回原值
   * @returns 是否提交成功
   */
  const commitEditing = ({
    keepOnFailure,
  }: {
    keepOnFailure?: boolean
  } = {}): boolean => {
    // 读同步镜像而不是 state：Tab 同步移焦触发的 blur 会在 setText 生效前再次进来
    const raw = pendingTextRef.current
    // 镜像与 state 都为空 = 本次会话已提交/被批量操作清空：幂等返回（不再推历史）
    if (raw === null || text === null) {
      pendingTextRef.current = null
      return true
    }
    const trimmed = raw.trim()
    if (trimmed === '') {
      pendingTextRef.current = null
      setText(null)
      // 幂等：本来就是空值时不重复写草稿（否则一次回车也会产生一条空历史 + 一次排保存）
      if (value !== null) onCommit(null)
      return true
    }
    if (isPlainPriceText(raw)) {
      const parsed = Number(trimmed)
      // `12.`、`.` 这类半成品：回车时留着让用户敲完；离开时丢弃回已提交值
      if (!Number.isFinite(parsed)) {
        flashError()
        if (!keepOnFailure) {
          pendingTextRef.current = null
          setText(null)
        }
        return false
      }
      const next = roundPrice(parsed)
      pendingTextRef.current = null
      setText(null)
      // 幂等：与当前已提交值相同就不重复写草稿（也不产生多余历史）
      if (next !== value) onCommit(next)
      return true
    }
    if (handledTextRef.current === raw) {
      // 同一个失败算式已经提示过一次（回车失败后紧跟 blur）：不再重复提示
      pendingTextRef.current = null
      setText(null)
      return true
    }
    handledTextRef.current = raw
    if (onSubmitFormula(raw) === null) {
      flashError()
      if (!keepOnFailure) {
        pendingTextRef.current = null
        setText(null)
      }
      return false
    }
    pendingTextRef.current = null
    setText(null)
    return true
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (commitEditing({ keepOnFailure: true })) onMove(1)
      return
    }
    if (event.key === 'ArrowDown') {
      commitEditing()
      if (onMove(1)) event.preventDefault()
      return
    }
    if (event.key === 'ArrowUp') {
      commitEditing()
      if (onMove(-1)) event.preventDefault()
      return
    }
    if (event.key === 'Tab') {
      // Tab 由 nextCell 决定落点（行优先、跳过不存在的格子、不回环）
      commitEditing()
      if (onTab(event.shiftKey)) event.preventDefault()
      return
    }
    if (event.key === 'Escape') {
      /*
       * 恢复聚焦时 / 上次提交的值，焦点留在格内（S8：不再 blur，否则焦点掉到 body）。
       * 这里只丢本地文本；`value` 仍是已提交值，display 自然回退。
       */
      handledTextRef.current = null
      pendingTextRef.current = null
      setText(null)
      event.preventDefault()
    }
  }

  const input = (
    <Input
      aria-invalid={errorFlash || undefined}
      aria-label={ariaLabel}
      className={
        errorFlash ? `${className} supplier-price-cell-error` : className
      }
      data-editing={text === null ? undefined : 'true'}
      data-grid-cell={cellId}
      disabled={disabled}
      size="small"
      value={display}
      onBlur={() => {
        // 失焦 = 一次编辑会话的结束：提交一次（失败则回退到已提交值）
        commitEditing()
        onBlurCell?.()
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
  /*
   * 远端光标覆盖层只在"真的有人停在这一格"时才包一层锚点：
   * 没人时 DOM 与未接入协作时完全一致（不占位、不影响输入框尺寸）。
   */
  const cell = remoteCursors?.length ? (
    <span className="collab-cell-anchor">
      {input}
      <CollabCellCursors cursors={remoteCursors} />
    </span>
  ) : (
    input
  )
  if (!tooltip) return cell
  /*
   * `focus` 也触发：异常价目前还靠底色表达（WCAG 1.4.1 不能只用颜色传递信息），
   * 键盘 / 读屏用户 Tab 到这一格时要能读到"高出本行最低价多少"。
   * 与本仓库 TonCell 里短状态标签的气泡保持一致（同样是 `trigger={['hover','focus']}`）。
   */
  return (
    <Tooltip title={tooltip} trigger={['hover', 'focus']}>
      {cell}
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
  /**
   * 实时协作开关（构建期 `VITE_COLLAB_ENABLED` + 运行时 `window._CONFIG.collabEnabled`）。
   *
   * <p>关闭时本组件的行为与改动前**逐字一致**：不取票据、不加载 yjs、不建连，
   * 继续走原有 REST 草稿 + 自动保存（设计文档 §9.3 的降级口径）。</p>
   */
  const collabEnabled = isCollabFeatureEnabled()

  /** 已打开的供应商标签页（key = supplierId）；按需打开、可关闭，并持久化到本地。 */
  const [openSupplierIds, setOpenSupplierIds] = useState<string[]>([])
  /**
   * 是否已完成「页签恢复判断」。
   *
   * <p>供应商列表是异步加载的，恢复必须在列表就绪后进行，且**只能做一次**：
   * 否则用户手动关掉所有页签后，这个 effect 又会把第一个供应商塞回来
   * （用户会以为"关不掉"）。同理，写回本地也只在恢复完成后才开始，
   * 避免首帧的空数组把上次的存档覆盖成空。</p>
   */
  const [supplierTabsHydrated, setSupplierTabsHydrated] = useState(false)
  /** 当前激活的供应商标签页。 */
  const [activeSupplierId, setActiveSupplierId] = useState<string>()
  /**
   * 每个品类当前选中的材质 tab（直条 → HRB400 / HRB400E / HRB500E，盘螺 → HRB400 / HRB400E）。
   *
   * <p>材质表用 tab 承载：一屏只显示一个材质，避免同屏堆叠时把页面拉得很长。
   * 品类之间互相独立（直条的材质选择不影响盘螺）。</p>
   */
  const [activeMaterialByCategory, setActiveMaterialByCategory] = useState<
    Record<string, string>
  >({})
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
  /**
   * 刚保存成功的格子（品牌 + 草稿键集合），用于给单元格和工具栏一个短促的成功反馈。
   *
   * <p>自动保存是静默的：输入后 800ms 落库，界面没有任何变化，用户无法确认"到底存没存"。
   * 保存成功时把本次真正写库的格子标绿闪一下、工具栏显示「已保存」，约 900ms 后自动消失；
   * 只做视觉提示，不阻塞输入，也不再往表头塞常驻状态点。</p>
   */
  const [savedFlash, setSavedFlash] = useState<{
    brand: string
    keys: readonly string[]
  } | null>(null)
  const savedFlashTimerRef = useRef<number | null>(null)
  const flashSavedCells = useCallback(
    (brand: string, keys: readonly string[]) => {
      if (savedFlashTimerRef.current !== null) {
        window.clearTimeout(savedFlashTimerRef.current)
      }
      setSavedFlash({ brand, keys })
      savedFlashTimerRef.current = window.setTimeout(() => {
        savedFlashTimerRef.current = null
        setSavedFlash(null)
      }, 900)
    },
    [],
  )
  useEffect(() => {
    return () => {
      if (savedFlashTimerRef.current !== null) {
        window.clearTimeout(savedFlashTimerRef.current)
      }
    }
  }, [])
  const [history, setHistory] = useState<DraftHistory>(EMPTY_HISTORY)
  /** 本次进页是否从 localStorage 恢复了上次未保存的草稿（恢复后提示「已恢复 / 放弃」）。 */
  const [restoredDrafts, setRestoredDrafts] = useState(false)
  /** 已完成「恢复判断」的供应商；只有它等于当前供应商时才允许把草稿写回本地。 */
  const [draftsRestoredFor, setDraftsRestoredFor] = useState<string>()
  /**
   * 已完成材质 tab 恢复的供应商。
   *
   * <p>与草稿同一套路：切供应商时 `resetBoardState` 会把材质选择清空（不能把上一家的
   * 材质带过去），所以「恢复」和「写回」必须分开两拍 —— 先按新供应商读回存档，
   * 之后才允许把当前选择写回去，否则切页瞬间的空对象会把存档冲掉。</p>
   */
  const [materialTabsRestoredFor, setMaterialTabsRestoredFor] =
    useState<string>()
  /**
   * 当前选区（Excel 式区域选择）。
   *
   * <p>只记坐标、不记价格；anchor 是按下时的格子，focus 是当前拖到 / Shift 点到的格子。
   * 选区只在同一「类别 + 材质」表内扩展 —— 跨表框选没有意义（行/列下标在两表间不可比）。</p>
   */
  const [selection, setSelection] = useState<GridSelection | null>(null)
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
   * 页签恢复：供应商列表就绪后，优先恢复上次打开的供应商页签与激活项；
   * 没有存档（或存档里的供应商都已不存在）才退回「打开第一个供应商」。
   *
   * <p>标签是按需打开/关闭的（antd 规范：只有 card 类型支持添加与关闭）。
   * 恢复必须**只做一次**：否则用户手动关掉全部页签后会被立即塞回第一个供应商。</p>
   */
  useEffect(() => {
    if (suppliers.length === 0 || supplierTabsHydrated) return
    const validIds = new Set(suppliers.map((option) => option.value))
    const stored = readSupplierTabs()
    const restored = (stored?.openSupplierIds ?? []).filter((id) =>
      validIds.has(id),
    )
    if (restored.length > 0) {
      setOpenSupplierIds(restored)
      const storedActive = stored?.activeSupplierId
      setActiveSupplierId(
        storedActive && restored.includes(storedActive)
          ? storedActive
          : restored[0],
      )
    } else {
      // 没有存档，或存档里的供应商全被删除/停用：回到「默认第一个」
      const first = suppliers[0].value
      setOpenSupplierIds([first])
      setActiveSupplierId(first)
    }
    setSupplierTabsHydrated(true)
  }, [supplierTabsHydrated, suppliers])

  /*
   * 页签变化写回本地。只在恢复完成后生效 —— 首帧 `openSupplierIds` 还是空数组，
   * 提前写会把上次的存档冲掉。
   */
  useEffect(() => {
    if (!supplierTabsHydrated) return
    writeSupplierTabs({
      openSupplierIds,
      ...(activeSupplierId ? { activeSupplierId } : {}),
    })
  }, [activeSupplierId, openSupplierIds, supplierTabsHydrated])

  /*
   * 恢复该供应商上次停留的材质 tab：切供应商后 resetBoardState 已清空，这里读回存档。
   * 新打开的供应商没有存档 → 空对象，渲染侧回落到第一个材质。
   */
  useEffect(() => {
    if (!supplierId) return
    setActiveMaterialByCategory(readMaterialTabs(supplierId))
    setMaterialTabsRestoredFor(supplierId)
  }, [supplierId])

  /*
   * 材质 tab 选择写回本地。只在当前供应商已完成恢复后才写 —— 切页那一帧的
   * `activeMaterialByCategory` 是被清空的，提前写会把上一家的偏好抹掉。
   */
  useEffect(() => {
    if (!supplierId || materialTabsRestoredFor !== supplierId) return
    writeMaterialTabs(supplierId, activeMaterialByCategory)
  }, [activeMaterialByCategory, materialTabsRestoredFor, supplierId])

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

  /**
   * 价格表是否已全部加载成功。
   *
   * <p>草稿恢复与自动保存都要等它：加载中 `byBrand` 里还没有列，`saveBrand` 会把
   * 「还没读到」误判成「未建列」而去 `addSupplierPriceColumn` 新建（S13：慢网 5 秒内 4 次 POST）。</p>
   */
  const gridsReady = gridQueries.every((query) => query.isSuccess)
  /** 任一品牌的价格表加载失败：整屏错误态 + 重试，不把「没读到」当成「未报价」可编辑（S11）。 */
  const gridsError = gridQueries.some((query) => query.isError)

  /** 品牌 → 该品牌价格表是否加载成功；saveBrand 的守卫读它（异步回调里读不到最新渲染值）。 */
  const gridReadyByBrandRef = useRef(new Map<string, boolean>())
  useEffect(() => {
    const next = new Map<string, boolean>()
    candidateBrands.forEach((brandName, index) => {
      next.set(brandName, gridQueries[index]?.isSuccess === true)
    })
    gridReadyByBrandRef.current = next
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

  /** listId → 品牌列名：协作写入、光标与冲突提示都要把 listId 换回人能读的列名。 */
  const brandByListId = useMemo(() => {
    const map = new Map<string, string>()
    for (const [brandName, column] of byBrand.columns) {
      if (column?.listId) map.set(column.listId, brandName)
    }
    return map
  }, [byBrand.columns])

  /**
   * 需要协作的表 = 已经有价格表头的品牌列。
   *
   * <p>没建过列的品牌没有 listId，服务端也无从签票据，它们继续留在 REST 侧；
   * 拿到票据的那些表才进协作（`isCollabList` 逐表判断）。</p>
   */
  const collabTargets: CollabTarget[] = useMemo(
    () =>
      brandNames.flatMap((brandName) => {
        const listId = byBrand.columns.get(brandName)?.listId
        return listId ? [{ brandName, listId }] : []
      }),
    [brandNames, byBrand.columns],
  )

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
   * <p>行的范围来自该类别商品资料里出现过的全部规格；搜索按规格与材质过滤。</p>
   */
  const categoryGroups = useMemo(() => {
    const order: string[] = []
    for (const categoryName of PREFERRED_CATEGORY_ORDER) {
      if (catalog.has(categoryName)) order.push(categoryName)
    }
    const orderedCategories = new Set(order)
    for (const categoryName of catalog.keys()) {
      if (!orderedCategories.has(categoryName)) order.push(categoryName)
    }

    return order.map((categoryName) => {
      const category = catalog.get(categoryName)
      const cellColumns = cellColumnsOf(category, brandNames)
      /*
       * 材质按商品资料派生：该供应商经营品牌里真实有的材质才出表（没有的材质不凭空造表）。
       * 表内顺序交给 `materialRankOf`，与列头顺序保持同一口径。
       */
      const materialSet = new Set<string>()
      for (const column of cellColumns) materialSet.add(column.material)
      const materialNames = [...materialSet].sort(
        (left, right) =>
          materialRankOf(left) - materialRankOf(right) ||
          left.localeCompare(right, 'zh-Hans-CN'),
      )
      const sheets = materialNames.map((material) => {
        const materialColumns = cellColumns.filter(
          (column) => column.material === material,
        )
        /*
         * 行 = **品类模板规格**（直条 10–40、盘螺 6/8/10）。
         *
         * 之前用「该材质下各品牌商品资料的并集」，商品资料缺一项就整行消失，两张表对不上；
         * 现在固定模板行，缺数据的格子在渲染时标成不可填（`catalogHas` 为 false）。
         * 无模板的品类（历史 / 新品类）仍回退到商品资料并集。
         */
        const templateSpecs = templateSpecsOf(categoryName)
        let specs: number[]
        if (templateSpecs) {
          specs = templateSpecs
        } else {
          const specSet = new Set<number>()
          for (const column of materialColumns) {
            const specsOfColumn =
              category?.byBrand
                .get(column.brandName)
                ?.materials.get(column.material)
                ?.get(column.length) ?? []
            for (const spec of specsOfColumn) specSet.add(spec)
          }
          specs = [...specSet].sort((left, right) => left - right)
        }
        const rows: SpecRow[] = specs.map((spec) => ({ spec }))
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
  }, [brandNames, catalog])

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
  /** 品牌 → 已自动重试次数（S6：只用 5xx/网络错误推进，4xx 清零）。 */
  const saveRetryRef = useRef(new Map<string, number>())
  const supplierIdRef = useRef(supplierId)

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

  /**
   * 协作文档为空时用「REST 快照 + 本地未保存草稿」播种（设计文档 §9.4）。
   *
   * <p>只按服务端快照播种会丢掉"WS 连上之前已经敲的那几格"，所以草稿优先：
   * 草稿里有这一格就用草稿值（含显式清空 `null`），没有才用服务端值。
   * 播种完成后草稿会被清空（见下方 `collab.mode` effect），不会触发 REST 双写。</p>
   */
  const seedCollabFromSnapshot = (
    listId: string,
  ): Array<readonly [string, CollabCellValue]> => {
    const brandName = brandByListId.get(listId)
    if (!brandName) return []
    const serverCells = byBrandRef.current.cells.get(brandName)
    const draft = draftsRef.current[brandName] ?? {}
    const rowKeys = new Set<string>([
      ...(serverCells?.keys() ?? []),
      ...Object.keys(draft),
    ])
    const seeded: Array<readonly [string, CollabCellValue]> = []
    for (const rowKey of rowKeys) {
      const server = serverCells?.get(rowKey)
      // `rowKey in draft` 才算"本地改过"：草稿值为 null 表示明确清空，不能回落到服务端价
      const price =
        rowKey in draft ? (draft[rowKey] ?? null) : (server?.price ?? null)
      seeded.push([
        collabCellKeyOfRowKey(rowKey),
        {
          price,
          priceStatus: server?.priceStatus ?? 'NORMAL',
          remark: server?.remark ?? '',
        },
      ])
    }
    return seeded
  }

  /** 实时协作（M3/M4）。未开启 / 拿不到票据时 `mode` 恒为 `rest`，继续走原有链路。 */
  const collab = useSupplierPriceCollab({
    enabled: collabEnabled,
    seed: seedCollabFromSnapshot,
    supplierId,
    targets: collabTargets,
  })

  /**
   * 该品牌列此刻是否在协作；是则返回 listId。
   *
   * <p>"协作还是 REST"的判断只有这一处：逐格输入、粘贴、批量操作都经过它，
   * 不要在别处再写一遍 `isCollabList`。</p>
   */
  const collabListIdOf = (brandName: string): string | undefined => {
    const listId = byBrand.columns.get(brandName)?.listId
    if (!collabEnabled || !listId) return undefined
    return collab.isCollabList(listId) ? listId : undefined
  }

  /** 协作只读（票据 writable=false）：所有写入口（输入框、粘贴、批量）都要拦住。 */
  const collabReadOnly = collab.mode === 'collab' && !collab.writable
  // 价格表未全部成功前不可编辑（S11：加载中/失败时格子不能看起来像「未报价」）
  const canEdit = canUpdate && !collabReadOnly && gridsReady

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
      /*
       * 恢复出来的草稿按「未保存改动」处理，但**不能在这里立刻排保存**：
       * 价格表还没加载完时 saveBrand 读不到列，会走 addSupplierPriceColumn 新建列
       * （S13 慢网实测 4 次 POST）。排期改由下方 gridsReady 的 effect 负责。
       */
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
   * **全部商品行**（不是搜索过滤后的行），否则搜索会把其它行的价格删掉。</p>
   */
  const saveBrand = async (brandName: string) => {
    const currentSupplierId = supplierIdRef.current
    if (!currentSupplierId || savingRef.current.has(brandName)) return
    // 该品牌已进协作：值和落库由边车物化器负责，前端不能再整列 PUT（两写者会互相覆盖）
    if (collabListIdOf(brandName)) return
    const snapshot = draftsRef.current[brandName]
    if (draftCount(snapshot) === 0) return

    /*
     * 该品牌的价格表还没加载成功：此时无法判断「有没有列」，先不保存、保留草稿，
     * 避免把一次「还没读到」误判成「未建列」而 addSupplierPriceColumn（S13）。
     */
    if (gridReadyByBrandRef.current.get(brandName) !== true) return

    const existing = byBrandRef.current.columns.get(brandName) ?? null
    const serverCells = byBrandRef.current.cells.get(brandName) ?? new Map()
    savingRef.current.add(brandName)
    setSaveState((current) => ({ ...current, [brandName]: 'saving' }))
    let savedOk = false
    try {
      // 没有列就先建一条 (供应商, 品牌) 价格表，再整列提交
      const created = existing
        ? null
        : await addSupplierPriceColumn({
            brandName,
            supplierId: currentSupplierId,
            quotedOn: dayjs().format('YYYY-MM-DD'),
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
        savedOk = true
        saveRetryRef.current.delete(brandName)
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
        const plannedKeys = new Set<string>()
        for (const item of plan.items) {
          const key = `${item.category}|${item.material}|${item.spec}|${item.length}`
          plannedKeys.add(key)
          values[key] = item.price
        }
        /*
         * 清空的格子不会出现在 plan.items 里（buildColumnSavePlan 把 price=null 过滤掉），
         * 所以必须在这里把 savedValues 中上一次保存留下的旧价一并删掉。
         *
         * 否则草稿一清除，`cellValueAt` 就回退到 `savedValues ?? 服务端价`：旧价让
         * 「清空」在自动保存完成后（约 1 秒）自己弹回来，只有刷新/切页重置 savedValues
         * 才会消失。见 SupplierQuoteBoard.excel.spec.tsx 的「价格不会回弹」用例。
         */
        for (const key of Object.keys(snapshot ?? {})) {
          if (!plannedKeys.has(key)) delete values[key]
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
      /*
       * 保存成功的即时反馈只标「这次真的变了」的格子（草稿值与已落库值不同），
       * 不是整列都闪 —— 否则一次保存会把几十个没改过的价格一起点亮。
       */
      flashSavedCells(
        brandName,
        Object.entries(snapshot ?? {})
          .filter(
            ([key, price]) =>
              price !== null && price !== serverCells.get(key)?.price,
          )
          .map(([key]) => key),
      )
      savedOk = true
      saveRetryRef.current.delete(brandName)
    } catch (error) {
      // 失败保留草稿：用户不必重敲，点列头圆点即可重试
      setSaveState((current) => ({ ...current, [brandName]: 'error' }))
      /*
       * 失败分类（S6）：
       * - 无 HTTP 状态（网络错误）或 5xx：可重试，按 2 → 4 → 8 → 16 → 30s 退避，最多 5 次；
       * - 4xx（400/409/412/422…）：用户可修复（例如负价），自动重试没有意义，
       *   等用户改完再走正常保存，避免「一格负价让整列永久失败并持续重发」。
       */
      const status = readRequestError(error).status
      const transient = status === undefined || status >= 500
      if (transient) {
        const attempt = (saveRetryRef.current.get(brandName) ?? 0) + 1
        if (attempt <= SAVE_RETRY_DELAYS_MS.length) {
          saveRetryRef.current.set(brandName, attempt)
          scheduleSave(brandName, SAVE_RETRY_DELAYS_MS[attempt - 1])
        }
      } else {
        saveRetryRef.current.delete(brandName)
      }
    } finally {
      savingRef.current.delete(brandName)
      /*
       * 只有「成功 + 保存期间又有新改动」才续排；失败由上面的退避策略负责。
       * 旧实现 finally 里无条件 scheduleSave，负价会让整列保存永久失败并每 800ms
       * 重发一次（S6：10 秒 12 次）。
       */
      if (savedOk && draftCount(draftsRef.current[brandName]) > 0) {
        scheduleSave(brandName)
      }
    }
  }

  /**
   * 草稿恢复 effect 早于 `scheduleSave` 定义（它依赖后面的 saveBrand），
   * 用 ref 转发：每次渲染后同步成最新实现，effect 里调用拿到的永远是最新闭包。
   */
  const scheduleSaveRef = useRef<(brandName: string) => void>(() => {})

  const scheduleSave = (
    brandName: string,
    delayMs: number = AUTOSAVE_DELAY_MS,
  ) => {
    // 协作表不经 REST 落库：连排期都免了，避免切到协作后还有迟到的整列 PUT
    if (collabListIdOf(brandName)) return
    /*
     * 价格表尚未全部加载成功前不排保存：此时 byBrand 里还没有列，saveBrand 会误走
     * addSupplierPriceColumn 新建列（S13）。草稿留在内存/localStorage，加载成功后再排期。
     */
    if (!gridsReady) return
    const timers = timersRef.current
    const existing = timers.get(brandName)
    if (existing) clearTimeout(existing)
    timers.set(
      brandName,
      setTimeout(() => {
        timers.delete(brandName)
        void saveBrand(brandName)
      }, delayMs),
    )
  }

  /*
   * 渲染期写 ref 会破坏并发渲染与 React Compiler 的优化假设（见「自动保存」段约束），
   * 因此改到 layout effect 里同步：草稿恢复等子 effect 在 layout effect 之后执行，
   * 调用 ref 时拿到的已是最新闭包。
   */
  useLayoutEffect(() => {
    // 不写依赖数组：scheduleSave 是普通函数、每次渲染都会换身份；这里要的就是「每次渲染后同步最新闭包」。
    // （写成 [scheduleSave] 会被 biome 的 useExhaustiveDependencies 判为不稳定依赖。）
    scheduleSaveRef.current = scheduleSave
  })

  /*
   * 草稿恢复后的自动保存要等价格表全部加载成功：否则 saveBrand 读不到列，
   * 会把「还没读到」误判成「未建列」去 addSupplierPriceColumn 新建（S13）。
   * gridsReady 由 false→true 或恢复完成时触发一次；之后的新编辑走 updateCell 的 scheduleSave。
   */
  useEffect(() => {
    if (!supplierId || draftsRestoredFor !== supplierId) return
    if (!gridsReady) return
    for (const brandName of Object.keys(draftsRef.current)) {
      if (draftCount(draftsRef.current[brandName]) > 0) {
        scheduleSaveRef.current(brandName)
      }
    }
  }, [draftsRestoredFor, gridsReady, supplierId])

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
    const collabListId = collabListIdOf(brandName)
    if (collabListId) {
      // 协作表：改的是本地 Y.Doc（离线也即时生效），不再排 REST 自动保存
      if (collab.writable) {
        collab.setPrice(collabListId, collabCellKeyOfRowKey(rowKey), value)
      }
      return
    }
    applyDrafts({
      ...draftsRef.current,
      [brandName]: setDraftPrice(draftsRef.current[brandName], rowKey, value),
    })
    // 用户重新编辑 = 新意图：清掉上轮失败留下的退避计数，按正常防抖保存
    saveRetryRef.current.delete(brandName)
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
    // 协作模式下撤销栈在 Y.Doc 里（设计文档 §8：只撤自己的操作）
    if (collab.mode === 'collab') {
      collab.undo()
      return
    }
    const next = undoDrafts(history, draftsRef.current)
    setHistory(next.history)
    commitDrafts(next.drafts)
    flushDirtyBrands()
  }
  const redo = () => {
    if (collab.mode === 'collab') {
      collab.redo()
      return
    }
    const next = redoDrafts(history, draftsRef.current)
    setHistory(next.history)
    commitDrafts(next.drafts)
    flushDirtyBrands()
  }

  /** 切到某个供应商前先清空这一屏的临时状态（草稿、历史、选区、新建列缓存）。 */
  const resetBoardState = () => {
    /*
     * 先删本地草稿再清内存：只清内存的话 localStorage 还留着，切回这家供应商时
     * 又会提示「已恢复 N 格草稿」，用户明明已经在「放弃草稿并切换」里放弃过（实测反馈）。
     */
    if (supplierId) writeDrafts(supplierId, {})
    commitDrafts({})
    // 上一个供应商的自动保存计时器不能跨供应商触发：清空后由当前草稿重新排期，
    // 否则迟到的一次 saveBrand 会拿新供应商的草稿提前落库（保存提示也会错位）。
    for (const timer of timersRef.current.values()) clearTimeout(timer)
    timersRef.current.clear()
    setHistory(EMPTY_HISTORY)
    setSavedValues({})
    setColumns({})
    setSaveState({})
    // 材质 tab 是上一个供应商的数据形状（有的供应商直条只有 HRB400E），不能带过去
    setActiveMaterialByCategory({})
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
  /**
   * 批量写格的**唯一分岔点**：协作表写 Y.Doc，其余表落草稿并排队 REST 保存。
   *
   * <p>逐格输入之外的写入口（粘贴 / 清空 / 填充 / 批量调价）都走这里，
   * 避免每处各写一遍"协作还是 REST"的判断（同一口径只在一处）。</p>
   */
  const writeCellValues = (cells: readonly GridCellValue[]) => {
    if (!cells.length) return
    const next: Record<string, BrandDraft> = { ...draftsRef.current }
    const touched = new Set<string>()
    for (const cell of cells) {
      const collabListId = collabListIdOf(cell.brandName)
      if (collabListId) {
        if (collab.writable) {
          collab.setPrice(
            collabListId,
            collabCellKeyOfRowKey(cell.rowKey),
            cell.value,
          )
        }
        continue
      }
      next[cell.brandName] = setDraftPrice(
        next[cell.brandName],
        cell.rowKey,
        cell.value,
      )
      touched.add(cell.brandName)
    }
    // 只有真的还有 REST 表被改过才落草稿：全协作时不要凭空造历史记录
    if (touched.size) {
      applyDrafts(next)
      for (const brandName of touched) scheduleSave(brandName)
    }
  }

  const applyBulkValues = (cells: readonly GridCellValue[]) => {
    if (!cells.length) return
    writeCellValues(cells)
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
    if (!canEdit || !target) return
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

  /**
   * 框选后的**单元格右键菜单**（批量调价 / 清空价格）。
   *
   * <p>为什么只在「多格框选」时接管右键：价格格本身是可编辑 input，单格右键应当保留
   * 浏览器原生菜单（粘贴 / 检查等）——这也是本仓库上下文菜单契约的要求（参见 `SheetPanel`：
   * 右键可编辑输入控件时放行原生菜单）。而用户框选出一片单元格之后，意图已经从"编辑这一格"
   * 变成"对这一片做批量操作"，此时右键弹出批量菜单才符合预期，与 Excel 一致。</p>
   *
   * <p>菜单复用 {@link ContextMenu}（antd Dropdown 封装）：可访问名、打开后焦点进首项、
   * Escape 关闭并把焦点还给原格子，都走同一份 APG 契约；`disabled` 时 antd 不拦截事件，
   * 原生右键菜单照常出现。</p>
   */
  const selectionMenuItems: MenuProps['items'] = [
    {
      key: 'bulk-adjust',
      label: t('priceCompare.supplierPrice.menuBatchAdjust'),
    },
    {
      key: 'clear-prices',
      label: t('priceCompare.supplierPrice.menuClearPrices'),
      // 清空是破坏性动作：与列表页删除项同一约定（danger 语义色），但不清空就无法批量重填
      danger: true,
    },
  ]

  const handleSelectionMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'bulk-adjust') {
      // 与 tab 栏「批量调价」按钮同一份状态：清掉上次输入，打开同一个弹层
      setBatchText('')
      setBatchOpen(true)
      return
    }
    if (key === 'clear-prices') {
      clearSelectedCells()
    }
  }

  /**
   * 这张表上是否有"可执行批量动作的框选"。
   *
   * <p>选区只属于一个品类 + 一种材质（`selection.category/material`），因此只有选区
   * 所属的那张表才接管右键；其它材质表、以及单格选区，都放行原生菜单。</p>
   */
  const selectionMenuActiveHere = (
    group: CategoryGroup,
    sheet: CategorySheet,
  ) =>
    canEdit &&
    selection !== null &&
    selection.category === group.categoryName &&
    selection.material === sheet.material &&
    selectionWritableCount > 1

  /** Ctrl+D / Ctrl+R：把选区首行向下 / 首列向右填满。 */
  const fillSelectedCells = (mode: 'down' | 'right') => {
    const target = selectionTarget()
    if (!canEdit || !target) return
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
    if (!canEdit || !target) return
    const text = batchText.trim()
    if (!text) {
      // 空输入不是「什么都不发生」：确认按钮已禁用，但回车仍会走到这里。
      // 复用 batchAdjustHint 提示可填什么，不静默返回。
      message.info(t('priceCompare.supplierPrice.batchAdjustHint'))
      return
    }
    // 以运算符开头 = 在该格当前值上调整；否则整块设为该价
    const relative = /^[+\-*/]/.test(text)
    /*
     * 「直接设价」不再用 Number()：与粘贴 / 单格同一口径走 evaluatePriceFormula，
     * ￥/¥/逗号/`=` 去噪，负数与非法算式按各自 reason 拒绝（S7）。
     */
    const absoluteResult = relative ? null : evaluatePriceFormula(text)
    if (absoluteResult && !absoluteResult.ok) {
      reportFormulaFailure({ reason: absoluteResult.reason, text })
      return
    }
    const absolute = absoluteResult?.ok ? absoluteResult.value : 0
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
    if (!canEdit) return
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

    const plan: GridCellValue[] = []
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
        const rowKey = quoteRowKey(leaf)
        const brandName = column.brandName
        const trimmed = raw.trim()
        if (trimmed === '') {
          plan.push({ brandName, rowKey, value: null })
          filled += 1
          return
        }
        /*
         * 与单格算式 / 批量直接设价同一口径：￥/¥/逗号/`=` 去噪，负数与非法算式一律丢弃
         * （旧实现只去 `[,¥\\s]`、不认 `￥`/`=`，还会把 -3200 当合法价写进去，S7）。
         */
        const parsed = evaluatePriceFormula(trimmed)
        if (!parsed.ok) {
          dropped += 1
          return
        }
        plan.push({ brandName, rowKey, value: roundPrice(parsed.value) })
        filled += 1
      })
    })
    if (!filled) {
      // 整块粘贴都被拒（负数 / 非法算式 / 越界）时也要告诉用户为什么没生效（S7）
      if (dropped > 0) {
        message.warning(
          t('priceCompare.supplierPrice.pasteDropped', { count: dropped }),
        )
      }
      return
    }
    writeCellValues(plan)
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
    /*
     * SheetCell 在有未提交文本时挂 `data-editing`：输入框自己的按键
     * （Ctrl+Z 原生撤销、Delete 删字符、Esc 放弃这段文本）不再由表格拦截（S9）。
     */
    const editing =
      (event.target as HTMLElement | null)?.dataset.editing === 'true'
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const key = event.key.toLowerCase()
      if (key === 'z') {
        if (editing) return
        event.preventDefault()
        // Ctrl+Shift+Z 与 Ctrl+Y 都是重做（S9）
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (key === 'y') {
        if (editing) return
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
    if (editing) return
    if (event.key === 'Escape') {
      setSelection(null)
      return
    }
    event.preventDefault()
    clearSelectedCells()
  }

  /* ---------------------------------------------------------------- 渲染 */

  /*
   * 页内不再放任何提示条 / 提示按钮：保存失败、只读、草稿恢复、规格加载失败
   * 全部改走 antd `notification` / `message`，页面主体保持干净。
   *
   * 失败通知带「重试」按钮且不自动消失（duration: 0），点击后对失败品牌重新保存；
   * 用固定 key 保证重复失败只刷新同一张卡片，成功后主动 destroy。
   */
  const failedBrands = Object.keys(saveState).filter(
    (brandName) => saveState[brandName] === 'error',
  )
  const failedNames = failedBrands.join('、')
  const failedBrandsRef = useRef(failedBrands)
  failedBrandsRef.current = failedBrands
  const saveBrandRef = useRef(saveBrand)
  saveBrandRef.current = saveBrand
  useEffect(() => {
    if (failedBrands.length === 0) {
      notification.destroy(SAVE_FAILED_NOTIFICATION_KEY)
      return
    }
    notification.error({
      key: SAVE_FAILED_NOTIFICATION_KEY,
      message: t('common.saveFailed'),
      description: t('priceCompare.supplierPrice.saveFailedNames', {
        names: failedNames,
      }),
      duration: 0,
      btn: (
        <Button
          size="small"
          onClick={() => {
            for (const brandName of failedBrandsRef.current) {
              // 手动重试 = 用户明确要求再来一次：重置退避计数
              saveRetryRef.current.delete(brandName)
              void saveBrandRef.current(brandName)
            }
          }}
        >
          {t('priceCompare.supplierPrice.retry')}
        </Button>
      ),
    })
  }, [failedBrands.length, failedNames, t])

  /** 只读账号：进页面提示一次即可，不再常驻一行灰字。 */
  const readOnlyHintedRef = useRef(false)
  useEffect(() => {
    if (canUpdate || readOnlyHintedRef.current) return
    readOnlyHintedRef.current = true
    message.warning(t('priceCompare.supplierPrice.readOnlyHint'))
  }, [canUpdate, t])

  /** 恢复出未保存草稿：通知里给「放弃草稿」，替代原来的橙色 Alert 条。 */
  const discardDraftsRef = useRef(discardRestoredDrafts)
  discardDraftsRef.current = discardRestoredDrafts
  useEffect(() => {
    if (!restoredDrafts) {
      notification.destroy(DRAFTS_RESTORED_NOTIFICATION_KEY)
      return
    }
    notification.warning({
      key: DRAFTS_RESTORED_NOTIFICATION_KEY,
      message: t('priceCompare.supplierPrice.draftsRestored'),
      duration: 0,
      btn: (
        <Button size="small" onClick={() => discardDraftsRef.current()}>
          {t('priceCompare.supplierPrice.discardDrafts')}
        </Button>
      ),
    })
  }, [restoredDrafts, t])

  /** 规格列表加载失败：通知带「重试」，页面只保留一个空态占位。 */
  useEffect(() => {
    if (!specsQuery.isError) {
      notification.destroy(SPECS_FAILED_NOTIFICATION_KEY)
      return
    }
    notification.error({
      key: SPECS_FAILED_NOTIFICATION_KEY,
      message: t('priceCompare.supplierPrice.specsLoadFailed'),
      duration: 0,
      btn: (
        <Button size="small" onClick={() => void specsQuery.refetch()}>
          {t('priceCompare.supplierPrice.retry')}
        </Button>
      ),
    })
  }, [specsQuery.isError, specsQuery.refetch, t])

  /*
   * 进入协作模式后，本地草稿已经被播种进 Y.Doc（见 seedCollabFromSnapshot），
   * 此时必须清掉草稿与自动保存计时器 —— 否则界面显示协作值、后台还在整列 PUT，
   * 两个写者会互相覆盖（设计文档 §6.1「唯一写者原则」）。
   * 在途的那一次保存无法撤回，但它写的是同一批值，物化器随后会以文档为准覆盖回来。
   */
  const collabMode = collab.mode
  useEffect(() => {
    if (collabMode !== 'collab') return
    for (const timer of timersRef.current.values()) clearTimeout(timer)
    timersRef.current.clear()
    if (Object.keys(draftsRef.current).length) commitDrafts({})
    setSaveState({})
    setHistory(EMPTY_HISTORY)
  }, [collabMode, commitDrafts])

  /*
   * 同格冲突提示（设计文档 §8）：本地刚改过这一格、紧接着收到别人对同一格的改动时，
   * 提示「该格刚被他人改为 X」，不静默覆盖用户刚敲的值。窗口期由 hook 判定，
   * 这里只负责把格键翻译成人能读的列名 + 规格。
   */
  const lastPeerEdit = collab.lastPeerEdit
  useEffect(() => {
    if (!lastPeerEdit) return
    const brandName = brandByListId.get(lastPeerEdit.listId) ?? ''
    const [, material, spec, length] = collabRowKeyOfCellKey(
      lastPeerEdit.cellKey,
    ).split('|')
    const cellLabel = [brandName, material, spec, length]
      .filter(Boolean)
      .join(' ')
    message.warning(
      lastPeerEdit.price === null
        ? t('collab.conflict.cleared', { cell: cellLabel })
        : t('collab.conflict.edited', {
            cell: cellLabel,
            price: lastPeerEdit.price,
          }),
    )
  }, [brandByListId, lastPeerEdit, t])

  /*
   * 「最后编辑」= 当前供应商所有品牌列里最近一次保存时间（`updatedAt`，历史数据回退 `quotedOn`）。
   * 报价日期不再让用户手选：价格表的时间本来就是系统事实，手选只会与真实保存时间打架。
   */
  const lastEdited = useMemo(() => {
    let latest: string | null = null
    let latestAt = 0
    for (const column of byBrand.columns.values()) {
      const value = column?.updatedAt ?? column?.quotedOn
      if (!value) continue
      const time = dayjs(value).valueOf()
      if (!Number.isFinite(time)) continue
      if (time > latestAt) {
        latestAt = time
        latest = value
      }
    }
    return latest
  }, [byBrand.columns])

  /**
   * 品类级「已填 / 可填」计数：分母只算商品资料里真实存在的格子（斜纹格不计入），
   * 与列头「未报价」、单元格可填判断共用同一套 `catalogHas`，不另算一份。
   */
  const categoryProgress = (group: CategoryGroup) => {
    let total = 0
    let filled = 0
    for (const sheet of group.sheets) {
      for (const row of sheet.rows) {
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
          total += 1
          if (
            cellValueOfLeaf(column.brandName, leafOfSpec(column, row.spec)) !==
            null
          ) {
            filled += 1
          }
        }
      }
    }
    return { total, filled }
  }

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
  const brandHeaderOf = (brandName: string) => {
    const column = byBrand.columns.get(brandName) ?? null
    const lastEdit = formatLastEdit(
      column?.updatedAt ?? column?.quotedOn ?? null,
    )
    /*
     * 品牌列头只有品牌名：状态点、⋯ 菜单、列宽把手全部移除（列宽固定）。
     * 最后编辑 / 未报价仍可通过品牌名 tooltip 读到，不占表头空间。
     */
    return (
      <span
        className="supplier-price-brand-head"
        data-brand-status={lastEdit ? 'saved' : 'not-quoted'}
      >
        <span
          className="supplier-price-brand-head-title"
          title={
            lastEdit
              ? `${t('priceCompare.supplierPrice.lastEdited')} ${lastEdit}`
              : t('priceCompare.supplierPrice.notQuotedHint')
          }
        >
          {brandName}
        </span>
      </span>
    )
  }

  /**
   * 列宽（随个人设置字号等比缩放，见 {@link supplierBoardWidths}）。
   * 只在这里取一次，列定义与 `scroll.x` 共用同一份值 —— 两者各算一遍就会错位。
   */
  const boardWidths = useSupplierBoardWidths()

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
    /*
     * 左上角单元格：材质 + 规格。
     *
     * 材质不再单独占一行标题（那会让每张表上面多一条横带），而是收进表格的第一行第一列：
     * 「HRB400E / 规格」两行文字，一眼看出这张表是哪个材质、第一列是规格。
     */
    const columns: ColumnsType<SpecRow> = [
      {
        title: (
          <span className="supplier-price-corner">
            <span className="supplier-price-corner-material">
              {sheet.material}
            </span>
            <span className="supplier-price-corner-spec">
              {t('priceCompare.supplierPrice.specNo')}
            </span>
          </span>
        ),
        key: 'spec',
        width: boardWidths.rowHead.spec,
        align: 'center',
        fixed: 'left',
        render: (_value, row) => row.spec,
      },
    ]
    let totalWidth = boardWidths.rowHead.spec
    /*
     * 列下标查表（品牌|材质|定尺 → 列下标）：每次渲染只建一次。
     * 之前在每个叶列里 `findIndex`，列数一多就变成 O(列²)，属于典型的「循环里做数组查找」。
     */
    const columnIndexOf = new Map<string, number>()
    sheet.cellColumns.forEach((column, index) => {
      columnIndexOf.set(
        `${column.brandName}\u0000${column.material}\u0000${column.length}`,
        index,
      )
    })

    const material = sheet.material
    for (const brandName of brandNames) {
      /*
       * 定尺列来自**品类模板**（不是商品资料里该品牌有的定尺）：品牌只报 9 米时，
       * 12 米列仍然保留并整列标「不可填」，保证同一材质下所有供应商的表结构一致。
       */
      const lengthKeys = sheet.cellColumns
        .filter(
          (column) =>
            column.brandName === brandName && column.material === material,
        )
        .map((column) => column.length)
      if (lengthKeys.length === 0) continue
      const materialColumns: ColumnsType<SpecRow> = []
      {
        /*
         * `label` 是叶子表头显示的文字：多定尺时是定尺名（9米 / 12米），单定尺时退回材质名
         * （品牌名已经在上一行）。**列宽把手必须跟着它一起渲染** —— 单定尺列也需要能调宽，
         * 早期版本把整格 title 覆盖成纯文本，把手就只存在于多定尺列上。
         */
        const cellOf = (
          length: string,
          label: string,
          headerNode?: ReactNode,
        ): ColumnsType<SpecRow>[number] => {
          const columnIndex =
            columnIndexOf.get(`${brandName}\u0000${material}\u0000${length}`) ??
            -1
          const column = sheet.cellColumns[columnIndex]
          /*
           * 列宽固定（不做拖拽 / 记忆）：单定尺（盘螺）的品牌表头直接坐在价格列上，
           * 用 96px；多定尺用 64px，刚好装下 4 位数字。
           */
          const leafWidth =
            length === '-' ? boardWidths.brandFlat : boardWidths.brand
          totalWidth += leafWidth
          /*
           * 「整列不可填」：该品牌在商品资料里没有任何这个定尺的规格。
           * 表头划线 + 单元格斜纹，两层都表达同一件事，不靠颜色单打独斗。
           */
          const lengthWritable =
            group.category?.byBrand
              .get(brandName)
              ?.materials.get(material)
              ?.has(length) ?? false
          return {
            title: (
              <span className="supplier-price-col-head">
                {headerNode ?? (
                  <span
                    className={[
                      'supplier-price-col-head-label',
                      lengthWritable ? '' : 'supplier-price-col-head-na',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    title={
                      lengthWritable
                        ? undefined
                        : t('priceCompare.supplierPrice.lengthUnavailable', {
                            length,
                          })
                    }
                  >
                    {label}
                  </span>
                )}
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
                /*
                 * 商品资料里没有这个组合：**渲染成不可填的占位**（不是空白）。
                 * 空白会让人以为漏了数据；斜纹 + 「—」明确表示"这一格不能报价"。
                 * 两个原因分开说：该品牌没有这个定尺（整列不可填），或没有这个规格。
                 */
                const hasLength =
                  group.category?.byBrand
                    .get(brandName)
                    ?.materials.get(material)
                    ?.has(length) ?? false
                const reason = hasLength
                  ? t('priceCompare.supplierPrice.specUnavailable', {
                      spec: row.spec,
                    })
                  : t('priceCompare.supplierPrice.lengthUnavailable', {
                      length,
                    })
                return (
                  <span
                    aria-label={reason}
                    className="supplier-price-cell-na"
                    role="img"
                    title={reason}
                  >
                    —
                  </span>
                )
              }
              const leaf = leafOfSpec(column, row.spec)
              const rowKey = quoteRowKey(leaf)
              /*
               * 协作表：显示值以 Y.Doc 为准（本地即写即显示，离线也一样）；文档里还没有
               * 这一格（`undefined`）才回退到原口径：「草稿 → 已保存 → 服务端」。
               */
              const collabListId = collabListIdOf(brandName)
              const collabCell = collabListId
                ? collabCellKeyOf(leaf)
                : undefined
              const collabPrice =
                collabListId && collabCell
                  ? collab.priceOf(collabListId, collabCell)
                  : undefined
              const value =
                collabPrice === undefined
                  ? cellValueOfLeaf(brandName, leaf)
                  : collabPrice
              const remoteCursors =
                collabListId && collabCell
                  ? collab.peersOfCell(collabListId, collabCell)
                  : EMPTY_COLLAB_PEERS
              /*
               * 交互反馈：草稿与已落库值不一致 = 这一格有未保存改动（左侧琥珀细条）；
               * 刚保存成功 = 绿色闪一下（`savedFlash` 由 saveBrand 成功后派发）。
               * 协作表不参与「脏」标记：落库由边车物化决定，前端拿不到可靠对照值，
               * 标脏只会一直亮着（协作状态由顶部徽标表达）。
               */
              const dirty =
                !collabListId &&
                value !== (serverPriceOf(brandName, rowKey) ?? null)
              const flashing =
                savedFlash?.brand === brandName &&
                savedFlash.keys.includes(rowKey)
              const rowIndex = sheet.indexBySpec.get(row.spec) ?? -1
              const isSelected =
                selectedBounds !== null &&
                selection !== null &&
                selection.category === group.categoryName &&
                selection.material === material &&
                boundsContain(selectedBounds, rowIndex, columnIndex)
              const className = [
                'supplier-price-sheet-input',
                isSelected ? 'supplier-price-cell-selected' : '',
                dirty ? 'supplier-price-cell-dirty' : '',
                flashing ? 'supplier-price-cell-saved' : '',
              ]
                .filter(Boolean)
                .join(' ')
              return (
                <SheetCell
                  ariaLabel={`${brandName} ${material} ${row.spec} ${length}`}
                  cellId={cellKey(columnIndex, rowKey)}
                  className={className}
                  disabled={!canEdit}
                  onBlurCell={() => {
                    // 离开格子：清掉自己的光标，别人的描边随之消失
                    if (collabListId) collab.setCursor(collabListId, null)
                  }}
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
                    /*
                     * 焦点即选区：方向键 / Tab / Enter 把焦点移到另一格时，选区必须跟着走。
                     *
                     * <p>这里原先只更新粘贴锚点，`selection`（Delete 清空、Ctrl+D/R 填充、
                     * 右键菜单、批量调价都读它）还停在上一次点选/拖选的那片格子。用户实测：
                     * 点「亚新 HRB400 8」（3320）→ ↑ 移到空格「6」→ Delete，被清空的是 8。</p>
                     *
                     * <p>只在焦点确实换了格时才写，避免同一格重复聚焦把多格选区缩成单格。</p>
                     */
                    setSelection((current) =>
                      /*
                       * 只比较 `focus`：浏览器顺序是 pointerdown（Shift 时先把选区扩成整块）
                       * → focus；若连 `anchor` 也要求等于本格，整块会被收成单击的单格（S2）。
                       */
                      current &&
                      current.category === group.categoryName &&
                      current.material === material &&
                      current.focus.row === rowIndex &&
                      current.focus.col === columnIndex
                        ? current
                        : selectSingle(group.categoryName, material, {
                            row: rowIndex,
                            col: columnIndex,
                          }),
                    )
                    // 协作表：把光标共享给同房间的人（节流在 hook 内，80ms 一次）
                    if (collabListId && collabCell) {
                      collab.setCursor(collabListId, collabCell)
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
                  remoteCursors={remoteCursors}
                  resetToken={bulkResetToken}
                  value={value}
                />
              )
            },
          }
        }
        /*
         * 材质已经是**分区标题**（每个材质一张表），列头里不再重复材质名：
         * 多定尺时叶子格显示定尺（9米 / 12米），单定尺（盘螺）留空，品牌名由上一行表达。
         * 列宽把手仍然渲染在叶子格上（单定尺列也需要能调宽）。
         */
        if (lengthKeys.length === 1) {
          // 单定尺（盘螺）：品牌表头直接坐在价格列上，省掉一行空表头
          columns.push({
            ...cellOf(lengthKeys[0] ?? '-', '', brandHeaderOf(brandName)),
            key: brandName,
            align: 'center',
          })
          continue
        }
        for (const length of lengthKeys) {
          materialColumns.push({
            ...cellOf(length, length),
            key: `${brandName}\u0000${material}\u0000${length}`,
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
  const openedSupplierIds = new Set(openSupplierIds)
  const unopenedSuppliers = suppliers.filter(
    (option) => !openedSupplierIds.has(option.value),
  )

  /*
   * 一张材质表（材质卡片 + antd Table）。
   *
   * 列定义与 `scroll.x` 取自**同一处**：叶列宽由固定常量算出，两处各算一遍就会
   * 变成「列和横向滚动范围不一致」。材质 tab 与单材质直出共用这一个渲染出口。
   */
  const sheetViewOf = (group: CategoryGroup, sheet: CategorySheet) => {
    const { columns: sheetColumns, totalWidth } = columnsOfSheet(group, sheet)
    return (
      <ContextMenu
        ariaLabel={t('priceCompare.supplierPrice.selectionMenuLabel', {
          count: selectionWritableCount,
        })}
        disabled={!selectionMenuActiveHere(group, sheet)}
        items={selectionMenuItems}
        onClick={handleSelectionMenuClick}
      >
        <section className="supplier-price-sheet-material" key={sheet.material}>
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
        </section>
      </ContextMenu>
    )
  }

  /**
   * 一个品类下的材质区：材质**一律**用 tab 承载（直条 HRB400 / HRB400E / HRB500E）。
   *
   * <p>即使该品类只有一种材质也保留 tab 行 —— 各品类版式因此完全一致（标题 / 材质行 /
   * 表格三段式），扫读时不会出现"有的品类多一行、有的少一行"的错位感。单材质时那个
   * tab 只是当前状态的展示，没有可切换项。</p>
   *
   * <p>`destroyOnHidden`：只挂载当前材质的表，切走即卸载 —— 否则几张表都留在 DOM 里，
   * 键盘 Tab 顺序与 `data-grid-cell` 定位都会跨到隐藏表上。</p>
   */
  /**
   * 品类名挂在 tab 栏**左侧**，右侧放「已选 N 格 + 批量调价」与最后编辑
   * （antd `tabBarExtraContent`）。
   *
   * <p>为什么用 extra content 而不是自己拼一行 flex：antd 的 tab 栏本身就是
   * 「一行 + 下划线」，把两侧内容交给它，品类名/时间与 tab 文字天然同基线，
   * 不需要靠 padding 去凑；表格仍然只属于 tab 内容区，不会被 flex 布局拉进那一行。</p>
   *
   * <p>选区动作也放这里：选区天然只属于**一个品类**（`selection.category`），
   * 独立蓝条会平白多占一行，而且不在选区所属品类的行上，用户得来回看。</p>
   */
  const materialTabExtrasOf = (group: CategoryGroup, groupIndex: number) => {
    /** 选区只属于一个品类：动作只出现在该品类的 tab 栏上。 */
    const selectionHere = selection?.category === group.categoryName
    return {
      left: (
        <span
          className="supplier-price-sheet-category-name"
          title={t('priceCompare.supplierPrice.categoryScale', {
            materials: group.sheets.length,
            ...categoryProgress(group),
          })}
        >
          {group.categoryName}
        </span>
      ),
      /*
       * 右侧：选区动作（只在选区所属品类）+ 最后编辑（只在第一行）。
       * 两者都没有时整个 right 不传，tab 栏不会留空位。
       */
      ...(selectionHere || groupIndex === 0
        ? {
            right: (
              <Flex
                align="center"
                className="supplier-price-tabs-extras"
                gap={8}
              >
                {selectionHere ? (
                  <>
                    <Typography.Text type="secondary">
                      {t('priceCompare.supplierPrice.selectionCount', {
                        count: selectionWritableCount,
                      })}
                    </Typography.Text>
                    <Button
                      disabled={!canEdit}
                      onClick={() => {
                        setBatchText('')
                        setBatchOpen(true)
                      }}
                      size="small"
                    >
                      {t('priceCompare.supplierPrice.batchAdjust')}
                    </Button>
                  </>
                ) : null}
                {groupIndex === 0 ? (
                  <>
                    <Tooltip
                      title={t('priceCompare.supplierPrice.lastEditedHint')}
                    >
                      <Typography.Text
                        className="supplier-price-last-edited"
                        type="secondary"
                      >
                        {t('priceCompare.supplierPrice.lastEdited')}：
                        {formatLastEdit(lastEdited) ??
                          t('priceCompare.supplierPrice.neverEdited')}
                      </Typography.Text>
                    </Tooltip>
                    {savedFlash ? (
                      <Typography.Text
                        className="supplier-price-saved-hint"
                        type="success"
                      >
                        {t('priceCompare.supplierPrice.saved')}
                      </Typography.Text>
                    ) : null}
                  </>
                ) : null}
              </Flex>
            ),
          }
        : {}),
    }
  }

  /**
   * 一个品类下的「平铺材质区」（demo）：不再用 tab 切换材质，直接把每种材质的一张表并排摆开，
   * 表与表之间用一条竖向分隔线断开 —— 左侧 HRB400、右侧 HRB400E 同屏对照，报价时不用来回切。
   *
   * <p>品类名与右侧状态（已选 / 批量调价 / 最后编辑）复用材质 tab 栏的 extras，
   * 只是从 tab 栏挪到分区标题行，平铺后这些信息仍有落点。</p>
   */
  const materialRowOf = (group: CategoryGroup, groupIndex: number) => {
    if (group.sheets.length === 0) return null
    const extras = materialTabExtrasOf(group, groupIndex)
    return (
      <section className="supplier-price-material-row">
        <header className="supplier-price-material-row-head">
          {extras.left}
          {extras.right ?? null}
        </header>
        <div className="supplier-price-material-row-body">
          {group.sheets.map((sheet, index) => (
            <Fragment key={sheet.material}>
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="supplier-price-material-divider"
                />
              ) : null}
              {sheetViewOf(group, sheet)}
            </Fragment>
          ))}
        </div>
      </section>
    )
  }

  const materialTabsOf = (group: CategoryGroup, groupIndex: number) => {
    if (group.sheets.length === 0) return null
    const active = activeMaterialByCategory[group.categoryName]
    const activeKey = group.sheets.some((sheet) => sheet.material === active)
      ? active
      : group.sheets[0].material
    return (
      <Tabs
        activeKey={activeKey}
        className="supplier-price-material-tabs"
        destroyOnHidden
        tabBarExtraContent={materialTabExtrasOf(group, groupIndex)}
        items={group.sheets.map((sheet) => ({
          key: sheet.material,
          label: sheet.material,
          children: sheetViewOf(group, sheet),
        }))}
        onChange={(key) => {
          setActiveMaterialByCategory((current) => ({
            ...current,
            [group.categoryName]: key,
          }))
          // 选区坐标绑定「品类 + 材质」：换材质后之前的行列不再指向同一批格子
          setSelection(null)
        }}
        size="small"
      />
    )
  }

  /*
   * 表格内容整体作为 Tabs 的 `items[].children`：这是 antd 的原生结构 ——
   * 页签与内容面板连成一体（editable-card 的选中页签不会再像浮空胶囊），
   * 切换供应商时由 antd 负责卸载/挂载面板。
   */
  const boardContent = (
    <>
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

      {brandNames.length === 0 ? (
        <Typography.Text type="secondary">
          {t('priceCompare.supplierPrice.noBrands')}
        </Typography.Text>
      ) : specsQuery.isError ? (
        <Empty description={t('priceCompare.supplierPrice.specsLoadFailed')} />
      ) : gridsError ? (
        <EmptyState
          primaryAction={{
            label: t('common.retry'),
            onClick: () => {
              for (const query of gridQueries) void query.refetch()
            },
          }}
          title={t('common.loadFailed')}
          type="error"
        />
      ) : !gridsReady ? (
        <div aria-busy="true" className="supplier-price-grid-skeleton">
          <Skeleton active paragraph={{ rows: 6 }} />
        </div>
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
            {categoryGroups.map((group, groupIndex) => (
              <div
                className="supplier-price-sheet-category"
                key={group.categoryName}
              >
                {/*
                 * demo：所有品类都改为平铺（材质不再用 tab 切换）。
                 * 只有一个材质时就是「分区标题 + 一张表」，多个材质时并排 + 竖向分隔线。
                 */}
                {group.sheets.length > 0
                  ? materialRowOf(group, groupIndex)
                  : materialTabsOf(group, groupIndex)}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )

  /*
   * 标签页管理按 antd 规范来：**只有 `editable-card` 类型支持添加与关闭**，
   * 溢出由内置的 `more`（省略号）自动折叠，不用自己算宽度。
   *
   * 「添加」不用 `onEdit('add')` 弹菜单：供应商四十多家，菜单会铺成一整屏（用户已反馈过）。
   * 改成标签栏右侧一个**可搜索的 Select**，输入公司名即时过滤，选中即打开标签。
   *
   * 内容通过 `items[].children` 交给 Tabs（只有当前供应商对应的页签有内容）：
   * 这是 antd 的原生结构，页签与内容面板连成一体；切换供应商时 antd 会卸载上一家、
   * 挂载下一家，与「切换供应商即重置本屏临时状态」的行为一致。
   */
  const supplierTabs = (
    <Tabs
      activeKey={supplierId}
      className="supplier-price-supplier-tabs"
      hideAdd
      items={openSupplierIds.map((id) => ({
        key: id,
        label: suppliers.find((option) => option.value === id)?.label ?? id,
        children: id === supplierId ? boardContent : null,
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
        /*
         * 协作状态与在线名单放 tab 栏左侧：与页签同基线，不额外占一行；
         * 未开启协作时 `CollabStatusBar` 渲染 null，页面与改动前一致。
         */
        left: (
          <CollabStatusBar
            peers={collab.peers}
            state={collab.state}
            writable={collab.writable}
          />
        ),
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
    </Flex>
  )
}
