import {
  DeleteOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MinusOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  SwapOutlined,
  TrophyOutlined,
  UnlockOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Flex,
  Popconfirm,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { fetchLowestBrandQuotes } from '@/api/market/supplier-price-lists'
import { isEditableFieldTarget } from '@/components/row-context-menu'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { CollabStatusBar } from './collab/CollabStatusBar'
import { isCollabFeatureEnabled } from './collab/collab-config'
import type { CollabPeer } from './collab/collab-presence'
import { CollabCellCursors } from './collab/RemoteCursors'
import { useQuoteSheetCollab } from './collab/useQuoteSheetCollab'
import {
  EMPTY_LENGTH_PREMIUMS,
  filterVarieties,
  isSeparatorRow,
  PRICE_COMPARE_COLUMN_SETTINGS_KEY,
  resolveRef,
  SHEET_HIDEABLE_COLUMN,
} from './core'
import {
  buildSheetColumns,
  type ColumnContext,
  FallbackBadge,
} from './sheet-columns'
import { moveFocusTon } from './sheet-focus-navigation'
import { importLowestQuotes } from './spot-from-price-list'
import type {
  Brand,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
  Variety,
} from './types'
import { useSheetColumnWidths } from './use-sheet-column-widths'
import { useSheetPanelInputActions } from './use-sheet-panel-inputs'
import { useSheetRowOperations } from './use-sheet-row-operations'
import './price-compare.css'

const { Text } = Typography

/**
 * 选择框 + 拖拽手柄合并成的一列宽度(40px)。
 * 这一列只放 icon-only 控件, 尺寸由命中区下限(WCAG 2.5.8)决定, 不随字号变化,
 * 因此不参与 core.sheetColumnWidths 的等比换算。
 *
 * <p>「行操作」列(锁定/更多按钮)已移除: 行级锁定与行操作统一走右键菜单与工具栏入口,
 * 单独的一列只在窄屏挤占宽度。</p>
 */
const SHEET_FIXED_CHROME_WIDTH = 40

/* ------------------------------------------------------------- 单据表格 */

/** 锁定原因可见文案的元素 id(供禁用按钮的 aria-describedby 关联)。 */
const LOCK_REASON_ID = 'price-compare-lock-reason'

/** 行菜单长按(触摸)打开时长, 与移动端长按唤起上下文菜单的习惯一致。 */
const ROW_MENU_LONG_PRESS_MS = 600
/** 长按期间允许的手指抖动像素: 超过即视为滚动, 取消长按。 */
const ROW_MENU_LONG_PRESS_MOVE_TOLERANCE_PX = 10

type SheetTableProps = {
  rows: PriceRow[]
  base: Omit<ColumnContext, 'rows' | 'toggleAll' | 'attachSpotRef'> & {
    density: 'small' | 'middle' | 'large'
  }
  onReorderRow: (fromId: string, toId: string, after: boolean) => void
  /** 点击「添加一行」追加空行, 商品由行内可搜索下拉选择。 */
  onAddRow: () => void
  onAddSeparator: () => void
  /**
   * 协作：该行上的远端光标；不传表示未开启协作（DOM 与改动前一致）。
   *
   * <p>行光标画在「报单吨位」单元格上：那是这一行唯一的手填输入格，
   * 对方看到描边就知道你在改哪一行。</p>
   */
  collabPeersOfRow?: (rowId: string) => readonly CollabPeer[]
  /** 协作：焦点进入/离开某一行时上报自己的行光标（`null` = 离开所有行）。 */
  onCollabRowFocus?: (rowId: string | null) => void
}

/**
 * 给「报单吨位」列的渲染结果套一层远端光标锚点。
 *
 * <p>这是复用 {@link CollabCellCursors} 的**薄适配层**：不改 `buildSheetColumns`
 * （列定义的单一出口），只在 SheetPanel 这一侧包一层 DOM；没有远端光标时原样返回，
 * 不留空节点。</p>
 */
function withRowCursors(
  columns: ColumnsType<GridRow>,
  collabPeersOfRow?: (rowId: string) => readonly CollabPeer[],
): ColumnsType<GridRow> {
  if (!collabPeersOfRow) return columns
  return columns.map((column) => {
    if (column.key !== 'ton') return column
    // 吨位列的 render 只返回 ReactNode（antd 的 `RenderedCell` 分支在这里用不到）
    const renderCell = column.render as
      | ((value: unknown, row: GridRow, index: number) => ReactNode)
      | undefined
    return {
      ...column,
      render: (value: unknown, row: GridRow, index: number) => {
        const cell = renderCell ? renderCell(value, row, index) : null
        const peers = collabPeersOfRow(row.rowId)
        if (!peers.length) return cell
        return (
          <span className="collab-cell-anchor collab-cell-anchor--row">
            {cell}
            <CollabCellCursors cursors={peers} />
          </span>
        )
      },
    }
  })
}

function SheetTable(props: SheetTableProps) {
  const {
    rows,
    base,
    onReorderRow,
    onAddRow,
    onAddSeparator,
    collabPeersOfRow,
    onCollabRowFocus,
  } = props
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropId, setDropId] = useState<string | null>(null)
  const [dropAfter, setDropAfter] = useState(false)
  const { toggleSelect, t } = base
  /** 只读或被他人签出 / 锁定规格数量时: 禁止行级拖拽重排与新增。 */
  const rowLocked = base.readOnly || Boolean(base.sheet.specQuantityLocked)
  const rowLockedHint = t('priceCompare.sheet.specQuantityLockedHint')
  /** 行结构被冻结的原因: 只读(他人签出) 与 全局锁定 是两回事, 文案不能混用。 */
  const rowLockedReason = base.readOnly
    ? t('priceCompare.sheet.readOnlyHint')
    : rowLockedHint
  /** 触摸长按打开行菜单的待决状态(与右键等价, 触屏没有右键)。 */
  /**
   * 本次 mousedown 是否落在输入控件上(输入框/可编辑下拉/数字输入)。
   *
   * <p>整行可拖之后, 在输入框里按下再移动会被浏览器当成"拖这一行" —— 用户就没法在
   * 文本框里拖选文字了。mousedown 一定早于 dragstart, 因此在这里记一笔, dragstart 时
   * 据此放行。用 ref 而不是 state: 两者之间没有渲染机会, state 更新来不及。</p>
   */
  const dragFromEditableRef = useRef(false)
  const longPressRef = useRef<{
    timer: ReturnType<typeof setTimeout>
    x: number
    y: number
  } | null>(null)

  const cancelLongPress = () => {
    if (longPressRef.current) {
      clearTimeout(longPressRef.current.timer)
      longPressRef.current = null
    }
  }

  /**
   * 触摸长按 600ms 打开行菜单(触屏没有右键, 长按是右键的等价物)。
   * 可编辑的文本/下拉上不劫持: 那里长按是文本选择/放大镜, 与仓库约定
   * 「不在输入控件内劫持右键」一致, 触屏用户改用可见的「行操作」按钮。
   */
  const onRowTouchStart = (
    rowId: string,
    event: React.TouchEvent<HTMLElement>,
  ) => {
    cancelLongPress()
    if (rowLocked || event.touches.length !== 1) return
    if (isEditableFieldTarget(event.target)) return
    const touch = event.touches[0]
    const timer = setTimeout(() => {
      longPressRef.current = null
      base.onContextMenuRowChange(rowId)
    }, ROW_MENU_LONG_PRESS_MS)
    longPressRef.current = { timer, x: touch.clientX, y: touch.clientY }
  }

  const onRowTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    const pending = longPressRef.current
    if (!pending || event.touches.length !== 1) {
      cancelLongPress()
      return
    }
    const touch = event.touches[0]
    if (
      Math.abs(touch.clientX - pending.x) >
        ROW_MENU_LONG_PRESS_MOVE_TOLERANCE_PX ||
      Math.abs(touch.clientY - pending.y) >
        ROW_MENU_LONG_PRESS_MOVE_TOLERANCE_PX
    ) {
      cancelLongPress()
    }
  }

  const onRowDragStart = (
    rowId: string,
    event: React.DragEvent<HTMLElement>,
  ) => {
    if (rowLocked) return
    setDragId(rowId)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/row-id', rowId)
    const tr = event.currentTarget.closest('tr')
    if (tr) event.dataTransfer.setDragImage(tr, 24, tr.offsetHeight / 2)
  }
  /**
   * 拖拽状态的**唯一出口**: 结束、取消与"数据/锁定态变化"的所有路径都必须走它。
   *
   * <p>HTML5 的 `dragend` 在真实浏览器里**可能丢失**: 拖拽中途组件重渲染把被拖的节点换掉、
   * 切到锁定态、窗口失焦、按 Escape 取消 —— 任一条漏掉都会让 `dragId/dropId/dropAfter`
   * 永久残留, 于是行上一直挂着 `price-compare-dragging` 与 2px 主色落点线(用户截图实测过
   * "锁定态行左端一条蓝线")。这里把清理收成一个出口, 禁止在多处各清一半。</p>
   */
  const resetDragState = useCallback(() => {
    setDragId(null)
    setDropId(null)
    setDropAfter(false)
  }, [])

  /** 拖拽中挂全局兜底: Escape 取消与窗口失焦都不会派发 dragend。 */
  useEffect(() => {
    if (!dragId) return undefined
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') resetDragState()
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('blur', resetDragState)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('blur', resetDragState)
    }
  }, [dragId, resetDragState])

  /** 行集合变化(增删/换单/重排)后旧的落点没有意义: 一起清掉, 免得指向已不存在的行。 */
  const rowIdsKey = useMemo(() => rows.map((row) => row.id).join('|'), [rows])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rowIdsKey 变化本身就是「行集合已变、旧落点作废」的信号, 效果体内无需读它 —— 与 row-drag-sort.tsx 同一写法
  useEffect(() => {
    resetDragState()
  }, [rowIdsKey, resetDragState])

  /** 切换(进入)锁定态: 锁定时正在拖的行已经没有落点可言, 不清就会留下落点线。 */
  useEffect(() => {
    if (rowLocked) resetDragState()
  }, [rowLocked, resetDragState])

  /**
   * 卸载兜底: 本实例的 state 会随组件销毁, 但"所有生命周期路径都过唯一出口"这条约束
   * 要立住 —— 以后若把这三项状态提升到 store/ref, 这里就是必须的清理点。
   */
  useEffect(() => () => resetDragState(), [resetDragState])

  const onRowDragEnd = resetDragState

  const columns = buildSheetColumns({
    ...base,
    rows,
    attachSpotRef: true,
    toggleAll: (checked) => {
      for (const row of rows) toggleSelect(row.id, checked)
    },
  })
  /* 协作行光标：只在吨位列上包一层锚点；未开启协作时原样返回 columns */
  const tableColumns = withRowCursors(columns, collabPeersOfRow)
  /** 报单吨位合计: 与列头口径一致(全部商品行 ton 之和), 现在渲染在表格最后一行。 */
  const tonTotalText = useMemo(() => {
    const total = rows.reduce((sum, row) => sum + (row.ton ?? 0), 0)
    return Number.isFinite(total) ? String(Number(total.toFixed(8))) : '0'
  }, [rows])
  const dataSource = useMemo<GridRow[]>(
    () => rows.map((row) => ({ key: row.id, rowId: row.id, row })),
    [rows],
  )

  return (
    <>
      <Table<GridRow>
        className="price-compare-table"
        // 表格没有可见标题: 用 aria-label 给 <table> 一个可访问名称(rc-table 会透传 aria-*)
        aria-label={t('priceCompare.sheet.a11y.table', {
          name: base.sheet.name,
        })}
        size={base.density}
        bordered
        tableLayout="fixed"
        rowKey="key"
        columns={tableColumns}
        dataSource={dataSource}
        pagination={false}
        /* 合计行: 报单吨位合计原先挤在列头里(「报单吨位 合计 260」会把列名截断),
         现在移到表格最下面单独成行, 只填在吨位列下, 其余列留空。
         「添加一行 / 添加隔断」不再占表格行, 移到表格下方的操作条(见 Table 之后)。 */
        summary={() => (
          <Table.Summary.Row className="price-compare-ton-total-row">
            {tableColumns.map((column, index) => (
              <Table.Summary.Cell
                key={column.key ?? index}
                index={index}
                align={column.key === 'ton' ? 'center' : undefined}
              >
                {column.key === 'ton'
                  ? `${t('priceCompare.sheet.tonTotal')} ${tonTotalText}`
                  : null}
              </Table.Summary.Cell>
            ))}
          </Table.Summary.Row>
        )}
        rowClassName={(row) => {
          const classes: string[] = []
          if (isSeparatorRow(row.row))
            classes.push('price-compare-separator-row')
          if (row.rowId === dragId) classes.push('price-compare-dragging')
          if (dragId && row.rowId === dropId && row.rowId !== dragId)
            classes.push(
              dropAfter
                ? 'price-compare-drop-after'
                : 'price-compare-drop-before',
            )
          return classes.join(' ')
        }}
        onRow={(row) => ({
          /*
           * 协作行光标：焦点进出本行时上报/清除。用 capture 阶段而不是给每个输入框接线，
           * 这样不必改列定义（`sheet-columns.tsx` 不在本次范围内）。
           */
          onFocusCapture: onCollabRowFocus
            ? () => onCollabRowFocus(row.rowId)
            : undefined,
          onBlurCapture: onCollabRowFocus
            ? (event) => {
                const next = event.relatedTarget as HTMLElement | null
                // 焦点仍在同一行内（如吨位格 → 备注格）时不清光标
                if (!next || !event.currentTarget.contains(next)) {
                  onCollabRowFocus(null)
                }
              }
            : undefined,
          /*
           * 行容器上的右键入口: 右键行内任意位置等同于点该行的「更多」按钮。
           *
           * 只有**正在编辑**的文本/数字输入控件或下拉才放行原生菜单(粘贴/全选,
           * 见 docs/antd-conventions.md「不在输入控件内劫持右键」); 只读展示格、
           * 已禁用/只读的控件、选择框、拖拽列等一律走行菜单 —— 否则整行铺满输入控件时
           * 右键几乎无处可点(实测只有拖拽列与非输入格能弹菜单)。
           *
           * 「更多」按钮自身已绑定 contextMenu 触发器, 交给它处理避免重复开合。
           */
          onContextMenuCapture: (event) => {
            /*
             * 分隔行没有操作列(不渲染「更多」), 右键必须完全放行:
             * 否则原生菜单被 preventDefault 抑制, 又没有任何自定义菜单, 用户以为卡住了。
             */
            if (isSeparatorRow(row.row)) return
            const target = event.target as HTMLElement
            if (target.closest('.price-compare-row-actions')) return
            if (isEditableFieldTarget(event.target)) return
            /*
             * 只读(他人签出)时整表不可写, 行菜单全部不可用: 放行原生菜单,
             * 原因由可见的「行操作」按钮与摘要行的说明文案给出, 不静默拦截。
             */
            if (base.readOnly) return
            event.preventDefault()
            base.onContextMenuRowChange(row.rowId)
          },
          /*
           * 整行可拖: 拖拽由 <tr> 承载, 不要求用户先找到那个 24px 的手柄。
           * 唯一的例外是「按下点落在输入控件上」—— 那里应该拖选文本, 见 ref 的注释。
           */
          draggable: !rowLocked,
          onMouseDown: (event) => {
            dragFromEditableRef.current = isEditableFieldTarget(event.target)
          },
          onDragStart: (event) => {
            if (rowLocked || dragFromEditableRef.current) {
              event.preventDefault()
              return
            }
            onRowDragStart(row.rowId, event)
          },
          onDragEnd: onRowDragEnd,
          onTouchStart: (event) => onRowTouchStart(row.rowId, event),
          onTouchMove: onRowTouchMove,
          onTouchCancel: cancelLongPress,
          onTouchEnd: cancelLongPress,
          onDragOver: (event) => {
            if (!dragId || rowLocked) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            const rect = event.currentTarget.getBoundingClientRect()
            const after = event.clientY > rect.top + rect.height / 2
            if (dropId !== row.rowId || dropAfter !== after) {
              setDropId(row.rowId)
              setDropAfter(after)
            }
          },
          onDrop: (event) => {
            event.preventDefault()
            if (rowLocked) {
              resetDragState()
              return
            }
            const fromId = event.dataTransfer.getData('text/row-id')
            if (fromId) onReorderRow(fromId, row.rowId, dropAfter)
            resetDragState()
          },
        })}
        scroll={{
          // 列宽随字号缩放, 因此 scroll.x 必须用同一份 widths 求和, 否则字号调大后
          // 表格仍按旧总宽布局, 固定列与内容会错位。
          x:
            SHEET_FIXED_CHROME_WIDTH +
            (base.hideRemark ? 0 : base.widths.remark) +
            base.widths.category +
            base.widths.spec +
            base.widths.ton +
            base.visibleBrandCount *
              (base.widths.net +
                base.widths.spot +
                base.widths.diff +
                base.widths.supplier),
        }}
      />

      {/*
       * 表尾操作条：添加行/隔断从表格 summary 里移出来，贴着卡片底边放。
       * 放进表格行会让它长得像一条数据行、也吃掉了合计行的视觉位置；
       * 作为卡片底栏，低频的「添加隔断」可以弱化，但仍保持可见可点（不用 Tooltip 藏起来）。
       */}
      <div className="price-compare-table-footer">
        <Button
          type="text"
          size="small"
          className="price-compare-add-row"
          icon={<PlusOutlined />}
          disabled={rowLocked}
          // 原因同时给到可见文案与 AT: 只读时不静默禁用
          aria-describedby={rowLocked ? LOCK_REASON_ID : undefined}
          onClick={onAddRow}
        >
          {t('priceCompare.sheet.addRow')}
        </Button>
        <Button
          type="text"
          size="small"
          className="price-compare-add-separator"
          icon={<MinusOutlined />}
          disabled={rowLocked}
          aria-describedby={rowLocked ? LOCK_REASON_ID : undefined}
          onClick={onAddSeparator}
        >
          {t('priceCompare.sheet.addSeparator')}
        </Button>
        {/* 锁定原因常驻可见(不依赖 hover): 禁用按钮不派发鼠标事件, 仅靠 Tooltip 会静默 */}
        {rowLocked ? (
          <Text
            id={LOCK_REASON_ID}
            type="secondary"
            className="price-compare-lock-reason-text"
          >
            {rowLockedReason}
          </Text>
        ) : null}
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- 顶部栏 */

/**
 * 列显示设置: 备注列与整组品牌列的显隐。
 *
 * <p>所有开关都只调用 {@link onToggle} 并带上 {@link SHEET_HIDEABLE_COLUMN} 的 key ——
 * 显隐状态本身由 SheetPanel 持有并持久化(本地 + 云漫游), 这里只负责呈现与派发。</p>
 */
function ColumnSettingsButton({
  hideRemark,
  brands,
  hiddenBrands,
  onToggle,
}: {
  hideRemark: boolean
  brands: Brand[]
  hiddenBrands: string[]
  onToggle: (key: string, visible: boolean) => void
}) {
  const { t } = useTranslation()
  const hiddenBrandSet = new Set(hiddenBrands)
  /* 隐藏列数: NN/g 的表格指南要求「列被隐藏」必须有可见的状态指示 —— 否则用户关掉弹层后
     完全没有线索, 只能靠"感觉少了一列"。徽标与可访问名同时给出这个数。 */
  const hiddenCount = (hideRemark ? 1 : 0) + hiddenBrands.length
  const settingsLabel =
    hiddenCount > 0
      ? t('priceCompare.sheet.columnSettingsHidden', { n: hiddenCount })
      : t('priceCompare.sheet.columnSettings')
  const visibleBrandCount = brands.length - hiddenBrands.length
  const checkbox = (checked: boolean, label: string, key: string) => (
    <Checkbox
      key={key}
      checked={checked}
      onChange={(event) => onToggle(key, event.target.checked)}
    >
      {label}
    </Checkbox>
  )
  /** 一键恢复全部列：比在网格里逐个勾回来快得多。 */
  const showAll = () => {
    if (hideRemark) {
      onToggle(SHEET_HIDEABLE_COLUMN.remark, true)
    }
    for (const brandName of hiddenBrands) {
      onToggle(SHEET_HIDEABLE_COLUMN.brand(brandName), true)
    }
  }
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <Flex vertical gap={10} className="price-compare-column-settings">
          <Flex
            align="center"
            justify="space-between"
            className="price-compare-column-panel-head"
          >
            <Text strong>{t('priceCompare.sheet.columnSettings')}</Text>
            {hiddenCount > 0 ? (
              <Button type="link" size="small" onClick={showAll}>
                {t('priceCompare.sheet.columnPanelShowAll')}
              </Button>
            ) : null}
          </Flex>

          <div className="price-compare-column-panel">
            <span className="price-compare-column-panel-title">
              {t('priceCompare.sheet.columnPanelFixed')}
            </span>
            {checkbox(
              !hideRemark,
              t('priceCompare.sheet.columns.remark'),
              SHEET_HIDEABLE_COLUMN.remark,
            )}
          </div>

          {brands.length ? (
            <>
              <Divider className="price-compare-column-panel-divider" />
              <div className="price-compare-column-panel">
                <Flex justify="space-between" align="center">
                  <span className="price-compare-column-panel-title">
                    {t('priceCompare.sheet.columnPanelBrands')}
                  </span>
                  <Text type="secondary" className="price-compare-sub">
                    {visibleBrandCount}/{brands.length}
                  </Text>
                </Flex>
                <div className="price-compare-column-panel-grid">
                  {brands.map((brand) =>
                    checkbox(
                      !hiddenBrandSet.has(brand.name),
                      brand.name,
                      SHEET_HIDEABLE_COLUMN.brand(brand.name),
                    ),
                  )}
                </div>
              </div>
            </>
          ) : null}
        </Flex>
      }
    >
      <Tooltip title={settingsLabel}>
        <Badge count={hiddenCount} size="small" offset={[-2, 2]}>
          <Button icon={<SettingOutlined />} aria-label={settingsLabel} />
        </Badge>
      </Tooltip>
    </Popover>
  )
}

