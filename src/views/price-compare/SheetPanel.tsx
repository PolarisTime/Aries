import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  HolderOutlined,
  InfoCircleOutlined,
  InsertRowAboveOutlined,
  InsertRowBelowOutlined,
  LockOutlined,
  MinusOutlined,
  MoreOutlined,
  ReloadOutlined,
  SettingOutlined,
  SwapOutlined,
  TrophyOutlined,
  UnlockOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Divider,
  Flex,
  Input,
  Popconfirm,
  Popover,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import type { TFunction } from 'i18next'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ColumnHeaderMenu } from '@/components/ColumnHeaderMenu'
import { ContextMenu } from '@/components/ContextMenu'
import { isEditableFieldTarget } from '@/components/row-context-menu'
import { message, modal } from '@/utils/antd-app'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import {
  applyRowLock,
  buildVarietyOptions,
  fillSupplierInputs,
  filterSupplierOptionsByBrand,
  filterVarieties,
  findAlternateLengthVariety,
  isPurchasedRow,
  isSeparatorRow,
  LOCK_REASON_KEYS,
  netPriceWithFallback,
  resolveLock,
  resolveRef,
  type SHEET_COLUMN_WIDTH,
  SPOT_PRICE_MAX,
  type SupplierSelectOption,
  sumTonByPurchaseOrderItem,
  syncSpotInputs,
} from './core'
import { LockableField } from './LockableField'
import { withMemberVisibility } from './price-compare-support'
import { PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH } from './sheet-column-width'
import {
  buildTonColumn,
  EMPTY_PURCHASE_ORDER_TONNAGE,
  type PurchaseOrderTonnageDraftInput,
} from './ton-column'
import type {
  Brand,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetInput,
  SheetInputs,
  Variety,
} from './types'
import { useSheetColumnWidths } from './use-sheet-column-widths'
import { useSheetRowOperations } from './use-sheet-row-operations'
import { usePurchaseOrderPicker } from './usePurchaseOrderPicker'
import './price-compare.css'

const { Text } = Typography

/**
 * 选择框(32) / 拖拽手柄(24) / 行操作(28) 三列的总宽。
 * 这三列只放 icon-only 控件, 尺寸由命中区下限(WCAG 2.5.8)决定, 不随字号变化,
 * 因此不参与 core.sheetColumnWidths 的等比换算。
 */
const SHEET_FIXED_CHROME_WIDTH =
  32 + 24 + PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH

/** 供应商简称下拉: 支持中文原文 + 拼音全拼/首字母索引。 */
const filterSupplierOption = createPinyinFilterOption()

/**
 * 按方向在行内移动焦点并跳过无法聚焦的中间行(如隔断行缺少输入框),
 * 保证 Tab/Enter/方向键能穿过隔断继续定位到下一可编辑行。
 */
function moveFocusBy(
  orderedRows: PriceRow[],
  rowId: string,
  delta: number,
  selectorOf: (row: PriceRow) => string,
): boolean {
  if (delta === 0) return false
  const index = orderedRows.findIndex((row) => row.id === rowId)
  if (index < 0) return false
  for (let i = index + delta; i >= 0 && i < orderedRows.length; i += delta) {
    const input = document.querySelector<HTMLInputElement>(
      selectorOf(orderedRows[i]),
    )
    if (!input) continue
    input.focus()
    input.select()
    return true
  }
  // 边界(列首/列尾): 返回 false, 调用方据此放行浏览器默认 Tab,
  // 否则 preventDefault 后焦点原地不动, 整列会变成键盘陷阱。
  return false
}

function moveFocus(orderedRows: PriceRow[]) {
  return (brandName: string, rowId: string, delta: number) =>
    moveFocusBy(
      orderedRows,
      rowId,
      delta,
      (row) => `input[data-spot="${brandName}:${row.id}"]`,
    )
}

function moveFocusTon(orderedRows: PriceRow[]) {
  return (rowId: string, delta: number) =>
    moveFocusBy(
      orderedRows,
      rowId,
      delta,
      (row) => `input[data-ton="${row.id}"]`,
    )
}

/* ------------------------------------------------------------------ 列定义 */

type ColumnContext = {
  sheet: PriceSheet
  t: TFunction
  /** 当前字号下的列宽表(见 core.sheetColumnWidths), 所有列宽只能从这里取。 */
  widths: Record<keyof typeof SHEET_COLUMN_WIDTH, number>
  readOnly: boolean
  refDate: string
  refPeriod: string
  lengthPremium: number
  varietyByLabel: Map<string, Variety>
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  getSpot: (brandName: string, rowId: string) => number | undefined
  setSpot: (brandName: string, rowId: string, value: number | undefined) => void
  getInput: (brandName: string, rowId: string) => SheetInput | undefined
  setSupplier: (
    brandName: string,
    rowId: string,
    option: { value: string; label: string } | undefined,
  ) => void
  /** 批量填入供应商: 目标行统一改为该供应商(覆盖已有值); undefined 表示清除。 */
  fillSupplier: (
    brandName: string,
    rowIds: string[],
    option: { value: string; label: string } | undefined,
  ) => void
  supplierOptions: SupplierSelectOption[]
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  /** 在品牌列内纵向移动焦点; 返回 false 表示已到列首/列尾(调用方应放行默认 Tab)。 */
  moveFocus: (brandName: string, rowId: string, delta: number) => boolean
  moveFocusTon: (rowId: string, delta: number) => boolean
  /** 采购订单吨位数据(选项/回显/加载中), 供吨位列关联。 */
  purchaseOrderTonnage: PurchaseOrderTonnageDraftInput
  /** 打开采购订单选择弹窗(rowId 用于回填到对应行)。 */
  openPurchaseOrderPicker: (rowId: string) => void
  onReorderBrands: (from: number, to: number) => void
  /** 隐藏/显示整组品牌列(与「列显示」弹层共用同一份显隐状态)。 */
  onToggleBrand: (brandName: string, visible: boolean) => void
  /** 当前通过右键菜单打开「一键填入供应商」弹层的品牌列。 */
  supplierFillBrand?: string
  setSupplierFillBrand: (brandName: string | undefined) => void
  /** 行操作菜单当前打开的行(Dropdown 受控开关: 右键行内区域与「更多」按钮共用)。 */
  contextMenuRowId: string | null
  onContextMenuRowChange: (rowId: string | null) => void
  /** 上移/下移一行: 拖拽排序的键盘等价物(delta 为 -1 上移, 1 下移)。 */
  moveRow: (rowId: string, delta: -1 | 1) => void
  /** 在指定行上方/下方插入商品行或隔断行(现有 addRow/addSeparator 只能追加)。 */
  insertRowAt: (
    rowId: string,
    kind: 'PRODUCT' | 'SEPARATOR',
    position: 'above' | 'below',
  ) => void
  /** 删除单行(连带清理该行各品牌的现货/供应商输入)。 */
  deleteRow: (rowId: string) => void
  onRowDragStart: (rowId: string, event: React.DragEvent<HTMLElement>) => void
  onRowDragEnd: () => void
  selectedIds: string[]
  toggleSelect: (rowId: string, checked: boolean) => void
  toggleAll: (checked: boolean) => void
  attachSpotRef: boolean
  allowHrb400eFallback: boolean
  bestOn: boolean
  spotResetNonce: number
  onInvalidSpot: () => void
  spotRef: React.RefObject<HTMLSpanElement | null>
  /** 项目可选商品白名单(空表示不限)。 */
  allowedProducts?: string[]
  /** 已按项目配置过滤的可选商品(添加行下拉与列内选择共用)。 */
  varietyOptionsFlat: Variety[]
  /** 仅临时列显隐: 是否隐藏备注列 */
  hideRemark: boolean
  /** 仅临时列显隐: 整组隐藏的品牌名 */
  hiddenBrands: string[]
  /** 可见品牌列组数量(已排除隐藏品牌), 供 summary colSpan 与 scroll.x 复用 */
  visibleBrandCount: number
}

