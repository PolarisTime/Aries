/**
 * 比价表格的列定义与单元格控件（从 `SheetPanel.tsx` 抽出的独立职责）。
 *
 * <p>只负责「列 id / 宽度 / 渲染函数」：`buildSheetColumns` 由 {@link ColumnContext} 配置驱动，
 * 列顺序、列宽与渲染行为与原实现逐字一致（本模块的提取不改变任何 UI 行为）。
 * 表格外壳、顶部栏与行操作栏仍留在 `SheetPanel.tsx`。</p>
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  HolderOutlined,
  InsertRowAboveOutlined,
  InsertRowBelowOutlined,
  LockOutlined,
  MoreOutlined,
  SwapOutlined,
  UnlockOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons'
import {
  Button,
  Checkbox,
  Flex,
  Input,
  Popover,
  Select,
  Tooltip,
  Typography,
} from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { ColumnsType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { ColumnHeaderMenu } from '@/components/ColumnHeaderMenu'
import { ContextMenu } from '@/components/ContextMenu'
import { message, modal } from '@/utils/antd-app'
import { substituteMaterialOf } from '@/utils/material-grade'
import { createPinyinFilterOption } from '@/utils/pinyin-search'
import {
  applyRowLock,
  buildVarietyOptions,
  fallbackBadgeMaterial,
  filterSupplierOptionsByBrand,
  filterVarieties,
  findAlternateLengthVariety,
  isSeparatorRow,
  isSubstitutableMaterial,
  LOCK_REASON_KEYS,
  netPriceWithFallback,
  pickBestDiffBrands,
  resolveLock,
  type SHEET_COLUMN_WIDTH,
  SPOT_PRICE_MAX,
  type SupplierSelectOption,
} from './core'
import { resolveCellSpotSource } from './spot-source-cancel'
import { buildTonColumn } from './ton-column'
import type {
  Brand,
  GridRow,
  PriceData,
  PriceRow,
  PriceSheet,
  SheetInput,
  Variety,
} from './types'

const { Text } = Typography

/**
 * 「E」角标：**唯一**渲染出口（网价代取、现货价代取、表头图例共用）。
 *
 * <p>两种形态，语义不同，不要合并：</p>
 * <ul>
 *   <li>带 `label`：数据角标。`role="img"` + `aria-label` + `title`，读屏能听到
 *     「按 HRB400E 代取（来源 X）」，满足 WCAG 1.4.1（不以颜色/字母为唯一表达）。</li>
 *   <li>不带 `label`：表头图例里的装饰 chip —— 意义由紧邻的可见文案表达，
 *     这里 `aria-hidden` 掉，避免读屏把装饰字母单独念一遍再念文案。</li>
 * </ul>
 */
export function FallbackBadge({ label }: { label?: string }) {
  if (!label) {
    return (
      <span aria-hidden="true" className="price-compare-fallback-badge">
        E
      </span>
    )
  }
  return (
    <span
      aria-label={label}
      className="price-compare-fallback-badge"
      role="img"
      title={label}
    >
      E
    </span>
  )
}

/** 供应商简称下拉: 支持中文原文 + 拼音全拼/首字母索引。 */
const filterSupplierOption = createPinyinFilterOption()

/**
 * 供应商批量填入下拉: 选择一个供应商后回调; 用于「整列」与「选中行」两个入口。
 * 复用与单元格一致的品牌过滤与拼音搜索。
 */