/** 锁定/解锁参照日期与时段。 */
function LockRefButton({
  sheet,
  readOnly,
  patchSheet,
}: {
  sheet: PriceSheet
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip
      title={
        sheet.locked
          ? t('priceCompare.sheet.unlockRefTooltip')
          : t('priceCompare.sheet.lockRefTooltip')
      }
    >
      <Button
        type={sheet.locked ? 'primary' : 'default'}
        icon={sheet.locked ? <LockOutlined /> : <UnlockOutlined />}
        disabled={readOnly}
        onClick={() => patchSheet(sheet.id, { locked: !sheet.locked })}
      >
        {sheet.locked
          ? t('priceCompare.sheet.unlockRef')
          : t('priceCompare.sheet.lockRef')}
      </Button>
    </Tooltip>
  )
}

/** 锁定/解锁规格与数量。 */
function LockSpecQuantityButton({
  sheet,
  readOnly,
  patchSheet,
}: {
  sheet: PriceSheet
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip
      title={
        sheet.specQuantityLocked
          ? t('priceCompare.sheet.unlockSpecQuantityTooltip')
          : t('priceCompare.sheet.lockSpecQuantityTooltip')
      }
    >
      <Button
        type={sheet.specQuantityLocked ? 'primary' : 'default'}
        icon={sheet.specQuantityLocked ? <LockOutlined /> : <UnlockOutlined />}
        disabled={readOnly}
        onClick={() =>
          patchSheet(sheet.id, {
            specQuantityLocked: !sheet.specQuantityLocked,
          })
        }
      >
        {sheet.specQuantityLocked
          ? t('priceCompare.sheet.unlockSpecQuantity')
          : t('priceCompare.sheet.lockSpecQuantity')}
      </Button>
    </Tooltip>
  )
}