const cellOf = (
  title: React.ReactNode,
  width: number,
  render: (value: unknown, row: GridRow) => React.ReactNode,
) => ({
  title,
  width,
  align: 'center' as const,
  // 列宽固定且字号小, 表头文案会被裁切: 补 title 让鼠标用户能看到完整列名
  onHeaderCell: () =>
    typeof title === 'string' ? { title } : ({} as { title?: string }),
  // 隔断行不参与网价/现货/差价/供应商等任一品牌列; 已采购(关联采购订单)行整体遮蔽该区
  render: (value: unknown, row: GridRow) =>
    isSeparatorRow(row.row) ? null : isPurchasedRow(row.row) ? (
      <span className="price-compare-purchased-mask" aria-hidden="true" />
    ) : (
      render(value, row)
    ),
})

/** 行操作单元格需要的数据: 菜单项与开关都由外层表格控件决定, 这里只做渲染。 */
type RowActionsCellProps = {
  rowLabel: string
  locked: boolean
  /** 只读(被他人签出): 整个入口不可用, 由外层 Tooltip 说明原因。 */
  disabled: boolean
  /** 「锁定规格和数量」是否生效: 只禁用会改动规格/数量的菜单项, 菜单本身仍可打开。 */
  specQuantityLocked: boolean
  tooltip: string
  /** 全局锁定期间菜单顶部展示的原因说明(不可点击)。 */
  lockReason: string
  /** 行菜单是否展开(受控), 与「更多」按钮的点击入口共用。 */
  menuOpen: boolean
  onMenuOpenChange: (open: boolean) => void
  /** 首行不可上移 / 末行不可下移: 禁用而不隐藏, 让读屏能发现边界。 */
  canMoveUp: boolean
  canMoveDown: boolean
  onToggleLock: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onInsertRowAbove: () => void
  onInsertSeparatorBelow: () => void
  onDelete: () => void
}

/**
 * 行操作入口: 保留原有可见「更多」按钮(点击 / 键盘入口), 并让同一份菜单响应右键。
 * 右键菜单只是补充入口 —— 键盘可达性仍由可见按钮保证(WCAG 2.1.1)。
 *
 * <p>锁定层级与菜单可用性的关系(全局 > 行 > 单元格):</p>
 * <ul>
 *   <li>`readOnly`(他人签出): 整表不可写, 按钮禁用; 外层用原生 `title` +
 *       Tooltip 给出原因, 避免"静默禁用";</li>
 *   <li>`specQuantityLocked`(全局锁): 菜单**仍可打开**, 但会改动规格/数量的项
 *       (行级锁定开关、上移/下移、插入行/隔断、删除该行)逐项禁用, 并在菜单顶部
 *       说明原因 —— 用户点得开、看得见为什么点不动;</li>
 *   <li>行级锁 `row.locked`: 只影响图标与文案(状态可见), 解锁入口保持可用。</li>
 * </ul>
 */
function RowActionsCell({
  rowLabel,
  locked,
  disabled,
  specQuantityLocked,
  tooltip,
  lockReason,
  menuOpen,
  onMenuOpenChange,
  canMoveUp,
  canMoveDown,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onInsertRowAbove,
  onInsertSeparatorBelow,
  onDelete,
}: RowActionsCellProps) {
  const { t } = useTranslation()
  /**
   * 「删除该行」的二次确认: 用 modal.confirm 而不是 Popconfirm。
   * Popconfirm 必须能拿到触发元素的 DOM ref 才能定位, 而它现在包在 ContextMenu(组件) 外面,
   * rc-trigger 量不到目标就把弹层放在 (-16800, -9500) 这类屏幕外坐标, 实测确认框根本点不到。
   */
  const confirmRowDelete = () =>
    modal.confirm({
      title: t('priceCompare.sheet.contextMenu.removeRowTitle'),
      content: t('priceCompare.sheet.contextMenu.removeRowContent'),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      okButtonProps: { danger: true },
      onOk: onDelete,
    })
  const lockLabel = t(
    locked ? 'priceCompare.sheet.unlockRow' : 'priceCompare.sheet.lockRow',
  )
  /** 全局锁定时统一禁用会改动规格/数量的项; 行级锁状态本身也由全局锁保护。 */
  const mutationDisabled = specQuantityLocked
  const items: MenuProps['items'] = [
    ...(mutationDisabled
      ? [
          {
            key: 'lock-reason',
            label: lockReason,
            disabled: true,
          },
          { type: 'divider' as const },
        ]
      : []),
    {
      key: 'toggle-row-lock',
      icon: locked ? <UnlockOutlined /> : <LockOutlined />,
      label: lockLabel,
      disabled: mutationDisabled,
    },
    { type: 'divider' },
    {
      key: 'move-row-up',
      icon: <ArrowUpOutlined />,
      label: t('priceCompare.sheet.contextMenu.moveRowUp'),
      disabled: mutationDisabled || !canMoveUp,
    },
    {
      key: 'move-row-down',
      icon: <ArrowDownOutlined />,
      label: t('priceCompare.sheet.contextMenu.moveRowDown'),
      disabled: mutationDisabled || !canMoveDown,
    },
    { type: 'divider' },
    {
      key: 'insert-row-above',
      icon: <InsertRowAboveOutlined />,
      label: t('priceCompare.sheet.contextMenu.insertRowAbove'),
      disabled: mutationDisabled,
    },
    {
      key: 'insert-separator-below',
      icon: <InsertRowBelowOutlined />,
      label: t('priceCompare.sheet.contextMenu.insertSeparatorBelow'),
      disabled: mutationDisabled,
    },
    { type: 'divider' },
    {
      key: 'delete-row',
      danger: true,
      icon: <DeleteOutlined />,
      label: t('priceCompare.sheet.contextMenu.deleteRow'),
      disabled: mutationDisabled,
    },
  ]

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    switch (key) {
      case 'toggle-row-lock':
        onToggleLock()
        break
      case 'move-row-up':
        onMoveUp()
        break
      case 'move-row-down':
        onMoveDown()
        break
      case 'insert-row-above':
        onInsertRowAbove()
        break
      case 'insert-separator-below':
        onInsertSeparatorBelow()
        break
      case 'delete-row':
        confirmRowDelete()
        break
      default:
        break
    }
  }

  return (
    <Tooltip title={tooltip}>
      {/*
        用原生 span 承接鼠标事件: 禁用按钮不派发 mouseenter, Tooltip 挂在按钮上
        会静默失效 —— 用户只看到灰按钮却不知原因(实测)。span 同时让 title 属性生效。
      */}
      <span
        className={`price-compare-row-actions-wrap${disabled ? ' price-compare-row-actions-wrap--disabled' : ''}`}
        title={tooltip}
      >
        <ContextMenu
          ariaLabel={t('priceCompare.sheet.contextMenu.rowLabel', {
            row: rowLabel,
          })}
          disabled={disabled}
          items={items}
          onClick={handleMenuClick}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          // 可见「更多」按钮与行内右键共用同一份菜单, 也共用焦点进首项/Escape 归还焦点的契约
          triggers={['click', 'contextMenu']}
        >
          <Button
            aria-haspopup="menu"
            aria-label={t('priceCompare.sheet.rowActionsLabel', {
              row: rowLabel,
            })}
            className={`price-compare-row-actions${locked ? ' price-compare-row-actions--locked' : ''}`}
            disabled={disabled}
            icon={locked ? <LockOutlined /> : <MoreOutlined />}
            size="small"
            type={locked ? 'primary' : 'text'}
          />
        </ContextMenu>
      </span>
    </Tooltip>
  )
}

