import type { ColumnType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { message } from '@/utils/antd-app'
import { isSeparatorRow, LOCK_REASON_KEYS, resolveLock } from './core'
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

export interface TonColumnContext {
  t: TFunction
  sheetSpecQuantityLocked: boolean
  readOnly: boolean
  /** 当前字号下的报单吨位列宽(由 core.sheetColumnWidths 换算)。 */
  width: number
  /** 当前字号下的已开吨位列宽。 */
  issuedWidth: number
  /** 当前字号下的未开吨位列宽(按内容驱动)。 */
  unopenedWidth: number
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

/**
 * 构建吨位三列: 「报单吨位」(手填输入)、「已开吨位」(服务端口径)、
 * 「未开吨位」(= 订货吨位 − 已开吨位, 含品牌与明细入口)。
 *
 * <p>三列并排而不再挤在一格小字里: 用户不必心算, 也不会因为一行放不下被省略号收尾;
 * 锁定口径(单据 > 行)三列共用同一份 {@link lockView}。</p>
 */
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

/** 「报单吨位」列: 手填输入框(锁定原因与关联前置条件同口径)。 */
export function buildTonColumn(ctx: TonColumnContext): ColumnType<GridRow> {
  const { t } = ctx
  const tonColumnTitle = t('priceCompare.sheet.columns.ton')
  return {
    // 表头只放列名; 合计吨位改由表格底部的合计行承载(挤在表头里会把「报单吨位」截断)。
    key: 'ton',
    title: tonColumnTitle,
    width: ctx.width,
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

/** 「已开吨位」列: 服务端按其他已保存报单统计的量, 只读。 */
export function buildIssuedTonColumn(
  ctx: TonColumnContext,
): ColumnType<GridRow> {
  const { t } = ctx
  // 2026-10-14 口径修正: 本列显示「剩余未开吨位 = 订货吨位 − 已开吨位」; 「已开吨位」移到相邻
  // 的下一列(buildUnopenedTonColumn 渲染)。函数名与列宽来源(ctx.issuedWidth)保留, 其宽度
  // 计算口径已同步改为"剩余吨位文本"。
  const label = t('priceCompare.sheet.columns.unopenedTon')
  return {
    title: label,
    className: 'price-compare-cell--number',
    width: ctx.issuedWidth,
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
 * 「未开吨位」列: 订货吨位 − 已开吨位, 并承载品牌与采购订单明细入口。
 *
 * <p>关联入口(ⓘ)留在这里: 明细弹层要展示订货/已开/未开与"选择采购订单"动作,
 * 与这一列的数出口径完全一致; 报单吨位列只留输入框, 不再被次要文字挤占。</p>
 */
export function buildUnopenedTonColumn(
  ctx: TonColumnContext,
): ColumnType<GridRow> {
  const { t } = ctx
  // 2026-10-14 口径修正: 本列显示「已开吨位 = 本单据该明细行报单吨位 + 其他已保存报单占用」
  const label = t('priceCompare.sheet.columns.issuedTon')
  return {
    title: label,
    width: ctx.unopenedWidth,
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