/** 选中行后出现的操作: 删除所选行(手工改价/填供应商入口已随"禁止手动改价"移除)。 */
function SelectedRowActions({
  selectedCount,
  readOnly,
  specQuantityLocked,
  onRemoveSelected,
}: {
  selectedCount: number
  readOnly: boolean
  specQuantityLocked: boolean
  onRemoveSelected: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      {readOnly || specQuantityLocked ? (
        <Tooltip
          title={
            !readOnly && specQuantityLocked
              ? t('priceCompare.sheet.specQuantityLockedHint')
              : undefined
          }
        >
          <span>
            <Button danger icon={<DeleteOutlined />} disabled>
              {t('common.delete')}
            </Button>
          </span>
        </Tooltip>
      ) : (
        <Popconfirm
          title={t('priceCompare.sheet.removeSelectedTitle', {
            selected: selectedCount,
          })}
          okText={t('common.delete')}
          cancelText={t('common.cancel')}
          onConfirm={onRemoveSelected}
        >
          <Button danger icon={<DeleteOutlined />}>
            {t('common.delete')}
          </Button>
        </Popconfirm>
      )}
    </>
  )
}

function SheetHeader({
  sheet,
  refDate,
  refPeriod,
  patchSheet,
  periods,
  onRefresh,
  refreshing,
  onOpenConfig,
  availability,
  bestOn,
  onToggleBest,
  selectedCount,
  onRemoveSelected,
  designatedBrands,
  allowHrb400eFallback = false,
  onToggleHrb400eFallback,
  readOnly = false,
  columnSettingsSlot,
  spotUpdatedAt,
  spotPricesFailed,
  refreshingSpotPrices,
  onRefreshSpotPrices,
}: {
  sheet: PriceSheet
  refDate: string
  refPeriod: string
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  periods: string[]
  onRefresh: () => void
  refreshing: boolean
  onOpenConfig?: () => void
  availability: Record<string, string[]>
  bestOn: boolean
  onToggleBest: () => void
  selectedCount: number
  onRemoveSelected: () => void
  designatedBrands?: string[]
  allowHrb400eFallback?: boolean
  onToggleHrb400eFallback?: () => void
  readOnly?: boolean
  /** 列显示设置按钮: 由 SheetPanel 构造后作为节点下传(不再逐层透传 5 个 props)。 */
  columnSettingsSlot: React.ReactNode
  /** 现货价实时派生：最新修改时间 + 刷新入口（替代原来的手动「导入」）。 */
  spotUpdatedAt?: string
  /** 现货价查询失败：工具栏要明确告知「当前为快照」，并给出重试入口。 */
  spotPricesFailed: boolean
  refreshingSpotPrices: boolean
  onRefreshSpotPrices: () => void
}) {
  return (
    <Flex vertical gap={8} className="price-compare-toolbar">
      <SheetDateFields
        sheet={sheet}
        refDate={refDate}
        refPeriod={refPeriod}
        patchSheet={patchSheet}
        periods={periods}
        availability={availability}
        allowHrb400eFallback={allowHrb400eFallback}
        readOnly={readOnly}
      />

      <SheetMetaRow designatedBrands={designatedBrands} />

      <SheetActionRow
        sheet={sheet}
        readOnly={readOnly}
        patchSheet={patchSheet}
        bestOn={bestOn}
        onToggleBest={onToggleBest}
        refreshing={refreshing}
        onRefresh={onRefresh}
        columnSettingsSlot={columnSettingsSlot}
        onOpenConfig={onOpenConfig}
        selectedCount={selectedCount}
        onRemoveSelected={onRemoveSelected}
        spotUpdatedAt={spotUpdatedAt}
        spotPricesFailed={spotPricesFailed}
        refreshingSpotPrices={refreshingSpotPrices}
        onRefreshSpotPrices={onRefreshSpotPrices}
        allowHrb400eFallback={allowHrb400eFallback}
        onToggleHrb400eFallback={onToggleHrb400eFallback}
      />
    </Flex>
  )
}