export function SupplierFillSelect({
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

/* ------------------------------------------------------------------ 列定义 */

export type ColumnContext = {
  sheet: PriceSheet
  t: TFunction
  /** 当前字号下的列宽表(见 core.sheetColumnWidths), 所有列宽只能从这里取。 */
  widths: Record<keyof typeof SHEET_COLUMN_WIDTH, number>
  readOnly: boolean
  refDate: string
  refPeriod: string
  /**
   * 迁移兜底用的旧「项目级 12 米加价」：**只在定尺主数据为空时**生效
   * （见 `core.lengthPremiumOf`），不是加价来源。
   */
  lengthPremium: number
  /** 定尺名称 → 每吨加价（来自定尺主数据）；空表时走迁移兜底。 */
  lengthPremiums: Readonly<Record<string, number>>
  /** 定尺名称 → 排序号（来自定尺主数据），决定长度互切候选的确定性顺序。 */
  lengthSortOrders: Readonly<Record<string, number>>
  varietyByLabel: Map<string, Variety>
  data: PriceData | null
  varieties: Variety[]
  brands: Brand[]
  rows: PriceRow[]
  getSpot: (brandName: string, rowId: string) => number | undefined
  setSpot: (brandName: string, rowId: string, value: number | undefined) => void
  /** 单格取消代取标记（置 spotSourceMaterial = null），不影响价格与行级开关。 */
  clearSpotSource: (brandName: string, rowId: string) => void
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
  /** 是否隐藏备注列(列设置弹层可切换, 走用户偏好持久化)。 */
  hideRemark: boolean
  /** 整组隐藏的品牌名。 */
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
  // 隔断行不参与网价/现货/差价/供应商等任一品牌列
  render: (value: unknown, row: GridRow) =>
    isSeparatorRow(row.row) ? null : render(value, row),
})

/** 行操作单元格需要的数据: 菜单项与开关都由外层表格控件决定, 这里只做渲染。 */
type RowActionsCellProps = {
  rowLabel: string
  /** 行级锁 `row.locked`: 只影响该行的规格/吨位与关联前置条件。 */
  rowLocked: boolean
  /** 只读(被他人签出): 整个入口不可用, 由外层 Tooltip 说明原因。 */
  disabled: boolean
  /** 「锁定规格和数量」是否生效: 只禁用会改动规格/数量的菜单项, 菜单本身仍可打开。 */
  specQuantityLocked: boolean
  tooltip: string
  /** 全局锁定期间菜单顶部展示的原因说明(不可点击)。 */
  lockReason: string
  /**
   * 触发器只对读屏/键盘可见(sr-only): 行操作列已并入勾选列, 视觉上不再单独占一列宽度,
   * 但按钮仍是可聚焦、有可访问名的菜单入口; 键盘聚焦时由 `:focus-visible` 还原为可见
   * 小按钮(否则焦点落在 1×1 裁剪处, 等于没有焦点指示)。
   */
  srOnlyTrigger?: boolean
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
 * 右键菜单只是补充入口 —— 键盘可达性由触发器自身保证(WCAG 2.1.1): 它在行操作列并入
 * 勾选列后视觉隐藏(`aries-sr-only`), 但仍然可 Tab 聚焦; 为避免焦点落在看不见的位置
 * (WCAG 2.4.7), `.aries-sr-only:focus-visible` 会在键盘聚焦时把它还原为可见小按钮
 * (见 `src/styles/loading.css` 与 `price-compare.css` 的浮层落位)。
 *
 * <p>锁定层级与菜单可用性的关系(全局 > 行 > 单元格):</p>
 * <ul>
 *   <li>`readOnly`(他人签出): 整表不可写, 按钮禁用; 外层用原生 `title` +
 *       Tooltip 给出原因, 避免"静默禁用";</li>
 *   <li>`rowLocked` 与 `specQuantityLocked` 是同一套「锁定规格和数量」的两种范围(行 / 整单):
 *       入口图标与状态文案都按**有效锁定**取, 行级锁不影响打开菜单;</li>
 *   <li>`specQuantityLocked`(全局锁): 菜单**仍可打开**, 但会改动规格/数量的项
 *       (行级锁定开关、上移/下移、插入行/隔断、删除该行)逐项禁用, 并在菜单顶部
 *       说明原因 —— 用户点得开、看得见为什么点不动;</li>
 *   <li>行级锁 `row.locked`: 只影响图标与文案(状态可见), 解锁入口保持可用。</li>
 * </ul>
 */
function RowActionsCell({
  rowLabel,
  rowLocked,
  disabled,
  specQuantityLocked,
  tooltip,
  lockReason,
  srOnlyTrigger,
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
  /**
   * 有效锁定状态: 单据级「锁定规格和数量」与行级锁是同一件事的两种范围, 状态可见性必须一致 ——
   * 只按 row.locked 画图标会让整单锁定时每行仍显示"更多", 用户看不出规格/吨位已被冻结。
   */
  const effectiveLocked = rowLocked || specQuantityLocked
  /*
   * 层级文案: 单据级锁生效时说明"整单已锁定规格和数量", 不再显示「解锁该行」——
   * 那个入口此刻是禁用的, 显示解锁动作会把用户引向做不到的操作(与工具栏口径不一致)。
   */
  const lockLabel = specQuantityLocked
    ? t('priceCompare.sheet.specQuantityLockedShort')
    : t(
        rowLocked
          ? 'priceCompare.sheet.unlockRow'
          : 'priceCompare.sheet.lockRow',
      )
  /** 全局锁定时统一禁用会改动规格/数量的项; 行级锁状态本身也由全局锁保护。 */
  const mutationDisabled = specQuantityLocked
  /** 单据级锁生效时, 行锁入口已被"整单锁定"接管, 保持禁用且不重复展示解锁动作。 */
  const toggleDisabled = mutationDisabled || specQuantityLocked
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
      icon: effectiveLocked ? <UnlockOutlined /> : <LockOutlined />,
      label: lockLabel,
      disabled: toggleDisabled,
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
            /*
             * sr-only + primary 变体的可见像素陷阱(真机实测过一条"下横线"):
             * `.aries-sr-only` 靠 `clip` 裁剪, 而**按规范 `clip` 只对绝对定位元素生效** ——
             * 全局 `touch-targets.css` 给按钮加了 `position: relative`, 裁剪因此失效, 盒子
             * 只剩 1px 高(antd icon-only 的 min-width 仍把它撑到 24px 宽), `type="primary"`
             * 的实心主色背景 + 2px 主色投影就会被画成 24×1 的蓝线。
             * 因此未聚焦的 sr-only 触发器由 `price-compare.css` 强制无背景/无投影;
             * 改这里的 type 或给这个按钮加背景前, 先确认未聚焦态不会画出可见像素。
             */
            className={`price-compare-row-actions${effectiveLocked ? ' price-compare-row-actions--locked' : ''}${srOnlyTrigger ? ' aries-sr-only' : ''}`}
            disabled={disabled}
            icon={effectiveLocked ? <LockOutlined /> : <MoreOutlined />}
            size="small"
            type={effectiveLocked ? 'primary' : 'text'}
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

export function buildSheetColumns(ctx: ColumnContext): ColumnsType<GridRow> {
  const {
    refDate,
    refPeriod,
    lengthPremium,
    lengthPremiums,
    lengthSortOrders,
    varietyByLabel,
    data,
    brands,
    rows,
    getSpot,
    getInput,
    setSpot,
    clearSpotSource,
    supplierOptions,
    patchRow,
    moveFocus,
    selectedIds,
    toggleSelect,
    toggleAll,
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
    widths,
  } = ctx
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
  /** 报单吨位列的构建上下文(列宽取整张宽度表, 不另设参数)。 */
  const tonColumnCtx = {
    t,
    sheetSpecQuantityLocked: Boolean(sheet.specQuantityLocked),
    readOnly,
    widths,
    quantityLockClass,
    moveFocusTon: ctx.moveFocusTon,
    patchRow,
  }
  /*
   * 每行"差价最优"的品牌集合(并列时可能多家)。
   *
   * 返回 Set 而不是单个名字: 差价完全相同的多家都是最优报价, 旧实现用 `diff > bestVal`
   * 只留住了遍历到的第一个, 用户看到"明明一样便宜却只有一家标蓝"。
   */
  const bestCache = new Map<string, ReadonlySet<string>>()
  const EMPTY_BEST: ReadonlySet<string> = new Set()
  const bestOf = (row: GridRow): ReadonlySet<string> => {
    if (!bestOn) return EMPTY_BEST
    const cached = bestCache.get(row.rowId)
    if (cached) return cached
    const cands: { brand: string; diff: number | undefined }[] = []
    for (const brand of brands) {
      const price = isCategoryEnabled(brand, row.row.category)
        ? netPriceWithFallback(
            data,
            refDate,
            refPeriod,
            brand.name,
            row.row,
            lengthPremiums,
            allowHrb400eFallback,
            lengthPremium,
          ).value
        : undefined
      const spot = getSpot(brand.name, row.row.id)
      if (price === undefined || spot === undefined) continue
      cands.push({ brand: brand.name, diff: price - spot - brand.freight })
    }
    const best: ReadonlySet<string> = new Set(pickBestDiffBrands(cands))
    bestCache.set(row.rowId, best)
    return best
  }
  /*
   * 非最优品牌淡出。并列最优的品牌**都不淡出**: 它们同为可选方案, 把并列者变灰等于
   * 又回到"只承认一个最优"的旧表现。
   */
  const isDimmed = (row: GridRow, brandName: string) => {
    const best = bestOf(row)
    return best.size > 0 && !best.has(brandName)
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
  /**
   * 行操作菜单宿主。
   *
   * <p>原先它是一个独立列(锁定/更多按钮)。该列只剩一个 icon-only 按钮, 在窄屏白占 28px;
   * 去掉列之后把菜单宿主放进勾选列, 触发器设为 sr-only —— 视觉上不占位, 但仍是可聚焦、
   * 有可访问名的入口(键盘等价物), 键盘聚焦时经 `:focus-visible` 还原为可见按钮,
   * 行内右键继续走同一份受控菜单。</p>
   */
  const renderRowMenuHost = (row: GridRow) => {
    if (isSeparatorRow(row.row)) return null
    const rowLocked = Boolean(row.row.locked)
    const specQuantityLocked = Boolean(sheet.specQuantityLocked)
    const rowIndex = rows.findIndex((item) => item.id === row.rowId)
    return (
      <RowActionsCell
        srOnlyTrigger
        rowLabel={rowLabelOf(row)}
        rowLocked={rowLocked}
        disabled={readOnly}
        specQuantityLocked={specQuantityLocked}
        lockReason={rowLockedHint}
        tooltip={
          readOnly
            ? t('priceCompare.sheet.readOnlyHint')
            : specQuantityLocked
              ? rowLockedHint
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
        onInsertRowAbove={() => ctx.insertRowAt(row.rowId, 'PRODUCT', 'above')}
        onInsertSeparatorBelow={() =>
          ctx.insertRowAt(row.rowId, 'SEPARATOR', 'below')
        }
        onDelete={() => ctx.deleteRow(row.rowId)}
      />
    )
  }

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
        <span className="price-compare-row-select">
          <Checkbox
            aria-label={t('priceCompare.sheet.a11y.selectRow', {
              row: rowLabelOf(row),
            })}
            checked={selectedIds.includes(row.rowId)}
            onChange={(event) => toggleSelect(row.rowId, event.target.checked)}
          />
          {renderRowMenuHost(row)}
        </span>
      ),
    },
    {
      title: '',
      width: 24,
      fixed: 'left',
      align: 'center',
      render: () => (
        <Tooltip title={rowInteractionLocked ? rowLockedHint : undefined}>
          {/* 手柄只作为「这行可以拖」的视觉提示: 真正承载拖拽的是 <tr>(整行可拖),
              两个元素各自 draggable 会让从手柄起拖时触发两遍 dragstart。 */}
          <span
            className={`price-compare-row-drag${rowInteractionLocked ? ' price-compare-row-drag-disabled' : ''}`}
            aria-disabled={rowInteractionLocked}
            title={
              rowInteractionLocked
                ? rowLockedHint
                : t('priceCompare.sheet.dragRow')
            }
          >
            <HolderOutlined />
          </span>
        </Tooltip>
      ),
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
        // 同规格存在另一长度时可切换(与采购/销售无关, 只受锁定层级约束)。
        const alternate = findAlternateLengthVariety(
          varietyOptionsFlat,
          current,
          lengthSortOrders,
        )
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
              {/* 行级「按 E 价」开关：默认跟随单据头；仅单据头放行且材质在白名单内才出现。
                  勾选后该行价格子按替代牌号带出并打 E 角标（判据见 core.resolveSpotSourceMaterial）。 */}
              {allowHrb400eFallback &&
              isSubstitutableMaterial(current.material) ? (
                <Checkbox
                  checked={current.hrb400eFallback === true}
                  className="price-compare-hrb400e-switch"
                  disabled={selectDisabled}
                  aria-label={t('priceCompare.sheet.hrb400eRowSwitch', {
                    material: substituteMaterialOf(current.material) ?? '',
                  })}
                  title={t('priceCompare.sheet.hrb400eRowSwitchHint', {
                    material: substituteMaterialOf(current.material) ?? '',
                  })}
                  onChange={(event) =>
                    patchRow(row.rowId, {
                      hrb400eFallback: event.target.checked,
                    })
                  }
                />
              ) : null}
            </div>
          </LockReason>
        )
      },
    },
    buildTonColumn(tonColumnCtx),

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
                            lengthPremiums,
                            allowHrb400eFallback,
                            lengthPremium,
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
                                {/* 角标渲染统一走 FallbackBadge（网价/现货/图例共用一处） */}
                                <FallbackBadge
                                  label={t(
                                    'priceCompare.sheet.fallbackBadgeLabel',
                                    {
                                      material:
                                        fallbackBadgeMaterial(
                                          row.row.material,
                                        ) ?? '',
                                    },
                                  )}
                                />
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
                      // spot 代取来源：系统带出（spotSourceMaterial，已落库）优先，
                      // 否则按会话内判据（单据头放行 + 行级开关 + 白名单）。
                      // 单格例外层：spot-source-cancel.resolveCellSpotSource
                      // （显式 null 优先于行级开关）；材质白名单等规则仍唯一在 core。
                      const spotInput = getInput(brand.name, current.id)
                      const spotSource = resolveCellSpotSource({
                        input: spotInput,
                        row: current,
                        allowHrb400eFallback,
                      })
                      const spotBadgeLabel = spotSource
                        ? t(
                            'priceCompare.sheet.fallbackBadgeLabelWithSupplier',
                            {
                              material: spotSource,
                              supplier: spotInput?.supplierName ?? '',
                            },
                          )
                        : ''
                      // 角标自带可访问名（role=img + aria-label），不改 input 的 aria-label
                      // —— 那个字段表达"中天 HRB400E 12 9米"这类字段身份，覆盖掉读屏就找不到格子。
                      const spotNode = spotSource ? (
                        <>
                          {input}
                          <FallbackBadge label={spotBadgeLabel} />
                          {/* 单格取消代取：只在有角标时出现（没角标就没有"取消"可言）。
                              置 spotSourceMaterial = null：不改价格、不动行级开关。 */}
                          <Button
                            aria-label={t(
                              'priceCompare.sheet.clearSpotSource',
                              { material: spotSource },
                            )}
                            className="price-compare-fallback-clear"
                            size="small"
                            title={t('priceCompare.sheet.clearSpotSource', {
                              material: spotSource,
                            })}
                            type="text"
                            onClick={() =>
                              clearSpotSource(brand.name, current.id)
                            }
                          >
                            ×
                          </Button>
                        </>
                      ) : (
                        input
                      )
                      return isFirst ? (
                        <span ref={ctx.spotRef}>{spotNode}</span>
                      ) : (
                        spotNode
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
                            lengthPremiums,
                            allowHrb400eFallback,
                            lengthPremium,
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
                            className={`price-compare-diff ${cls}${best.has(brand.name) ? ' is-best' : ''}${isDimmed(row, brand.name) ? ' price-compare-dim' : ''}`}
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
      /*
       * 填充列 —— **有意保留, 不是残留**(审查报告 P2-8 说的「409px 空表头 + 空单元格」即此列,
       * 实测宽 409px)。作用: 宽窗口下吸收表格右侧的剩余宽度, 不让最后一个品牌组被拉伸变形。
       *
       * 为什么不直接去掉: 窄窗口时它的宽度本就是 0 看不出来; 一旦窗口拉宽而没有这一列,
       * 品牌列(网价/现货/差价/简称)会各自变宽, 列对齐关系随窗口大小漂移。
       *
       * 已知代价: 表头与单元格都是空白, 读屏表格导航会经过一个无名单元格。不用 `aria-hidden`
       * 隐藏它 —— 那会让 rc-table 的列对齐计算与实际渲染脱节; 保持空文本即可, 空单元格
       * 不会打断读屏的表格导航。
       */
      key: '__filler__',
      title: '',
      align: 'left',
      render: () => null,
    },
  ]
}
