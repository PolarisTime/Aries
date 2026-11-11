import {
  DeleteOutlined,
  InfoCircleOutlined,
  LockOutlined,
  MinusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TagsOutlined,
  TrophyOutlined,
  UnlockOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons'
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
import dayjs from 'dayjs'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchLowestBrandQuotes } from '@/api/market/supplier-price-lists'
import { isEditableFieldTarget } from '@/components/row-context-menu'
import { useColumnSettingsSupport } from '@/hooks/useColumnSettingsSupport'
import { message } from '@/utils/antd-app'
import {
  EMPTY_LENGTH_PREMIUMS,
  filterVarieties,
  isSeparatorRow,
  PRICE_COMPARE_COLUMN_SETTINGS_KEY,
  resolveRef,
  SHEET_HIDEABLE_COLUMN,
  type SupplierSelectOption,
} from './core'
import { LockableField } from './LockableField'
import { SpotSyncActions } from './SpotSyncActions'
import {
  buildSheetColumns,
  type ColumnContext,
  FallbackBadge,
  SupplierFillSelect,
} from './sheet-columns'
import { moveFocus, moveFocusTon } from './sheet-focus-navigation'
import { applyLowestQuotes } from './spot-from-price-list'
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
 * 选择框(32) / 拖拽手柄(24) 两列的总宽。
 * 这两列只放 icon-only 控件, 尺寸由命中区下限(WCAG 2.5.8)决定, 不随字号变化,
 * 因此不参与 core.sheetColumnWidths 的等比换算。
 *
 * <p>「行操作」列(锁定/更多按钮)已移除: 行级锁定与行操作统一走右键菜单与工具栏入口,
 * 单独的一列只在窄屏挤占宽度。</p>
 */
const SHEET_FIXED_CHROME_WIDTH = 32 + 24

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
}