/**
 * 表头第一行: 项目名 + 报单日期 + 参照日期/时段 + E 兜底标记。
 * 从 SheetHeader 拆出: 该行分支较多, 混在表头里会让表头控制流难以跟进。
 */
function SheetDateFields({
  sheet,
  refDate,
  refPeriod,
  patchSheet,
  periods,
  availability,
  allowHrb400eFallback,
  readOnly,
}: {
  sheet: PriceSheet
  refDate: string
  refPeriod: string
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  periods: string[]
  availability: Record<string, string[]>
  allowHrb400eFallback: boolean
  readOnly: boolean
}) {
  const { t } = useTranslation()
  const dateFormat = t('priceCompare.sheet.dateFormat')
  return (
    <Flex align="center" wrap="wrap" gap={8}>
      <Flex gap="small" align="center" wrap="wrap">
        <Text strong>
          {sheet.projectName || t('priceCompare.sheet.unspecifiedProject')}
        </Text>
        <Space size="small">
          <Text type="secondary" className="price-compare-sub">
            {t('priceCompare.sheet.orderDate')}
          </Text>
          {/*
            宽度必须放得下 `YYYY年MM月DD日`：132px 在 size="small" 下会把「日」截掉
            （实测只显示到「2026年10月19」，用户看不出是哪一天）。156px 留出图标与内边距。
          */}
          <DatePicker
            size="small"
            style={{ width: 156 }}
            value={sheet.orderDate ? dayjs(sheet.orderDate) : null}
            format={dateFormat}
            allowClear={false}
            disabled={readOnly}
            onChange={(value) =>
              value &&
              patchSheet(sheet.id, { orderDate: value.format('YYYY-MM-DD') })
            }
          />
        </Space>
        <Space size="small">
          <Tooltip title={t('priceCompare.sheet.refDateTooltip')}>
            <Text type="secondary" className="price-compare-sub">
              <InfoCircleOutlined /> {t('priceCompare.sheet.refPrice')}
            </Text>
          </Tooltip>
          <DatePicker
            size="small"
            style={{ width: 156 }}
            className={
              sheet.locked && !readOnly
                ? 'price-compare-locked-field'
                : undefined
            }
            value={refDate ? dayjs(refDate) : null}
            format={dateFormat}
            allowClear={false}
            disabled={readOnly || Boolean(sheet.locked)}
            cellRender={(current, info) => {
              if (info.type !== 'date') return info.originNode
              const key = (current as dayjs.Dayjs).format('YYYY-MM-DD')
              const periods = availability[key] ?? []
              return (
                <div className="price-compare-cal-cell">
                  {info.originNode}
                  <div className="price-compare-cal-dots">
                    {['上午', '中午', '下午'].map((period) => (
                      <i
                        key={period}
                        className={periods.includes(period) ? 'is-on' : ''}
                      />
                    ))}
                  </div>
                </div>
              )
            }}
            onChange={(value) => {
              if (!value) return
              patchSheet(sheet.id, { refDate: value.format('YYYY-MM-DD') })
            }}
          />
          <Select
            size="small"
            style={{ width: 110 }}
            aria-label={t('priceCompare.sheet.a11y.refPeriod')}
            className={
              sheet.locked && !readOnly
                ? 'price-compare-locked-field'
                : undefined
            }
            value={refPeriod || undefined}
            disabled={readOnly || Boolean(sheet.locked)}
            /* 同一契约: 固定窄宽选择器不限制下拉宽度(时段名将来变长也不会被截断)。 */
            popupMatchSelectWidth={false}
            onChange={(value) => patchSheet(sheet.id, { refPeriod: value })}
            options={periods.map((period) => ({
              value: period,
              label: period,
            }))}
          />
        </Space>
        {allowHrb400eFallback ? (
          <Tooltip title={t('priceCompare.sheet.fallbackTooltip')}>
            <Space size={4} align="center">
              {/* 图例 chip 是装饰：意义由紧邻文案表达，读屏不必单独念一个 "E" */}
              <FallbackBadge />
              <Text type="secondary" className="price-compare-sub">
                {t('priceCompare.sheet.fallbackLegend')}
              </Text>
            </Space>
          </Tooltip>
        ) : null}
      </Flex>
    </Flex>
  )
}

