import type { ColumnType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { message } from '@/utils/antd-app'
import {
  isSeparatorRow,
  LOCK_REASON_KEYS,
  resolveLock,
  type SHEET_COLUMN_WIDTH,
  SHEET_HIDEABLE_COLUMN,
} from './core'
import { IssuedTonCell, TonCell, TonUnopenedCell } from './TonCell'
import type { GridRow, PriceRow } from './types'

/** 采购订单吨位数据(选项/回显/加载中), 由视图层透传给吨位列。 */
export interface PurchaseOrderTonnageDraftInput {
  options: PurchaseOrderTonnageRecord[]
  tonnageByItemId: Map<string, PurchaseOrderTonnageRecord>
  loading: boolean
  /** 选项加载失败: 供视图层提示"吨位暂不可用"。 */
  isError: boolean
}

/** 缺省空数据: 未传入时吨位列仍可编辑吨位, 仅不展示订单关联。 */
export const EMPTY_PURCHASE_ORDER_TONNAGE: PurchaseOrderTonnageDraftInput = {
  options: [],
  tonnageByItemId: new Map(),
  loading: false,
  isError: false,
}

/** 单据表格列宽表(键与 `core.SHEET_COLUMN_WIDTH` 一致)。 */
export type SheetColumnWidths = Record<keyof typeof SHEET_COLUMN_WIDTH, number>

/**
 * 两个「可显隐吨位列」的**唯一注册表**。
 *
 * <p><b>为什么必须集中在这里</b>: 这一对列曾各由四处分别描述 —— 勾选框文案、显隐偏好 key、
 * 列构建函数名、列宽来源。提交 `d2f71b4b` 把两列的**内容方向**对调了(「已开货」改为真实入库量、
 * 「剩余未开」改为报单 − 已开货), 但只改了渲染内容, 没同步改函数名与开关变量名, 于是出现
 * 「勾『已开货』关掉的却是『剩余未开』」的交叉错位(实测复现三次)。</p>
 *
 * <p>现在 key / 表头文案 / 列宽 / 渲染函数全部由本表一处给出: 勾选框、显隐偏好、列构建都
 * **遍历本表**, 不再各自持有一份映射。新增第三个可显隐吨位列时只在这里加一项, 三处自动同步。</p>
 */
export const SHEET_TON_COLUMN = {
  /** 「剩余未开」= 本单据报单吨位 − 真实已开货(报单视角的进度, 只放一个数字)。 */
  remaining: {
    /** 唯一 key: 勾选框、显隐偏好持久化、列构建三处共用。 */
    key: SHEET_HIDEABLE_COLUMN.unopenedTon,
    /** 表头文案 i18n key —— 列名与勾选框标签取同一份, 不可能再错位。 */
    headerKey: 'priceCompare.sheet.columns.unopenedTon',
    /** 该列宽度取宽度表的哪一项(窄口径: 只有一个数字, 无品牌与图标)。 */
    widthKey: 'issuedTon',
  },
  /** 「已开货」= 关联明细行的真实已开货合计(入库回写), 承载品牌与明细入口。 */
  shipped: {
    key: SHEET_HIDEABLE_COLUMN.issuedTon,
    headerKey: 'priceCompare.sheet.columns.issuedTon',
    /** 宽口径: 数字 + 品牌 + 明细图标。 */
    widthKey: 'unopenedTon',
  },
} as const

export type SheetTonColumnId = keyof typeof SHEET_TON_COLUMN

/**
 * 两个可显隐吨位列的**渲染顺序**(与既有表格布局一致, 不要随注册表键序漂移)。
 *
 * <p>顺序在这里定死而不是靠对象键序: 用户偏好里存的是 key, 顺序变化会让整表横向位移。</p>
 */
export const SHEET_TON_COLUMN_ORDER = [
  'remaining',
  'shipped',
] as const satisfies readonly SheetTonColumnId[]

/** 取某列的 key(供显隐判定与偏好读写)。 */
export function tonColumnKey(id: SheetTonColumnId): string {
  return SHEET_TON_COLUMN[id].key
}

/** 取某列的表头文案(列名与勾选框标签唯一来源)。 */
export function tonColumnHeader(id: SheetTonColumnId, t: TFunction): string {
  return t(SHEET_TON_COLUMN[id].headerKey)
}

/** 取某列的宽度(唯一来源: 注册表的 widthKey → 宽度表)。 */
export function tonColumnWidth(
  id: SheetTonColumnId,
  widths: SheetColumnWidths,
): number {
  return widths[SHEET_TON_COLUMN[id].widthKey]
}

export interface TonColumnContext {
  t: TFunction
  sheetSpecQuantityLocked: boolean
  readOnly: boolean
  /** 当前字号下的列宽表(见 core.sheetColumnWidths), 所有列宽只能从这里取。 */
  widths: SheetColumnWidths
  quantityLockClass?: string
  purchaseOrderOptions: PurchaseOrderTonnageRecord[]
  tonnageByItemId: Map<string, PurchaseOrderTonnageRecord>
  purchaseOrderTonnageLoading: boolean
  /**
   * 采购订单吨位选项查询失败。与 `purchaseOrderTonnageLoading` 一起构成"选项三态":
   * 非就绪时吨位两列不能断言关联明细行「已删除」(那只是还没加载到)。
   */
  purchaseOrderTonnageError?: boolean
  /**
   * 本单据各采购订单明细行的报单吨位合计。
   *
   * <p>聚合只算一次(视图层 useMemo), 三列共用同一份; 各处在单元格里重算会让"某列认得关联、
   * 某列不认得"或同一行两个合计打架。这里只读。</p>
   */
  localTonByItemId: Map<string, number>
  /** 在吨位列内移动焦点; 返回 false 表示已到列首/列尾(调用方应放行默认 Tab)。 */
  moveFocusTon: (rowId: string, delta: number) => boolean
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  /** 打开采购订单选择弹窗(rowId 用于回填到对应行)。 */
  openPurchaseOrderPicker: (rowId: string) => void
}

/** 三列共用的锁定视图: 层级原因与"关联采购订单是否放行"口径一致。 */
function lockView(ctx: TonColumnContext, row: GridRow) {
  /*
   * 锁定层级 单据 > 行 > 单元格: 规格与吨位同属「规格和数量」, 两种锁都冻结。
   * 原因文案由最高命中层级决定(而不是"谁先命中用谁"), 否则单据锁 + 行锁叠加时
   * 会显示行级原因, 与工具栏正在生效的全局锁口径不一致。
   */
  const lock = resolveLock({
    sheet: ctx.sheetSpecQuantityLocked,
    row: Boolean(row.row.locked),
  })
  const lockReason = ctx.readOnly
    ? ctx.t('priceCompare.sheet.readOnlyHint')
    : lock.level
      ? ctx.t(LOCK_REASON_KEYS[lock.level])
      : undefined
  /*
   * 关联采购订单与吨位输入同口径: 行级锁与单据级「锁定规格和数量」都表示规格/吨位已定稿,
   * 两者任一命中即放行。只读(他人签出)时 patchRow 会被丢弃, 弹窗能开却默默不生效,
   * 因此一并拒绝并给出只读原因 —— 与行菜单"只读整体禁用"的口径保持一致。
   */
  return {
    lockReason,
    purchaseOrderLinkAllowed: !ctx.readOnly && lock.locked,
    linkedItem: row.row.purchaseOrderItemId
      ? ctx.tonnageByItemId.get(row.row.purchaseOrderItemId)
      : undefined,
    localTonForItem: row.row.purchaseOrderItemId
      ? (ctx.localTonByItemId.get(row.row.purchaseOrderItemId) ?? 0)
      : 0,
  }
}

/**
 * 「报单吨位」列: 手填输入框(锁定原因与关联前置条件同口径)。
 *
 * <p>必填列, 不参与显隐。</p>
 */
export function buildTonColumn(ctx: TonColumnContext): ColumnType<GridRow> {
  const { t } = ctx
  const tonColumnTitle = t('priceCompare.sheet.columns.ton')
  return {
    // 表头只放列名; 合计吨位改由表格底部的合计行承载(挤在表头里会把「报单吨位」截断)。
    key: 'ton',
    title: tonColumnTitle,
    width: ctx.widths.ton,
    fixed: 'left',
    align: 'center',
    // 窄列时表头仍可能被裁切: 补 title 展示完整列名(鼠标悬停可见)
    onHeaderCell: () => ({ title: tonColumnTitle }),
    render: (_value, row) => {
      if (isSeparatorRow(row.row)) return null
      const view = lockView(ctx, row)
      return (
        <TonCell
          disabled={ctx.readOnly || ctx.sheetSpecQuantityLocked}
          rowLockDisabled={Boolean(row.row.locked)}
          lockReason={view.lockReason}
          lockedClassName={ctx.quantityLockClass}
          row={row.row}
          rowId={row.rowId}
          onMoveFocus={(delta) => ctx.moveFocusTon(row.rowId, delta)}
          onTonChange={(value, warnPositive) => {
            if (warnPositive) {
              message.warning(t('priceCompare.sheet.tonPositive'))
              return
            }
            ctx.patchRow(row.rowId, { ton: value })
          }}
        />
      )
    },
  }
}

/**
 * 「剩余未开」列: 报单吨位 − 真实已开货(入库回写), 只读。
 *
 * <p>口径唯一出口是 `remainingTonDisplay`(`ton-progress-text.ts`); 本列只负责渲染,
 * 不内联任何算式。表头文案与列宽都取自 {@link SHEET_TON_COLUMN.remaining}。</p>
 */
export function buildRemainingTonColumn(
  ctx: TonColumnContext,
): ColumnType<GridRow> {
  const label = tonColumnHeader('remaining', ctx.t)
  return {
    title: label,
    className: 'price-compare-cell--number',
    width: tonColumnWidth('remaining', ctx.widths),
    align: 'center',
    onHeaderCell: () => ({ title: label }),
    render: (_value, row) => {
      if (isSeparatorRow(row.row)) return null
      const view = lockView(ctx, row)
      return (
        <IssuedTonCell
          linked={view.linkedItem}
          localTonForItem={view.localTonForItem}
          options={ctx.purchaseOrderOptions}
          isError={ctx.purchaseOrderTonnageError}
          loading={ctx.purchaseOrderTonnageLoading}
          row={row.row}
        />
      )
    },
  }
}

/**
 * 「已开货」列: 关联明细行的真实已开货合计(入库审核回写), 并承载品牌与采购订单明细入口。
 *
 * <p>关联入口(ⓘ)留在这里: 明细弹层要展示报单/已开货/剩余未开与"选择采购订单"动作,
 * 与这一列的数出口径完全一致; 报单吨位列只留输入框, 不再被次要文字挤占。
 * 表头文案与列宽都取自 {@link SHEET_TON_COLUMN.shipped}。</p>
 */
export function buildShippedTonColumn(
  ctx: TonColumnContext,
): ColumnType<GridRow> {
  const label = tonColumnHeader('shipped', ctx.t)
  return {
    title: label,
    width: tonColumnWidth('shipped', ctx.widths),
    align: 'center',
    onHeaderCell: () => ({ title: label }),
    render: (_value, row) => {
      if (isSeparatorRow(row.row)) return null
      const view = lockView(ctx, row)
      return (
        <TonUnopenedCell
          linked={view.linkedItem}
          loading={ctx.purchaseOrderTonnageLoading}
          isError={ctx.purchaseOrderTonnageError}
          localTonForItem={view.localTonForItem}
          options={ctx.purchaseOrderOptions}
          purchaseOrderLinkAllowed={view.purchaseOrderLinkAllowed}
          purchaseOrderLinkBlockedReason={
            ctx.readOnly ? view.lockReason : undefined
          }
          row={row.row}
          onOpenPicker={() => ctx.openPurchaseOrderPicker(row.rowId)}
        />
      )
    },
  }
}

/** 注册表 id → 构建函数(唯一映射, 供 {@link buildTonColumns} 使用)。 */
const TON_COLUMN_BUILDERS = {
  remaining: buildRemainingTonColumn,
  shipped: buildShippedTonColumn,
} as const satisfies Record<
  SheetTonColumnId,
  (ctx: TonColumnContext) => ColumnType<GridRow>
>

/**
 * 按注册表顺序构建可见的吨位列(显隐判定只认注册表的 key)。
 *
 * <p>调用方只提供 `isVisible`(通常读用户偏好), 不需要知道哪一列对应哪个 key ——
 * 这正是本条缺陷的修法: 门禁不再由调用方手写两遍, 而是遍历同一张注册表。</p>
 */
export function buildTonColumns(
  ctx: TonColumnContext,
  isVisible: (id: SheetTonColumnId) => boolean,
): ColumnType<GridRow>[] {
  return SHEET_TON_COLUMN_ORDER.filter(isVisible).map((id) =>
    TON_COLUMN_BUILDERS[id](ctx),
  )
}