function SheetTable(props: SheetTableProps) {
  const { rows, base, onReorderRow, onAddRow, onAddSeparator } = props
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
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      summary={() => (
        <>
          <Table.Summary.Row>
            <Table.Summary.Cell
              index={0}
              /* 跨列数必须等于这一行左侧的全部列: 固定列(选择/行操作/备注/类别/规格) + 报单吨位列。
                 原式漏算吨位列, 于是这一格的背景只铺到「材质/规格」列就在吨位处断掉,
                 整行像被切了一刀(有了浅底之后尤其明显)。 */
              colSpan={(base.hideRemark ? 4 : 5) + base.visibleBrandCount * 4}
            >
              <Flex gap="small" align="center">
                {/* 不用 block: 两个入口平分整行宽度会把「添加隔断」推到表格中间,
                    与「添加一行」之间隔着半张表。改为相邻左对齐。 */}
                <Button
                  type="text"
                  size="small"
                  className="price-compare-add-row"
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
              </Flex>
            </Table.Summary.Cell>
          </Table.Summary.Row>
          {/* 合计行: 报单吨位合计原先挤在列头里(「报单吨位 合计 260」会把列名截断),
            现在移到表格最下面单独成行, 只填在吨位列下, 其余列留空。 */}
          <Table.Summary.Row className="price-compare-ton-total-row">
            {columns.map((column, index) => (
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
        </>
      )}
      rowClassName={(row) => {
        const classes: string[] = []
        if (isSeparatorRow(row.row)) classes.push('price-compare-separator-row')
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
  const checkbox = (checked: boolean, label: string, key: string) => (
    <Checkbox
      key={key}
      checked={checked}
      onChange={(event) => onToggle(key, event.target.checked)}
    >
      {label}
    </Checkbox>
  )
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <Flex vertical gap={4} className="price-compare-column-settings">
          {checkbox(
            !hideRemark,
            t('priceCompare.sheet.columns.remark'),
            SHEET_HIDEABLE_COLUMN.remark,
          )}
          {brands.length ? (
            <>
              <Divider className="my-4" />
              <Text type="secondary" className="price-compare-sub">
                {t('priceCompare.sheet.columns.brand')}
              </Text>
              {brands.map((brand) =>
                checkbox(
                  !hiddenBrandSet.has(brand.name),
                  brand.name,
                  SHEET_HIDEABLE_COLUMN.brand(brand.name),
                ),
              )}
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

/** 批量填入「选中行」: 先选品牌列, 再选供应商; 覆盖所选行已有简称。 */
function SupplierFillSelectedButton({
  brands,
  options,
  selectedCount,
  disabled,
  onFill,
}: {
  brands: Brand[]
  options: SupplierSelectOption[]
  selectedCount: number
  disabled: boolean
  onFill: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
}) {
  const { t } = useTranslation()
  const [brandName, setBrandName] = useState<string | undefined>()
  const [open, setOpen] = useState(false)
  const title = t('priceCompare.sheet.fillSupplierSelected', {
    count: selectedCount,
  })
  return (
    <Popover
      trigger="click"
      placement="bottom"
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setBrandName(undefined)
      }}
      content={
        <Flex vertical gap={6} className="price-compare-supplier-fill">
          <Text type="secondary" className="price-compare-sub">
            {title}
          </Text>
          <Select
            size="small"
            style={{ width: 220 }}
            className="price-compare-supplier-fill-brand"
            placeholder={t('priceCompare.sheet.fillSupplierBrand')}
            value={brandName}
            /* 与表内下拉同一契约: 窄选择器不限制下拉宽度, 选项文本不被省略号截断。 */
            popupMatchSelectWidth={false}
            options={brands.map((brand) => ({
              value: brand.name,
              label: brand.name,
            }))}
            onChange={(value) => setBrandName(value)}
          />
          <SupplierFillSelect
            brandName={brandName}
            options={options}
            onPick={(option) => {
              if (!brandName) return
              onFill(brandName, option)
              setOpen(false)
            }}
          />
        </Flex>
      }
    >
      <Button
        icon={<VerticalAlignBottomOutlined />}
        disabled={disabled}
        className="price-compare-fill-selected-btn"
      >
        {t('priceCompare.sheet.fillSupplier')}
      </Button>
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
  sheets?: readonly PriceSheet[]
  resolveSyncBrands?: (sheet: PriceSheet) => readonly string[]
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

/** 选中行后出现的操作: 批量填入供应商 + 标记已采购 + 删除所选行。 */
function SelectedRowActions({
  brands,
  supplierOptions,
  selectedCount,
  readOnly,
  specQuantityLocked,
  onFillSupplierSelected,
  onRemoveSelected,
}: {
  brands: Brand[]
  supplierOptions: SupplierSelectOption[]
  selectedCount: number
  readOnly: boolean
  specQuantityLocked: boolean
  onFillSupplierSelected: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
  onRemoveSelected: () => void
}) {
  const { t } = useTranslation()
  return (
    <>
      <SupplierFillSelectedButton
        brands={brands}
        options={supplierOptions}
        selectedCount={selectedCount}
        disabled={readOnly || specQuantityLocked}
        onFill={onFillSupplierSelected}
      />
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
  sheets,
  resolveSyncBrands,
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
  remark,
  onRemarkChange,
  allowHrb400eFallback = false,
  readOnly = false,
  brands,
  columnSettingsSlot,
  supplierOptions,
  onFillSupplierSelected,
}: {
  sheet: PriceSheet
  sheets?: readonly PriceSheet[]
  resolveSyncBrands?: (sheet: PriceSheet) => readonly string[]
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
  remark?: string
  onRemarkChange?: (value: string) => void
  allowHrb400eFallback?: boolean
  readOnly?: boolean
  brands: Brand[]
  /** 列显示设置按钮: 由 SheetPanel 构造后作为节点下传(不再逐层透传 5 个 props)。 */
  columnSettingsSlot: React.ReactNode
  supplierOptions: SupplierSelectOption[]
  onFillSupplierSelected: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
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

      <SheetMetaRow
        readOnly={readOnly}
        remark={remark}
        onRemarkChange={onRemarkChange}
        designatedBrands={designatedBrands}
      />

      <SheetActionRow
        allowHrb400eFallback={allowHrb400eFallback}
        sheet={sheet}
        sheets={sheets}
        resolveSyncBrands={resolveSyncBrands}
        readOnly={readOnly}
        patchSheet={patchSheet}
        bestOn={bestOn}
        onToggleBest={onToggleBest}
        refreshing={refreshing}
        onRefresh={onRefresh}
        brands={brands}
        columnSettingsSlot={columnSettingsSlot}
        onOpenConfig={onOpenConfig}
        selectedCount={selectedCount}
        supplierOptions={supplierOptions}
        onFillSupplierSelected={onFillSupplierSelected}
        onRemoveSelected={onRemoveSelected}
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

/** 表头第二行: 备注(只读态直接展示) + 指定品牌。 */
function SheetMetaRow({
  readOnly,
  remark,
  onRemarkChange,
  designatedBrands,
}: {
  readOnly: boolean
  remark?: string
  onRemarkChange?: (value: string) => void
  designatedBrands?: string[]
}) {
  const { t } = useTranslation()
  return (
    <Flex
      gap="small"
      align="center"
      wrap="wrap"
      className="price-compare-meta-row"
    >
      {readOnly ? (
        <Space size={4} align="center" className="price-compare-meta-field">
          <span className="price-compare-sub">
            {t('priceCompare.sheet.remark')}
          </span>
          <Text type="secondary">{remark || '-'}</Text>
        </Space>
      ) : (
        <LockableField
          label={t('priceCompare.sheet.remark')}
          value={remark ?? ''}
          width={220}
          onConfirm={(value) => onRemarkChange?.(value)}
        />
      )}
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
  sheets,
  resolveSyncBrands,
  readOnly,
  patchSheet,
  bestOn,
  onToggleBest,
  refreshing,
  onRefresh,
  brands,
  columnSettingsSlot,
  onOpenConfig,
  selectedCount,
  supplierOptions,
  onFillSupplierSelected,
  onRemoveSelected,
  allowHrb400eFallback,
}: {
  /** 单据头「允许按 HRB400E 代取」开关：从 PriceCompareView 一路串下来，是代取唯一授权来源。 */
  allowHrb400eFallback: boolean
  sheet: PriceSheet
  sheets?: readonly PriceSheet[]
  resolveSyncBrands?: (sheet: PriceSheet) => readonly string[]
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  bestOn: boolean
  onToggleBest: () => void
  refreshing: boolean
  onRefresh: () => void
  brands: Brand[]
  columnSettingsSlot: React.ReactNode
  onOpenConfig?: () => void
  selectedCount: number
  supplierOptions: SupplierSelectOption[]
  onFillSupplierSelected: (
    brandName: string,
    option: { value: string; label: string } | undefined,
  ) => void
  onRemoveSelected: () => void
}) {
  const { t } = useTranslation()
  // 未传全量批次时退化为"只有当前批次"：项目级/全部同步与批次内同步等价，不会误写别处
  const syncSheets = useMemo(() => sheets ?? [sheet], [sheet, sheets])

  /**
   * 从品牌价格表带价：按 (品牌, 商品) 取最低价，**只填空格子**（见 applyLowestQuotes）。
   *
   * <p>为什么不做成"进页面就自动填"：报单比价里现货价是业务员的判断结果，自动填充会让人分不清
   * 「我填的」和「系统带的」。做成显式动作 + 事后提示条数，来源才可追溯。</p>
   */
  const [fillingFromPriceList, setFillingFromPriceList] = useState(false)
  const fillFromPriceList = async () => {
    setFillingFromPriceList(true)
    try {
      const quotes = await fetchLowestBrandQuotes()
      const { inputs, filled } = applyLowestQuotes(sheet, quotes, {
        allowHrb400eFallback,
      })
      if (filled === 0) {
        message.info(t('priceCompare.supplierPrice.fillNothing'))
        return
      }
      patchSheet(sheet.id, { inputs })
      message.success(
        t('priceCompare.supplierPrice.fillDone', { count: filled }),
      )
    } finally {
      setFillingFromPriceList(false)
    }
  }
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
        {t('priceCompare.sheet.refreshPrice')}
      </Button>
      <Tooltip title={t('priceCompare.supplierPrice.fillFromPriceListHint')}>
        <Button
          disabled={readOnly}
          icon={<TagsOutlined />}
          loading={fillingFromPriceList}
          onClick={() => void fillFromPriceList()}
        >
          {t('priceCompare.supplierPrice.fillFromPriceList')}
        </Button>
      </Tooltip>
      {columnSettingsSlot}
      {onOpenConfig ? (
        <Button icon={<SettingOutlined />} onClick={onOpenConfig}>
          {t('priceCompare.sheet.config')}
        </Button>
      ) : null}
      <SpotSyncActions
        activeSheet={readOnly ? undefined : sheet}
        sheets={syncSheets}
        resolveBrands={resolveSyncBrands ?? (() => [])}
        patchSheet={patchSheet}
      />
      {selectedCount > 0 ? (
        <SelectedRowActions
          brands={brands}
          supplierOptions={supplierOptions}
          selectedCount={selectedCount}
          readOnly={readOnly}
          specQuantityLocked={Boolean(sheet.specQuantityLocked)}
          onFillSupplierSelected={onFillSupplierSelected}
          onRemoveSelected={onRemoveSelected}
        />
      ) : null}
    </Space>
  )
}

/* ------------------------------------------------------------------- 主体 */

type Props = {
  sheet: PriceSheet
  /**
   * 全部批次（现货同步的作用域选择需要它们）。
   * 不传时退化为"只有当前批次"，此时项目级/全部同步等价于批次内同步。
   */
  sheets?: readonly PriceSheet[]
  /** 解析某批次参与同步的品牌（不同项目的品牌配置可能不同）。 */
  resolveSyncBrands?: (sheet: PriceSheet) => readonly string[]
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
  /** 定尺名称 → 排序号（来自定尺主数据），决定长度互切候选的确定性顺序。 */
  lengthSortOrders?: Readonly<Record<string, number>>
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
  allowedProducts?: string[]
  availability?: Record<string, string[]>
  chrome?: boolean
  spotRef: React.RefObject<HTMLSpanElement | null>
  designatedBrands?: string[]
  remark?: string
  onRemarkChange?: (value: string) => void
  suppliers?: SupplierSelectOption[]
  /** 被他人签出编辑时只读(禁用编辑类交互) */
  readOnly?: boolean
}

/** 单个报单: 一张扁平表格展示全部行, 现货价同品牌/规格/材质/长度自动联动。 */
/**
 * 本次会话内现货价被改过的单元格键(`品牌:行id`)集合。
 * 批量填入供应商时只作用于这些行, 避免换第 N 家时误改已定价的其它供应商行;
 * 填入完成后消费标记, 避免下一家重复命中。
 */
function useSpotTouchedKeys() {
  const [keys, setKeys] = useState<ReadonlySet<string>>(() => new Set())
  const mark = (next: string[]) => {
    if (!next.length) return
    setKeys((current) => new Set([...current, ...next]))
  }
  const consume = (next: string[]) => {
    if (!next.length) return
    setKeys((current) => {
      const result = new Set(current)
      for (const key of next) result.delete(key)
      return result
    })
  }
  return { keys, mark, consume }
}

export function SheetPanel(props: Props) {
  const {
    sheet,
    sheets,
    resolveSyncBrands,
    data,
    varieties,
    brands,
    rows,
    density,
    lengthPremium,
    lengthPremiums = EMPTY_LENGTH_PREMIUMS,
    lengthSortOrders = EMPTY_LENGTH_PREMIUMS,
    patchSheet,
    setRows,
    onReorderBrands,
    periods,
    onRefresh,
    refreshing = false,
    onOpenConfig,
    allowHrb400eFallback = false,
    allowedProducts = [],
    availability = {},
    chrome = true,
    spotRef,
    designatedBrands,
    remark,
    onRemarkChange,
    suppliers = [],
    readOnly = false,
  } = props
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bestOn, setBestOn] = useState(false)
  const [spotResetNonce, setSpotResetNonce] = useState(0)
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
    /* 分母是表格的**总列数**(勾选/行操作/备注/类别/规格/报单吨位 + 每个品牌 4 列) ——
       它是 hook 判定「隐藏比例异常」的基数。传「可显隐列数」会把正常操作误判成脏数据:
       例如 3 个品牌时隐藏备注与两个品牌组就是 3/6, 直接触发静默重置。 */
    6 + brands.length * 4,
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
  /** 当前通过表头右键菜单打开「一键填入供应商」弹层的品牌列。 */
  const [supplierFillBrand, setSupplierFillBrand] = useState<
    string | undefined
  >()
  const hiddenBrandSet = new Set(hiddenBrands)
  const {
    keys: spotTouchedKeys,
    mark: markSpotsTouched,
    consume: consumeSpotsTouched,
  } = useSpotTouchedKeys()
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

  // 单元格输入动作(现货价/供应商简称/批量填入)抽到 use-sheet-panel-inputs.ts:
  // 这 6 个回调约占 100 行, 是 no-giant-component 的主要行数来源, 且与渲染无关。
  const {
    clearSpotSource,
    getSpot,
    patchRow,
    setSpot,
    getInput,
    setSupplier,
    fillSupplier,
  } = useSheetPanelInputActions({
    consumeSpotsTouched,
    markSpotsTouched,
    patchSheet,
    rows,
    setRows,
    sheet,
    spotTouchedKeys,
    t,
  })

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
    sheet,
    t,
    // 列宽随个人设置字号等比缩放: 字号调大后不再把「材质 / 规格 / 长度」等列裁断
    widths: columnWidths,
    refDate,
    refPeriod,
    lengthPremium,
    lengthPremiums,
    lengthSortOrders,
    varietyByLabel,
    data,
    varieties,
    brands,
    density,
    getSpot,
    setSpot,
    getInput,
    clearSpotSource,
    setSupplier,
    fillSupplier,
    supplierOptions: suppliers,
    patchRow,
    onReorderBrands,
    onToggleBrand: toggleBrandVisible,
    supplierFillBrand,
    setSupplierFillBrand,
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
    spotResetNonce,
    onInvalidSpot: () => setSpotResetNonce((nonce) => nonce + 1),
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
        sheets={sheets}
        resolveSyncBrands={resolveSyncBrands}
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
        remark={remark}
        onRemarkChange={onRemarkChange}
        allowHrb400eFallback={allowHrb400eFallback}
        readOnly={readOnly}
        brands={brands}
        columnSettingsSlot={
          <ColumnSettingsButton
            hideRemark={hideRemark}
            brands={brands}
            hiddenBrands={hiddenBrands}
            onToggle={setColumnVisible}
          />
        }
        supplierOptions={suppliers}
        onFillSupplierSelected={(brandName, option) =>
          fillSupplier(brandName, selectedIds, option)
        }
      />

      <SheetTable
        rows={rows}
        base={{
          ...base,
          moveFocus: moveFocus(rows),
          moveFocusTon: moveFocusTon(rows),
        }}
        onReorderRow={reorderRow}
        onAddRow={addRow}
        onAddSeparator={addSeparator}
      />
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