/** 表头第二行: 指定品牌（备注字段已从页面移除，行级备注仍在表格列里）。 */
function SheetMetaRow({ designatedBrands }: { designatedBrands?: string[] }) {
  const { t } = useTranslation()
  return (
    <Flex
      gap="small"
      align="center"
      wrap="wrap"
      className="price-compare-meta-row"
    >
      <Space size={4} align="center" className="price-compare-meta-field">
        <span className="price-compare-sub">
          {t('priceCompare.config.designatedBrands')}
        </span>
        {designatedBrands?.length ? (
          <Flex gap={4} wrap="wrap" align="center">
            {designatedBrands.map((brand) => (
              <Tag key={brand} color="blue" style={{ marginInlineEnd: 0 }}>
                {brand}
              </Tag>
            ))}
          </Flex>
        ) : (
          <Text type="secondary">-</Text>
        )}
      </Space>
    </Flex>
  )
}

/** 表头操作行: 锁定/最优/刷新/列设置/配置 + 选中行批量操作。 */
function SheetActionRow({
  sheet,
  readOnly,
  patchSheet,
  bestOn,
  onToggleBest,
  refreshing,
  onRefresh,
  columnSettingsSlot,
  onOpenConfig,
  selectedCount,
  onRemoveSelected,
  spotUpdatedAt,
  spotPricesFailed,
  refreshingSpotPrices,
  onRefreshSpotPrices,
  allowHrb400eFallback,
  onToggleHrb400eFallback,
}: {
  sheet: PriceSheet
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  bestOn: boolean
  onToggleBest: () => void
  refreshing: boolean
  onRefresh: () => void
  columnSettingsSlot: React.ReactNode
  onOpenConfig?: () => void
  selectedCount: number
  onRemoveSelected: () => void
  /** 本批现货价里最新的修改时间（供应商价格表条目时间）；缺省表示还没取到。 */
  spotUpdatedAt?: string
  /** 现货价查询失败：明确告知「当前为快照」并给出重试入口。 */
  spotPricesFailed: boolean
  refreshingSpotPrices: boolean
  onRefreshSpotPrices: () => void
  allowHrb400eFallback: boolean
  onToggleHrb400eFallback?: () => void
}) {
  const { t } = useTranslation()

  return (
    <Space size={4} wrap className="price-compare-action-row">
      <LockRefButton
        sheet={sheet}
        readOnly={readOnly}
        patchSheet={patchSheet}
      />
      <LockSpecQuantityButton
        sheet={sheet}
        readOnly={readOnly}
        patchSheet={patchSheet}
      />
      <Button
        type={bestOn ? 'primary' : 'default'}
        icon={<TrophyOutlined />}
        onClick={onToggleBest}
      >
        {t('priceCompare.sheet.bestDiff')}
      </Button>
      <Button
        icon={<ReloadOutlined />}
        loading={refreshing}
        onClick={onRefresh}
      >
        {t('priceCompare.sheet.refreshNetPrices')}
      </Button>
      {/*
       * 现货价改为实时派生后不再需要「导入」这个手动动作：价格随查询自动带出。
       * 保留一个刷新入口 + 更新时间，让用户知道屏幕上这个价是什么时候的。
       */}
      <Button
        icon={<ReloadOutlined />}
        loading={refreshingSpotPrices}
        onClick={onRefreshSpotPrices}
      >
        {t('priceCompare.sheet.refreshSpotPrices')}
      </Button>
      {/*
       * 现货价查询失败：价格会回退到单据里的快照值（`liveInputs` 用 sheet.inputs），
       * 界面看起来"一切正常"，用户不会知道价格其实没刷新。所以失败必须在工具栏说清
       * 「当前为快照」并给一次性重试入口，而不是只依赖 toast / 控制台。
       *
       * role="status" 让读屏在失败发生时念出来；重试按钮保持键盘可达（antd Button 原生）。
       * 文案 key 由 Lead 统一补 zh/en，本分支先用 defaultValue 兜底，避免界面露出原始 key。
       */}
      {spotPricesFailed ? (
        <Flex align="center" gap={4} className="price-compare-spot-error">
          <Text type="warning" role="status">
            {t('priceCompare.sheet.spotPricesFailed', {
              defaultValue: '现货价获取失败，当前为快照',
            })}
          </Text>
          <Button size="small" onClick={onRefreshSpotPrices}>
            {t('priceCompare.sheet.spotPricesRetry', { defaultValue: '重试' })}
          </Button>
        </Flex>
      ) : null}
      {onToggleHrb400eFallback ? (
        <Tooltip title={t('priceCompare.sheet.hrb400eFallbackHint')}>
          <Button
            icon={<SwapOutlined />}
            type={allowHrb400eFallback ? 'primary' : 'default'}
            disabled={readOnly}
            onClick={onToggleHrb400eFallback}
          >
            {allowHrb400eFallback
              ? t('priceCompare.sheet.hrb400eFallbackOff')
              : t('priceCompare.sheet.fillHrb400e')}
          </Button>
        </Tooltip>
      ) : null}
      {spotUpdatedAt ? (
        <Text type="secondary" className="price-compare-spot-updated-at">
          {t('priceCompare.sheet.spotUpdatedAt', {
            time: dayjs(spotUpdatedAt).format('MM-DD HH:mm'),
          })}
        </Text>
      ) : null}
      {columnSettingsSlot}
      {onOpenConfig ? (
        <Button icon={<SettingOutlined />} onClick={onOpenConfig}>
          {t('priceCompare.sheet.config')}
        </Button>
      ) : null}
      {selectedCount > 0 ? (
        <SelectedRowActions
          selectedCount={selectedCount}
          readOnly={readOnly}
          specQuantityLocked={Boolean(sheet.specQuantityLocked)}
          onRemoveSelected={onRemoveSelected}
        />
      ) : null}
    </Space>
  )
}