/**
 * 锁定原因提示包装。
 *
 * <p>被锁定的控件一律 `disabled`/`readOnly`, 而禁用控件不派发 mouseenter,
 * antd Tooltip 直接挂在它上面会静默失效。这里统一用一层 span 承接事件,
 * 保证「只读时必须给出原因」这条约束在真机上成立(而不是只写在注释里)。</p>
 */
function LockReason({
  reason,
  className,
  children,
}: {
  reason?: string
  className?: string
  children: React.ReactElement
}) {
  if (!reason) return children
  return (
    <Tooltip title={reason}>
      {/*
        title 与 Tooltip 双保险: Tooltip 是即时反馈, 原生 title 保证在
        Tooltip 被吞掉/焦点态下仍能读到原因, 也让"原因"可被测试稳定断言。
      */}
      <span className={className ?? 'price-compare-lock-reason'} title={reason}>
        {children}
      </span>
    </Tooltip>
  )
}

function buildSheetColumns(ctx: ColumnContext): ColumnsType<GridRow> {
  const {
    refDate,
    refPeriod,
    lengthPremium,
    varietyByLabel,
    data,
    brands,
    rows,
    getSpot,
    setSpot,
    supplierOptions,
    patchRow,
    moveFocus,
    selectedIds,
    toggleSelect,
    toggleAll,
    onRowDragStart,
    onRowDragEnd,
    onReorderBrands,
    attachSpotRef,
    allowHrb400eFallback,
    bestOn,
    allowedProducts,
    t,
    readOnly,
    sheet,
    hideRemark,
    hiddenBrands,
    purchaseOrderTonnage,
    openPurchaseOrderPicker,
    widths,
  } = ctx
  /** 本单据内各采购订单的报单吨位合计(叠加到服务端已开吨位上判断超额)。 */
  const localTonByItemId = sumTonByPurchaseOrderItem(rows)
  /** 可见品牌(O(1) 查找)。 */
  const hiddenBrandSet = new Set(hiddenBrands)
  /**
   * 可见品牌顺序: 「移到最前/最后」的边界与目标下标都基于它。
   * 否则隐藏了首位/末位品牌时, 最后一列(或第一列)的可点但点了没反应。
   */
  const visibleBrandNames = brands
    .filter((brand) => !hiddenBrandSet.has(brand.name))
    .map((brand) => brand.name)
  /** 商品行 id(排除隔断行), 供整列批量填入复用。 */
  const productRowIds = rows.flatMap((row) =>
    isSeparatorRow(row) ? [] : [row.id],
  )
  /** 锁定规格和数量: 一并禁掉行级增删与拖拽重排(会间接改变规格/数量顺序)。 */
  const quantityLocked = Boolean(sheet.specQuantityLocked)
  const rowInteractionLocked = readOnly || quantityLocked
  const rowLockedHint = t('priceCompare.sheet.specQuantityLockedHint')
  /** 仅由「锁定规格和数量」触发: 保持不可编辑, 但仍以正常文字色显示已保存值。 */
  const quantityLockClass =
    quantityLocked && !readOnly ? 'price-compare-locked-field' : undefined
  const varietyOptionsFlat = filterVarieties(
    ctx.varieties,
    brands,
    allowedProducts,
  )
  const varietyOptions = buildVarietyOptions(varietyOptionsFlat)
  const bestCache = new Map<string, string | undefined>()
  const bestOf = (row: GridRow): string | undefined => {
    if (!bestOn) return undefined
    if (bestCache.has(row.rowId)) return bestCache.get(row.rowId)
    let best: string | undefined
    let bestVal = Number.NEGATIVE_INFINITY
    for (const brand of brands) {
      const price = isCategoryEnabled(brand, row.row.category)
        ? netPriceWithFallback(
            data,
            refDate,
            refPeriod,
            brand.name,
            row.row,
            lengthPremium,
            allowHrb400eFallback,
          ).value
        : undefined
      const spot = getSpot(brand.name, row.row.id)
      if (price === undefined || spot === undefined) continue
      const diff = price - spot - brand.freight
      if (diff > bestVal) {
        bestVal = diff
        best = brand.name
      }
    }
    bestCache.set(row.rowId, best)
    return best
  }
  const isDimmed = (row: GridRow, brandName: string) => {
    const best = bestOf(row)
    return best !== undefined && best !== brandName
  }

  const isCategoryEnabled = (brand: Brand, category: string) =>
    !brand.categories ||
    brand.categories.length === 0 ||
    !category ||
    brand.categories.includes(category)
  /** 行可访问名称: 商品信息文本, 空行回退为「空行」, 供单元格与选择框拼装 aria-label。 */
  const rowLabelOf = (row: GridRow) =>
    [row.row.category, row.row.material, row.row.spec, row.row.length]
      .filter(Boolean)
      .join(' ') || t('priceCompare.sheet.a11y.emptyRow')
  /** 单元格编辑器可访问名称: 列名 + 行名, 避免整表出现无名称输入控件。 */
  const cellLabel = (column: string, row: GridRow) =>
    t('priceCompare.sheet.a11y.cell', { column, row: rowLabelOf(row) })

  const allChecked = rows.length > 0 && selectedIds.length === rows.length
  const someChecked = selectedIds.length > 0 && !allChecked
  /** 报单吨位合计: 当前单据全部商品行 ton 之和。 */
  const tonTotal = rows.reduce((sum, row) => sum + (row.ton ?? 0), 0)
  const tonTotalText = Number.isFinite(tonTotal)
    ? String(Number(tonTotal.toFixed(8)))
    : '0'

  return [
    {
      title: (
        <Checkbox
          aria-label={t('priceCompare.sheet.a11y.selectAllRows')}
          checked={allChecked}
          indeterminate={someChecked}
          disabled={rows.length === 0}
          onChange={(event) => toggleAll(event.target.checked)}
        />
      ),
      width: 32,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <Checkbox
          aria-label={t('priceCompare.sheet.a11y.selectRow', {
            row: rowLabelOf(row),
          })}
          checked={selectedIds.includes(row.rowId)}
          onChange={(event) => toggleSelect(row.rowId, event.target.checked)}
        />
      ),
    },
    {
      title: '',
      width: 24,
      fixed: 'left',
      align: 'center',
      render: (_, row) => (
        <Tooltip title={rowInteractionLocked ? rowLockedHint : undefined}>
          <span
            className={`price-compare-row-drag${rowInteractionLocked ? ' price-compare-row-drag-disabled' : ''}`}
            draggable={!rowInteractionLocked}
            aria-disabled={rowInteractionLocked}
            title={
              rowInteractionLocked
                ? rowLockedHint
                : t('priceCompare.sheet.dragRow')
            }
            onDragStart={(event) => {
              if (rowInteractionLocked) return
              onRowDragStart(row.rowId, event)
            }}
            onDragEnd={onRowDragEnd}
          >
            <HolderOutlined />
          </span>
        </Tooltip>
      ),
    },
    {
      // 行级操作菜单: 承载行级锁定(锁定后才允许关联采购订单)与拖拽的键盘等价物
      // (上移/下移/插入行/插入隔断/删除该行)。点击可见「更多」按钮与右键行内区域
      // 打开的是同一份菜单; 未锁定时用中性的「更多」图标, 已锁定时保持实心锁。
      // 列里只有一个 icon-only 按钮, 取最小值; 单元格留白由
      // .price-compare-row-actions-cell 收窄, 避免把列撑宽。
      title: '',
      className: 'price-compare-row-actions-cell',
      width: PRICE_COMPARE_ROW_ACTIONS_COLUMN_WIDTH,
      fixed: 'left',
      align: 'center',
      render: (_, row) => {
        if (isSeparatorRow(row.row)) return null
        const rowLocked = Boolean(row.row.locked)
        // 只读(他人签出)才整体禁用; 全局锁定改为逐项禁用 + 菜单内说明原因
        const menuDisabled = readOnly
        const specQuantityLocked = Boolean(sheet.specQuantityLocked)
        const rowIndex = rows.findIndex((item) => item.id === row.rowId)
        return (
          <RowActionsCell
            rowLabel={rowLabelOf(row)}
            locked={rowLocked}
            disabled={menuDisabled}
            specQuantityLocked={specQuantityLocked}
            lockReason={rowLockedHint}
            tooltip={
              readOnly
                ? t('priceCompare.sheet.readOnlyHint')
                : t('priceCompare.sheet.lockRowHint')
            }
            menuOpen={ctx.contextMenuRowId === row.rowId}
            onMenuOpenChange={(open) =>
              ctx.onContextMenuRowChange(open ? row.rowId : null)
            }
            canMoveUp={rowIndex > 0}
            canMoveDown={rowIndex >= 0 && rowIndex < rows.length - 1}
            onToggleLock={() =>
              patchRow(row.rowId, applyRowLock(row.row, !rowLocked))
            }
            onMoveUp={() => ctx.moveRow(row.rowId, -1)}
            onMoveDown={() => ctx.moveRow(row.rowId, 1)}
            onInsertRowAbove={() =>
              ctx.insertRowAt(row.rowId, 'PRODUCT', 'above')
            }
            onInsertSeparatorBelow={() =>
              ctx.insertRowAt(row.rowId, 'SEPARATOR', 'below')
            }
            onDelete={() => ctx.deleteRow(row.rowId)}
          />
        )
      },
    },
    ...(hideRemark
      ? []
      : [
          {
            title: t('priceCompare.sheet.columns.remark'),
            dataIndex: 'remark',
            width: widths.remark,
            // 列名在 154px 内会被裁切: 补 title 提供完整文案(鼠标悬停可见)
            onHeaderCell: () => ({
              title: t('priceCompare.sheet.columns.remark'),
            }),
            fixed: 'left' as const,
            align: 'center' as const,
            render: (_: unknown, row: GridRow) =>
              isSeparatorRow(row.row) ? null : (
                <Input
                  key={`remark:${row.rowId}:${row.row.remark ?? ''}`}
                  aria-label={cellLabel(
                    t('priceCompare.sheet.columns.remark'),
                    row,
                  )}
                  className="price-compare-row-remark"
                  size="small"
                  variant="borderless"
                  disabled={readOnly}
                  maxLength={255}
                  defaultValue={row.row.remark ?? ''}
                  onBlur={(event) =>
                    patchRow(row.rowId, {
                      remark: event.target.value || undefined,
                    })
                  }
                  onPressEnter={(event) => {
                    patchRow(row.rowId, {
                      remark:
                        (event.target as HTMLInputElement).value || undefined,
                    })
                  }}
                />
              ),
          },
        ]),
    {
      title: t('priceCompare.sheet.columns.category'),
      dataIndex: 'category',
      width: widths.category,
      onHeaderCell: () => ({ title: t('priceCompare.sheet.columns.category') }),
      fixed: 'left',
      align: 'center',
      render: (_, row) =>
        isSeparatorRow(row.row) ? (
          <span className="price-compare-separator-label">
            {t('priceCompare.sheet.separator')}
          </span>
        ) : (
          <span className="price-compare-category" title={row.row.category}>
            {row.row.category}
          </span>
        ),
    },
    {
      title: t('priceCompare.sheet.columns.variety'),
      dataIndex: 'base',
      width: widths.spec,
      onHeaderCell: () => ({ title: t('priceCompare.sheet.columns.variety') }),
      fixed: 'left',
      render: (_, row) => {
        const current = row.row
        if (isSeparatorRow(current)) return null
        const value =
          current && current.material
            ? `${current.category}|${current.material}|${current.spec}|${current.length}`
            : undefined
        // 仅未关联采购订单(isPurchasedRow=false)且同规格存在另一长度时可切换。
        const alternate = isPurchasedRow(current)
          ? undefined
          : findAlternateLengthVariety(varietyOptionsFlat, current)
        // 锁定层级 单据 > 行 > 单元格: 行级锁同样冻结本行规格(行锁 = 规格与吨位定稿)。
        const specLock = resolveLock({
          sheet: quantityLocked,
          row: Boolean(current.locked),
        })
        const selectDisabled = readOnly || specLock.locked
        const lockReason = !selectDisabled
          ? undefined
          : readOnly
            ? t('priceCompare.sheet.readOnlyHint')
            : t(LOCK_REASON_KEYS[specLock.level ?? 'row'])
        return (
          <LockReason reason={lockReason}>
            <div className="price-compare-variety-cell">
              <Select
                size="small"
                variant="borderless"
                aria-label={cellLabel(
                  t('priceCompare.sheet.columns.variety'),
                  row,
                )}
                className={quantityLockClass}
                disabled={selectDisabled}
                style={{ width: widths.spec - 36 }}
                placeholder={t('priceCompare.sheet.selectProduct')}
                /*
                 * 下拉不能与选择器同宽: 选择器宽度受「规格」列宽约束(60~160px 量级),
                 * 同宽时选项文本只有约 117px, 「HRB400E 12 12米」这类复合商品名会被
                 * 省略成「HRB400 10 ...」, 用户看不到完整规格。按内容宽度撑开下拉,
                 * 让每个选项完整可读(选项数量有限, 关闭虚拟滚动无性能影响)。
                 */
                popupMatchSelectWidth={false}
                /*
                 * 「材质 / 规格 / 长度」是一条拼起来的复合文本, 列宽再宽也可能被更长的
                 * 材质名撑破。这里给选中项补原生 title: 即使被省略号收尾, 悬停仍能看到
                 * 完整商品名, 不会只剩半截让人猜。
                 */
                labelRender={({ label }) => (
                  <span title={typeof label === 'string' ? label : undefined}>
                    {label}
                  </span>
                )}
                showSearch={{ optionFilterProp: 'label' }}
                value={value}
                options={varietyOptions}
                onChange={(key) => {
                  const target = varietyByLabel.get(key)
                  if (!target) return
                  patchRow(row.rowId, {
                    category: target.category,
                    material: target.material,
                    spec: target.spec,
                    length: target.length,
                  })
                }}
              />
              {alternate ? (
                <Tooltip
                  title={t('priceCompare.sheet.switchLength', {
                    length: alternate.length,
                  })}
                >
                  <Button
                    aria-label={t('priceCompare.sheet.switchLength', {
                      length: alternate.length,
                    })}
                    className="price-compare-variety-switch"
                    disabled={selectDisabled}
                    icon={<SwapOutlined />}
                    size="small"
                    type="text"
                    onClick={() =>
                      patchRow(row.rowId, {
                        category: alternate.category,
                        material: alternate.material,
                        spec: alternate.spec,
                        length: alternate.length,
                      })
                    }
                  />
                </Tooltip>
              ) : null}
            </div>
          </LockReason>
        )
      },
    },
    buildTonColumn({
      t,
      sheetSpecQuantityLocked: Boolean(sheet.specQuantityLocked),
      readOnly,
      tonTotalText,
      width: widths.ton,
      quantityLockClass,
      purchaseOrderOptions: purchaseOrderTonnage.options,
      tonnageByItemId: purchaseOrderTonnage.tonnageByItemId,
      purchaseOrderTonnageLoading: purchaseOrderTonnage.loading,
      localTonByItemId,
      moveFocusTon: ctx.moveFocusTon,
      patchRow,
      openPurchaseOrderPicker,
    }),
    ...brands.flatMap(
      (brand, brandIndex): ColumnsType<GridRow> =>
        hiddenBrandSet.has(brand.name)
          ? []
          : [
              {
                title: (
                  // 表头标题节点: 保留原有拖拽换序, 菜单本身复用共享列头基元
                  // (隐藏该列 / 移到最前或最后 + 业务追加的「一键填入供应商…」)。
                  <ColumnHeaderMenu
                    ariaLabel={t('priceCompare.sheet.contextMenu.brandLabel', {
                      brand: brand.name,
                    })}
                    columnTitle={brand.name}
                    extraItems={[
                      {
                        key: 'fill-supplier-column',
                        icon: <VerticalAlignBottomOutlined />,
                        label: t('priceCompare.sheet.contextMenu.fillSupplier'),
                        // 与「简称」列的一键填入按钮保持同一禁用口径(只读时按钮本身不渲染)
                        disabled: readOnly,
                      },
                    ]}
                    isFirst={brand.name === visibleBrandNames[0]}
                    isLast={brand.name === visibleBrandNames.at(-1)}
                    onExtraItem={(key) => {
                      if (key === 'fill-supplier-column') {
                        ctx.setSupplierFillBrand(brand.name)
                      }
                    }}
                    onHide={() => ctx.onToggleBrand(brand.name, false)}
                    onMoveFirst={() =>
                      onReorderBrands(
                        brandIndex,
                        brands.findIndex(
                          (item) => item.name === visibleBrandNames[0],
                        ),
                      )
                    }
                    onMoveLast={() =>
                      onReorderBrands(
                        brandIndex,
                        brands.findIndex(
                          (item) =>
                            item.name ===
                            visibleBrandNames[visibleBrandNames.length - 1],
                        ),
                      )
                    }
                  >
                    <span
                      className="price-compare-brand-name price-compare-drag"
                      draggable
                      title={t('priceCompare.sheet.dragBrand')}
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = 'move'
                        event.dataTransfer.setData(
                          'text/plain',
                          String(brandIndex),
                        )
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        const from = Number(
                          event.dataTransfer.getData('text/plain'),
                        )
                        if (!Number.isNaN(from))
                          onReorderBrands(from, brandIndex)
                      }}
                    >
                      {brand.name}
                    </span>
                  </ColumnHeaderMenu>
                ),
                children: [
                  cellOf(
                    t('priceCompare.sheet.columns.net'),
                    widths.net,
                    (_, row) => {
                      const resolved = isCategoryEnabled(
                        brand,
                        row.row.category,
                      )
                        ? netPriceWithFallback(
                            data,
                            refDate,
                            refPeriod,
                            brand.name,
                            row.row,
                            lengthPremium,
                            allowHrb400eFallback,
                          )
                        : { value: undefined, fallback: false }
                      const price = resolved.value
                      return price === undefined ? (
                        <div className="price-compare-num price-compare-sub">
                          -
                        </div>
                      ) : (
                        <div
                          className={`price-compare-net price-compare-num${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}${resolved.fallback ? ' price-compare-fallback' : ''}`}
                        >
                          {resolved.fallback ? (
                            <Tooltip
                              title={t('priceCompare.sheet.fallbackTooltip')}
                            >
                              <span className="price-compare-fallback-value">
                                {price}
                                <span className="price-compare-fallback-badge">
                                  E
                                </span>
                              </span>
                            </Tooltip>
                          ) : (
                            price
                          )}
                        </div>
                      )
                    },
                  ),
                  cellOf(
                    t('priceCompare.sheet.columns.spot'),
                    widths.spot,
                    (_, row) => {
                      const current = row.row
                      const spot = getSpot(brand.name, current.id)
                      const isFirst =
                        attachSpotRef &&
                        brandIndex === 0 &&
                        current.id === rows[0]?.id
                      const input = (
                        <Input
                          key={`${brand.name}:${current.id}:${spot ?? ''}:${ctx.spotResetNonce}`}
                          aria-label={cellLabel(
                            `${brand.name} ${t('priceCompare.sheet.columns.spot')}`,
                            row,
                          )}
                          className={`price-compare-spot${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                          size="small"
                          variant="borderless"
                          inputMode="decimal"
                          disabled={readOnly}
                          data-spot={`${brand.name}:${current.id}`}
                          defaultValue={spot === undefined ? '' : String(spot)}
                          onBlur={(event) => {
                            const raw = event.target.value
                            const value = Number(raw)
                            if (
                              raw !== '' &&
                              (Number.isNaN(value) ||
                                value <= 0 ||
                                value > SPOT_PRICE_MAX)
                            ) {
                              message.warning(
                                t('priceCompare.sheet.spotOutOfRange', {
                                  max: SPOT_PRICE_MAX,
                                }),
                              )
                              // 非法输入：触发重挂载，恢复为已保存值
                              ctx.onInvalidSpot()
                              return
                            }
                            setSpot(
                              brand.name,
                              current.id,
                              raw === '' ? undefined : value,
                            )
                          }}
                          onPressEnter={(event) => {
                            const raw = (event.target as HTMLInputElement).value
                            const value = Number(raw)
                            if (
                              raw === '' ||
                              (!Number.isNaN(value) &&
                                value > 0 &&
                                value <= SPOT_PRICE_MAX)
                            ) {
                              setSpot(
                                brand.name,
                                current.id,
                                raw === '' ? undefined : value,
                              )
                            }
                            event.preventDefault()
                            moveFocus(brand.name, current.id, 1)
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowDown') {
                              event.preventDefault()
                              moveFocus(brand.name, current.id, 1)
                            } else if (event.key === 'ArrowUp') {
                              event.preventDefault()
                              moveFocus(brand.name, current.id, -1)
                            } else if (event.key === 'Tab') {
                              // 仅在列内成功移动时拦截默认行为; 到列首/列尾放行,
                              // 让 Tab 能走到供应商列/下一品牌列, 避免焦点陷阱。
                              const moved = moveFocus(
                                brand.name,
                                current.id,
                                event.shiftKey ? -1 : 1,
                              )
                              if (moved) event.preventDefault()
                            }
                          }}
                        />
                      )
                      return isFirst ? (
                        <span ref={ctx.spotRef}>{input}</span>
                      ) : (
                        input
                      )
                    },
                  ),
                  cellOf(
                    t('priceCompare.sheet.columns.diff'),
                    widths.diff,
                    (_, row) => {
                      const price = isCategoryEnabled(brand, row.row.category)
                        ? netPriceWithFallback(
                            data,
                            refDate,
                            refPeriod,
                            brand.name,
                            row.row,
                            lengthPremium,
                            allowHrb400eFallback,
                          ).value
                        : undefined
                      const spot = getSpot(brand.name, row.row.id)
                      if (price === undefined || spot === undefined) {
                        return (
                          <div className="price-compare-num price-compare-sub">
                            -
                          </div>
                        )
                      }
                      const diff = price - spot - brand.freight
                      const cls =
                        diff > 0 ? 'is-pos' : diff < 0 ? 'is-neg' : 'is-zero'
                      const best = bestOf(row)
                      return (
                        <Tooltip
                          title={
                            diff >= 0
                              ? t('priceCompare.sheet.spotBetter')
                              : t('priceCompare.sheet.netBetter')
                          }
                        >
                          <span
                            className={`price-compare-diff ${cls}${best === brand.name ? ' is-best' : ''}${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                          >
                            {diff > 0 ? '+' : ''}
                            {diff}
                          </span>
                        </Tooltip>
                      )
                    },
                  ),
                  cellOf(
                    <SupplierFillHeader
                      brandName={brand.name}
                      options={supplierOptions}
                      disabled={readOnly}
                      open={ctx.supplierFillBrand === brand.name}
                      onOpenChange={(next) =>
                        ctx.setSupplierFillBrand(next ? brand.name : undefined)
                      }
                      onFill={(option) =>
                        ctx.fillSupplier(brand.name, productRowIds, option)
                      }
                    />,
                    widths.supplier,
                    (_, row) => {
                      const current = row.row
                      const input = ctx.getInput(brand.name, current.id)
                      const supplierName = input?.supplierName
                      const filtered = filterSupplierOptionsByBrand(
                        ctx.supplierOptions,
                        brand.name,
                      )
                      // 保留已选供应商: 若其不属于当前品牌过滤结果, 仍加入选项避免回显丢失,
                      // 不强制清空用户已选值。
                      const options =
                        input?.supplierId &&
                        !filtered.some(
                          (item) => item.value === input.supplierId,
                        )
                          ? [
                              {
                                value: input.supplierId,
                                label: supplierName || input.supplierId,
                                brands: [],
                              },
                              ...filtered,
                            ]
                          : filtered
                      return (
                        <Select
                          size="small"
                          variant="borderless"
                          aria-label={cellLabel(
                            `${brand.name} ${t('priceCompare.sheet.columns.supplierShort')}`,
                            row,
                          )}
                          className={`price-compare-supplier${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
                          disabled={readOnly}
                          value={input?.supplierId}
                          title={supplierName}
                          placeholder={t('priceCompare.sheet.supplier')}
                          allowClear
                          showSearch={{ filterOption: filterSupplierOption }}
                          /*
                           * 供应商简称列同样窄(约 100px), 下拉与该列同宽会把
                           * 「杭州钢材贸易有限公司」这类长名截成「杭州钢材贸…」,
                           * 无法分辨供应商。按内容宽度撑开下拉。
                           */
                          popupMatchSelectWidth={false}
                          options={options}
                          onChange={(value) => {
                            const option = options.find(
                              (item) => item.value === value,
                            )
                            ctx.setSupplier(
                              brand.name,
                              current.id,
                              value
                                ? {
                                    value: String(value),
                                    label: option?.label ?? String(value),
                                  }
                                : undefined,
                            )
                          }}
                        />
                      )
                    },
                  ),
                ],
              },
            ],
    ),
    {
      // 填充列: 宽窗口时吸收剩余宽度, 避免商品列被拉伸
      key: '__filler__',
      title: '',
      align: 'left',
      render: () => null,
    },
  ]
}

/* ------------------------------------------------------------- 单据表格 */

/** 锁定原因可见文案的元素 id(供禁用按钮的 aria-describedby 关联)。 */
const LOCK_REASON_ID = 'price-compare-lock-reason'

/** 行菜单长按(触摸)打开时长, 与移动端长按唤起上下文菜单的习惯一致。 */
const ROW_MENU_LONG_PRESS_MS = 600
/** 长按期间允许的手指抖动像素: 超过即视为滚动, 取消长按。 */
const ROW_MENU_LONG_PRESS_MOVE_TOLERANCE_PX = 10

type SheetTableProps = {
  rows: PriceRow[]
  base: Omit<
    ColumnContext,
    'rows' | 'onRowDragStart' | 'onRowDragEnd' | 'toggleAll' | 'attachSpotRef'
  > & { density: 'small' | 'middle' | 'large' }
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
  const onRowDragEnd = () => {
    setDragId(null)
    setDropId(null)
    setDropAfter(false)
  }

  const columns = buildSheetColumns({
    ...base,
    rows,
    attachSpotRef: true,
    onRowDragStart,
    onRowDragEnd,
    toggleAll: (checked) => {
      for (const row of rows) toggleSelect(row.id, checked)
    },
  })
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
        <Table.Summary.Row>
          <Table.Summary.Cell
            index={0}
            colSpan={(base.hideRemark ? 5 : 6) + base.visibleBrandCount * 4}
          >
            <Flex gap="small" align="center">
              <Button
                type="text"
                size="small"
                block
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
                block
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
      )}
      rowClassName={(row) => {
        const classes: string[] = []
        if (isSeparatorRow(row.row)) classes.push('price-compare-separator-row')
        else if (isPurchasedRow(row.row))
          classes.push('price-compare-purchased-row')
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
            onRowDragEnd()
            return
          }
          const fromId = event.dataTransfer.getData('text/row-id')
          if (fromId) onReorderRow(fromId, row.rowId, dropAfter)
          onRowDragEnd()
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

/** 列显示设置: 备注列与整组品牌列的临时显隐(不持久化)。 */
function ColumnSettingsButton({
  hideRemark,
  brands,
  hiddenBrands,
  onToggleRemark,
  onToggleBrand,
}: {
  hideRemark: boolean
  brands: Brand[]
  hiddenBrands: string[]
  onToggleRemark: (visible: boolean) => void
  onToggleBrand: (brandName: string, visible: boolean) => void
}) {
  const { t } = useTranslation()
  const hiddenBrandSet = new Set(hiddenBrands)
  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      content={
        <Flex vertical gap={4} className="price-compare-column-settings">
          <Checkbox
            checked={!hideRemark}
            onChange={(event) => onToggleRemark(event.target.checked)}
          >
            {t('priceCompare.sheet.columns.remark')}
          </Checkbox>
          {brands.length ? (
            <>
              <Divider className="my-4" />
              <Text type="secondary" className="price-compare-sub">
                {t('priceCompare.sheet.columns.brand')}
              </Text>
              {brands.map((brand) => (
                <Checkbox
                  key={brand.name}
                  checked={!hiddenBrandSet.has(brand.name)}
                  onChange={(event) =>
                    onToggleBrand(brand.name, event.target.checked)
                  }
                >
                  {brand.name}
                </Checkbox>
              ))}
            </>
          ) : null}
        </Flex>
      }
    >
      <Tooltip title={t('priceCompare.sheet.columnSettings')}>
        <Button
          icon={<SettingOutlined />}
          aria-label={t('priceCompare.sheet.columnSettings')}
        />
      </Tooltip>
    </Popover>
  )
}

/**
 * 供应商批量填入下拉: 选择一个供应商后回调; 用于「整列」与「选中行」两个入口。
 * 复用与单元格一致的品牌过滤与拼音搜索。
 */
function SupplierFillSelect({
  brandName,
  options,
  onPick,
}: {
  brandName?: string
  options: SupplierSelectOption[]
  onPick: (option: { value: string; label: string } | undefined) => void
}) {
  const { t } = useTranslation()
  const filtered = brandName
    ? filterSupplierOptionsByBrand(options, brandName)
    : options
  return (
    <Select
      autoFocus
      size="small"
      style={{ width: 180 }}
      className="price-compare-supplier-fill-select"
      placeholder={t('priceCompare.sheet.fillSupplierPick')}
      showSearch={{ filterOption: filterSupplierOption }}
      /* 供应商全称可达 15 字以上, 与触发框同宽必然截断, 按内容撑开下拉。 */
      popupMatchSelectWidth={false}
      options={filtered}
      onChange={(value) => {
        const option = filtered.find((item) => item.value === value)
        onPick(
          value
            ? { value: String(value), label: option?.label ?? String(value) }
            : undefined,
        )
      }}
    />
  )
}

/** 品牌列「简称」表头: 一键把所选供应商填到该品牌列全部商品行。 */
function SupplierFillHeader({
  brandName,
  options,
  disabled,
  open,
  onOpenChange,
  onFill,
}: {
  brandName: string
  options: SupplierSelectOption[]
  disabled: boolean
  /** 受控开合: 由 SheetPanel 统一管理, 让表头右键菜单也能打开同一个弹层。 */
  open: boolean
  onOpenChange: (open: boolean) => void
  onFill: (option: { value: string; label: string } | undefined) => void
}) {
  const { t } = useTranslation()
  const title = t('priceCompare.sheet.fillSupplierColumn', { brand: brandName })
  return (
    <span className="price-compare-supplier-header">
      <span>{t('priceCompare.sheet.columns.supplierShort')}</span>
      {disabled ? null : (
        <Popover
          trigger="click"
          placement="bottom"
          open={open}
          onOpenChange={onOpenChange}
          content={
            <Flex vertical gap={4} className="price-compare-supplier-fill">
              <Text type="secondary" className="price-compare-sub">
                {title}
              </Text>
              <SupplierFillSelect
                brandName={brandName}
                options={options}
                onPick={(option) => {
                  onFill(option)
                  onOpenChange(false)
                }}
              />
            </Flex>
          }
        >
          <Button
            type="text"
            size="small"
            className="price-compare-supplier-fill-btn"
            icon={<VerticalAlignBottomOutlined />}
            aria-label={title}
          />
        </Popover>
      )}
    </span>
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
  hideRemark,
  hiddenBrands,
  brands,
  onToggleRemark,
  onToggleBrand,
  supplierOptions,
  onFillSupplierSelected,
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
  remark?: string
  onRemarkChange?: (value: string) => void
  allowHrb400eFallback?: boolean
  readOnly?: boolean
  hideRemark: boolean
  hiddenBrands: string[]
  brands: Brand[]
  onToggleRemark: (visible: boolean) => void
  onToggleBrand: (brandName: string, visible: boolean) => void
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
        sheet={sheet}
        readOnly={readOnly}
        patchSheet={patchSheet}
        bestOn={bestOn}
        onToggleBest={onToggleBest}
        refreshing={refreshing}
        onRefresh={onRefresh}
        hideRemark={hideRemark}
        brands={brands}
        hiddenBrands={hiddenBrands}
        onToggleRemark={onToggleRemark}
        onToggleBrand={onToggleBrand}
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
          <DatePicker
            size="small"
            style={{ width: 132 }}
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
            style={{ width: 132 }}
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
              <span className="price-compare-fallback-badge">E</span>
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
  readOnly,
  patchSheet,
  bestOn,
  onToggleBest,
  refreshing,
  onRefresh,
  hideRemark,
  brands,
  hiddenBrands,
  onToggleRemark,
  onToggleBrand,
  onOpenConfig,
  selectedCount,
  supplierOptions,
  onFillSupplierSelected,
  onRemoveSelected,
}: {
  sheet: PriceSheet
  readOnly: boolean
  patchSheet: (id: string, patch: Partial<PriceSheet>) => void
  bestOn: boolean
  onToggleBest: () => void
  refreshing: boolean
  onRefresh: () => void
  hideRemark: boolean
  brands: Brand[]
  hiddenBrands: string[]
  onToggleRemark: (visible: boolean) => void
  onToggleBrand: (brandName: string, visible: boolean) => void
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
      <ColumnSettingsButton
        hideRemark={hideRemark}
        brands={brands}
        hiddenBrands={hiddenBrands}
        onToggleRemark={onToggleRemark}
        onToggleBrand={onToggleBrand}
      />
      {onOpenConfig ? (
        <Button icon={<SettingOutlined />} onClick={onOpenConfig}>
          {t('priceCompare.sheet.config')}
        </Button>
      ) : null}
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
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  density: 'small' | 'middle' | 'large'
  lengthPremium: number
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
  /** 采购订单吨位数据(选项/回显/加载中), 供吨位列关联。 */
  purchaseOrderTonnage?: PurchaseOrderTonnageDraftInput
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
    data,
    varieties,
    brands,
    rows,
    density,
    lengthPremium,
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
    purchaseOrderTonnage = EMPTY_PURCHASE_ORDER_TONNAGE,
  } = props
  const { t } = useTranslation()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bestOn, setBestOn] = useState(false)
  const [spotResetNonce, setSpotResetNonce] = useState(0)
  /** 仅临时(不持久化)的列显隐: 备注列与整组品牌列。 */
  const [hideRemark, setHideRemark] = useState(false)
  const [hiddenBrands, setHiddenBrands] = useState<string[]>([])
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
    setHiddenBrands((current) =>
      withMemberVisibility(current, brandName, visible),
    )
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

  const getSpot = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]?.spot
  const patchRow = (rowId: string, patch: Partial<PriceRow>) =>
    setRows((list) =>
      list.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    )

  /** 现货价联动: 同批次内 品牌+类别+材质+规格+长度 相同则同步。 */
  const setSpot = (
    brandName: string,
    rowId: string,
    value: number | undefined,
  ) => {
    const { inputs, targets } = syncSpotInputs(
      rows,
      sheet.inputs,
      brandName,
      rowId,
      value,
    )
    patchSheet(sheet.id, { inputs })
    // 仅记录本次会话现货价实际发生变动(新增/改动)的行: 数值未变的不参与后续批量填入供应商。
    const changedTargets = targets
      .filter(
        (target) =>
          value !== undefined &&
          sheet.inputs[`${brandName}:${target.id}`]?.spot !== value,
      )
      .map((target) => `${brandName}:${target.id}`)
    markSpotsTouched(changedTargets)
    const text = value === undefined ? '' : String(value)
    for (const target of targets) {
      if (target.id === rowId) continue
      const input = document.querySelector<HTMLInputElement>(
        `input[data-spot="${brandName}:${target.id}"]`,
      )
      if (input) input.value = text
    }
  }

  const getInput = (brandName: string, rowId: string) =>
    sheet.inputs[`${brandName}:${rowId}`]

  /** 记录/清除现货价来源供应商; 无现货也无供应商时删除该输入。 */
  const setSupplier = (
    brandName: string,
    rowId: string,
    option: { value: string; label: string } | undefined,
  ) => {
    const key = `${brandName}:${rowId}`
    const inputs: SheetInputs = { ...sheet.inputs }
    const prev = inputs[key] ?? {}
    if (!option) {
      const {
        supplierId: _supplierId,
        supplierName: _supplierName,
        ...rest
      } = prev
      if (rest.spot === undefined && rest.ton === undefined) {
        delete inputs[key]
      } else {
        inputs[key] = rest
      }
    } else {
      inputs[key] = {
        ...prev,
        supplierId: option.value,
        supplierName: option.label,
      }
    }
    patchSheet(sheet.id, { inputs })
  }

  /**
   * 批量填入供应商: 仅作用于「本次会话内改过现货价」的目标行, 覆盖其已有简称;
   * 未改价的行保留原简称, 避免换第 N 家时误改已定价的其它供应商行。仅改简称, 不动现货价。
   */
  const fillSupplier = (
    brandName: string,
    rowIds: string[],
    option: { value: string; label: string } | undefined,
  ) => {
    const eligibleIds = rowIds.filter((rowId) =>
      spotTouchedKeys.has(`${brandName}:${rowId}`),
    )
    if (!eligibleIds.length) {
      message.info(t('priceCompare.sheet.fillSupplierNoChangedRows'))
      return
    }
    const inputs = fillSupplierInputs(
      rows,
      sheet.inputs,
      brandName,
      eligibleIds,
      option,
    )
    if (inputs !== sheet.inputs) patchSheet(sheet.id, { inputs })
    consumeSpotsTouched(eligibleIds.map((rowId) => `${brandName}:${rowId}`))
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

  const purchaseOrderPicker = usePurchaseOrderPicker({
    rows,
    excludeSheetId: /^[1-9]\d*$/.test(sheet.id) ? sheet.id : undefined,
    patchRow,
  })

  /** 当前字号下的列宽(个人设置字号变化时自动重算, 保证文字不被裁断)。 */
  const columnWidths = useSheetColumnWidths()

  const base = {
    sheet,
    t,
    // 列宽随个人设置字号等比缩放: 字号调大后不再把「材质 / 规格 / 长度」等列裁断
    widths: columnWidths,
    refDate,
    refPeriod,
    lengthPremium,
    varietyByLabel,
    data,
    varieties,
    brands,
    density,
    getSpot,
    setSpot,
    getInput,
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
    purchaseOrderTonnage,
    openPurchaseOrderPicker: purchaseOrderPicker.open,
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
        remark={remark}
        onRemarkChange={onRemarkChange}
        allowHrb400eFallback={allowHrb400eFallback}
        readOnly={readOnly}
        hideRemark={hideRemark}
        hiddenBrands={hiddenBrands}
        brands={brands}
        onToggleRemark={(visible) => setHideRemark(!visible)}
        onToggleBrand={toggleBrandVisible}
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
      {purchaseOrderPicker.node}
    </>
  )

  if (!chrome) return content
  return (
    <Card size="small" styles={{ body: { padding: 12 } }}>
      {content}
    </Card>
  )
}