/* ------------------------------------------------------------------- 主体 */

type Props = {
  sheet: PriceSheet
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  density: 'small' | 'middle' | 'large'
  /** 迁移兜底用的旧「项目级 12 米加价」，只在定尺主数据为空时生效（见 core.netPrice）。 */
  lengthPremium: number
  /**
   * 定尺名称 → 每吨加价（来自定尺主数据）。
   *
   * <p>缺省/空表时 `netPrice` 回退旧口径（迁移兜底），因此既有调用点（含测试）不传也能工作。
   * 页面层用 `useLengthPremiumOptions()` 读一次传下来，避免逐行请求。</p>
   */
  lengthPremiums?: Readonly<Record<string, number>>
  patchSheet: (
    id: string,
    patch: Partial<PriceSheet>,
    coalesceKey?: string,
  ) => void
  setRows: (updater: (rows: PriceRow[]) => PriceRow[]) => void
  onReorderBrands: (from: number, to: number) => void
  periods: string[]
  onRefresh: () => void
  refreshing?: boolean
  onOpenConfig?: () => void
  allowHrb400eFallback?: boolean
  /**
   * 切换「HRB400 缺精确现货价时用 HRB400E 现货价填入」。
   *
   * <p>沿用项目配置里的 `hrb400eFallback`（同一业务口径只在一处），
   * 这里只是把它做成报单比价工具栏上可点的快捷按钮。</p>
   */
  onToggleHrb400eFallback?: () => void
  allowedProducts?: string[]
  availability?: Record<string, string[]>
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
  designatedBrands?: string[]
  /** 被他人签出编辑时只读(禁用编辑类交互) */
  readOnly?: boolean
}

/** 单个报单: 一张扁平表格展示全部行; 现货价与供应商由「从供应商价格表导入」统一写入。 */
export function SheetPanel(props: Props) {
  const {
    sheet,
    data,
    varieties,
    brands,
    rows,
    density,
    lengthPremium,
    lengthPremiums = EMPTY_LENGTH_PREMIUMS,
    patchSheet,
    setRows,
    onReorderBrands,
    periods,
    onRefresh,
    refreshing = false,
    onOpenConfig,
    allowHrb400eFallback = false,
    onToggleHrb400eFallback,
    allowedProducts = [],
    availability = {},
    chrome = true,
    spotRef,
    designatedBrands,
    readOnly: readOnlyProp = false,
  } = props
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bestOn, setBestOn] = useState(false)
  /** 仅临时(不持久化)的列显隐: 备注列与整组品牌列。 */
  /**
   * 列显隐(备注 / 整组品牌)走统一的用户偏好持久化: 本地立即写入 + 云端漫游同步,
   * 刷新与换设备都保留。
   *
   * <p>此前是纯内存 state(注释自称"仅临时列显隐"), 用户隐藏列后一刷新就复位 ——
   * 这正是本次要修的缺陷。key 统一来自 {@link SHEET_HIDEABLE_COLUMN}, 避免列设置弹层、
   * 品牌列头菜单与持久化各写一套字符串。</p>
   */
  const columnSettings = useColumnSettingsSupport(
    PRICE_COMPARE_COLUMN_SETTINGS_KEY,
    [],
    /* 分母是表格的**总列数**(勾选+拖拽/备注/类别/规格/报单吨位 + 每个品牌 4 列) ——
       它是 hook 判定「隐藏比例异常」的基数。传「可显隐列数」会把正常操作误判成脏数据:
       例如 3 个品牌时隐藏备注与两个品牌组就是 3/5, 直接触发静默重置。 */
    5 + brands.length * 4,
  )
  const columnVisibility = columnSettings.columnVisibility
  const setColumnVisible = (key: string, visible: boolean) =>
    columnSettings.handleColumnVisibilityChange((current) => ({
      ...current,
      [key]: visible,
    }))
  const hideRemark = columnVisibility[SHEET_HIDEABLE_COLUMN.remark] === false
  const hiddenBrands = brands
    .filter(
      (brand) =>
        columnVisibility[SHEET_HIDEABLE_COLUMN.brand(brand.name)] === false,
    )
    .map((brand) => brand.name)
  /** 行操作菜单当前打开的行: 右键行内区域与「更多」按钮共用一个受控开关。 */
  const [contextMenuRowId, setContextMenuRowId] = useState<string | null>(null)
  const hiddenBrandSet = new Set(hiddenBrands)
  const toggleBrandVisible = (brandName: string, visible: boolean) =>
    setColumnVisible(SHEET_HIDEABLE_COLUMN.brand(brandName), visible)
  const { refDate, refPeriod } = resolveRef(data, sheet)
  const varietyByLabel = useMemo(
    () =>
      new Map(
        varieties.map((item) => [
          `${item.category}|${item.material}|${item.spec}|${item.length}`,
          item,
        ]),
      ),
    [varieties],
  )

  /*
   * 现货价改为**实时派生**（2026-11-14）：报单比价只填规格与吨位，价格全部只读。
   *
   * <p>数据流：供应商价格表 → `lowest-quotes`（服务端按品牌+商品取最低一家）→
   * `importLowestQuotes`（纯函数，沿用原有匹配/代取规则）→ 渲染用的 inputs。</p>
   *
   * <p>**不落库**：派生结果只参与渲染与合计，保存时不再携带 prices（见 sheet-snapshot）。
   * 因此供应商改价后刷新页面即可看到最新价，不再需要"导入"这个手动动作。</p>
   *
   * <p>**自动同步节奏**（用户实测要求：供应商改价后报单比价要自动跟上）：全站默认
   * `refetchOnWindowFocus: false`，这里显式打开焦点刷新与重连刷新，并加 60s 轮询；
   * `staleTime` 压到 15s —— 页面开着不放时最迟约 1 分钟、切回标签页约 15s 内即更新。
   * 供应商价格表本身是共享数据、单次查询只返回每格最低价（约几百行），轮询成本可接受；
   * 需要立刻刷新时仍有工具栏「刷新现货价」按钮。</p>
   */
  const lowestQuotesQuery = useQuery({
    queryKey: ['supplier-price-lowest-quotes'],
    queryFn: ({ signal }) => fetchLowestBrandQuotes(undefined, signal),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 60_000,
  })
  const liveInputs = useMemo(() => {
    if (!lowestQuotesQuery.data) return sheet.inputs
    return importLowestQuotes(
      { ...sheet, rows, brands },
      lowestQuotesQuery.data,
      { allowHrb400eFallback },
    ).inputs
  }, [allowHrb400eFallback, brands, lowestQuotesQuery.data, rows, sheet])
  /** 渲染用快照：价格来自派生结果，其余字段与 sheet 一致。 */
  const sheetWithLivePrices = useMemo(
    () => ({ ...sheet, inputs: liveInputs }),
    [liveInputs, sheet],
  )
  /**
   * 「现货价修改时间」：只统计**本批次实际用到**的报价。
   *
   * <p>供应商价格表按条目记 updated_at（V217）；一格一个时间太碎，这里聚合到"整批价
   * 最新是什么时候改的"，用户据此判断要不要让供应商重新报价。</p>
   *
   * <p>聚合口径必须限定在**已有格子命中的报价**上：`importLowestQuotes` 命中某格时会把
   * 该条报价的 `updatedAt` 写进单元格（`spotUpdatedAt`），因此这里只遍历派生 `liveInputs`
   * 即可。价格表里其它品牌/其它商品、以及没被任何行用到的报价（例如不在本单范围、
   * 或仅作为代取候选但最终没代取的 HRB400E）都不参与 —— 否则一个无关报价的修改时间
   * 会让用户误以为本单价格已经刷新过。</p>
   */
  const spotUpdatedAt = useMemo(() => {
    let latest: string | undefined
    for (const input of Object.values(liveInputs)) {
      const updatedAt = input?.spotUpdatedAt
      if (updatedAt && (!latest || updatedAt > latest)) {
        latest = updatedAt
      }
    }
    return latest
  }, [liveInputs])

  /**
   * 「刷新现货价」按钮的转圈只跟**手动**刷新走。
   *
   * <p>`lowestQuotesQuery.isFetching` 在 60s 轮询、窗口重新聚焦、网络重连时都会变 true；
   * 直接拿它当 loading 会让按钮在后台上定时闪一下，看起来像有人在点。这里单独跟踪一次
   * 手动刷新，后台刷新不打扰用户。</p>
   */
  const [refreshingSpotPrices, setRefreshingSpotPrices] = useState(false)
  const { refetch: refetchLowestQuotes } = lowestQuotesQuery
  const handleRefreshSpotPrices = useCallback(async () => {
    setRefreshingSpotPrices(true)
    await refetchLowestQuotes()
    setRefreshingSpotPrices(false)
  }, [refetchLowestQuotes])

  // 单元格只读取数与行级写入动作抽到 use-sheet-panel-inputs.ts:
  // 现货价/供应商不再有手工写入动作(唯一来源是供应商价格表实时派生)。
  const {
    getSpot,
    patchRow: patchRowRest,
    getInput,
  } = useSheetPanelInputActions({
    setRows,
    sheet: sheetWithLivePrices,
  })

  /*
   * 报单比价实时协作（只协作「报单吨位 + 行备注」）。
   *
   * <p>开关关闭 / 没拿到票据 / 单据还没保存到服务端（无 sheetId）时 `mode` 恒为 `rest`，
   * patchRow 原样走既有 REST 保存链路，行为与改动前一致。</p>
   */
  const quoteSheetCollab = useQuoteSheetCollab({
    enabled: isCollabFeatureEnabled(),
    rows,
    setRows,
    sheetId: sheet.serverId,
  })
  const collabActive = quoteSheetCollab.mode === 'collab'
  /**
   * 只读判定：原有「他人签出」+ 协作票据 `writable=false`（只读席位）。
   *
   * <p>合并成一处再往下传：吨位/备注输入、行操作、增删行都会跟着只读，
   * 不会出现"能加行却改不了吨位"的半截只读。</p>
   */
  const readOnly = readOnlyProp || (collabActive && !quoteSheetCollab.writable)

  /**
   * 行级写入的统一入口（唯一的「协作还是 REST」分岔点）。
   *
   * <p>只有**纯 ton/remark** 的补丁进 Y.Doc；带其它字段（规格/锁定/行结构）的补丁
   * 一律走原路径 —— 结构变更不进 CRDT。写文档后由 hook 的观察者通过 `setRows`
   * 把值应用回 rows，因此本地与远端是同一条数据通路。</p>
   */
  const patchRow = (rowId: string, patch: Partial<PriceRow>) => {
    const keys = Object.keys(patch)
    const collaborative =
      collabActive &&
      keys.length > 0 &&
      keys.every((key) => key === 'ton' || key === 'remark')
    if (collaborative) {
      quoteSheetCollab.patchItem(rowId, {
        ...('ton' in patch ? { ton: patch.ton ?? null } : {}),
        ...('remark' in patch ? { remark: patch.remark ?? null } : {}),
      })
      return
    }
    patchRowRest(rowId, patch)
  }

  const toggleSelect = (rowId: string, checked: boolean) =>
    setSelectedIds((current) =>
      checked
        ? current.includes(rowId)
          ? current
          : [...current, rowId]
        : current.filter((id) => id !== rowId),
    )

  /** 整行增删/排序(含右键菜单的上移/下移/插入/删除)统一来自该 hook。 */
  const {
    removeSelected,
    reorderRow,
    addRow,
    addSeparator,
    moveRow,
    insertRowAt,
    deleteRow,
  } = useSheetRowOperations({
    rows,
    selectedIds,
    setRows,
    brands,
    sheet,
    patchSheet,
    setSelectedIds,
  })

  const columnWidths = useSheetColumnWidths()

  const base = {
    sheet: sheetWithLivePrices,
    t,
    // 列宽随个人设置字号等比缩放: 字号调大后不再把「材质 / 规格 / 长度」等列裁断
    widths: columnWidths,
    refDate,
    refPeriod,
    lengthPremium,
    lengthPremiums,
    varietyByLabel,
    data,
    varieties,
    brands,
    density,
    getSpot,
    getInput,
    patchRow,
    onReorderBrands,
    onToggleBrand: toggleBrandVisible,
    contextMenuRowId,
    onContextMenuRowChange: setContextMenuRowId,
    moveRow,
    insertRowAt,
    deleteRow,
    selectedIds,
    toggleSelect,
    allowHrb400eFallback,
    bestOn,
    allowedProducts,
    spotRef,
    readOnly,
    hideRemark,
    hiddenBrands,
    varietyOptionsFlat: filterVarieties(varieties, brands, allowedProducts),
    visibleBrandCount: brands.reduce(
      (count, brand) => (hiddenBrandSet.has(brand.name) ? count : count + 1),
      0,
    ),
  }

  const content = (
    <>
      <SheetHeader
        sheet={sheet}
        refDate={refDate}
        refPeriod={refPeriod}
        patchSheet={patchSheet}
        periods={periods}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onOpenConfig={onOpenConfig}
        availability={availability}
        bestOn={bestOn}
        onToggleBest={() => setBestOn((value) => !value)}
        selectedCount={selectedIds.length}
        onRemoveSelected={removeSelected}
        designatedBrands={designatedBrands}
        allowHrb400eFallback={allowHrb400eFallback}
        onToggleHrb400eFallback={onToggleHrb400eFallback}
        readOnly={readOnly}
        spotUpdatedAt={spotUpdatedAt}
        // 用 `error != null` 而不是 `isError`：初次取数失败与「已取到数据后轮询/手动刷新失败」
        // 都要提示，否则屏幕上留着上一轮价格、用户完全不知道这次没取到新价。
        spotPricesFailed={lowestQuotesQuery.error != null}
        refreshingSpotPrices={refreshingSpotPrices}
        onRefreshSpotPrices={() => void handleRefreshSpotPrices()}
        columnSettingsSlot={
          <ColumnSettingsButton
            hideRemark={hideRemark}
            brands={brands}
            hiddenBrands={hiddenBrands}
            onToggle={setColumnVisible}
          />
        }
      />

      {/*
       * 协作状态与在线名单：未开启协作时 CollabStatusBar 渲染 null，
       * 外层不渲染，页面结构与改动前一致。
       */}
      {quoteSheetCollab.state !== 'disabled' ? (
        <div className="price-compare-collab-status">
          <CollabStatusBar
            peers={quoteSheetCollab.peers}
            state={quoteSheetCollab.state}
            writable={quoteSheetCollab.writable}
          />
        </div>
      ) : null}

      <SheetTable
        rows={rows}
        base={{
          ...base,
          moveFocusTon: moveFocusTon(rows),
        }}
        collabPeersOfRow={
          collabActive ? quoteSheetCollab.peersOfRow : undefined
        }
        onCollabRowFocus={collabActive ? quoteSheetCollab.setCursor : undefined}
        onReorderRow={reorderRow}
        onAddRow={addRow}
        onAddSeparator={addSeparator}
      />
    </>
  )

  if (!chrome) return content
  return (
    <Card
      className="price-compare-sheet-card"
      size="small"
      /*
       * 卡片不再给整块内容统一内边距：工具区单独留白，表格直接贴到卡片左右边缘
       * （与供应商报价表的「表格即卡片」一致）；否则表格四周一圈白边会显得像后台里的嵌入表格。
       */
      styles={{ body: { padding: 0 } }}
    >
      {content}
    </Card>
  )
}
