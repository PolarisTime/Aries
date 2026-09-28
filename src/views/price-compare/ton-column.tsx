import type { ColumnType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { message } from '@/utils/antd-app'
import { isSeparatorRow, LOCK_REASON_KEYS, resolveLock } from './core'
import { TonCell } from './TonCell'
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
  tonTotalText: string
  /** 当前字号下的吨位列宽(由 core.sheetColumnWidths 换算)。 */
  width: number
  quantityLockClass?: string
  purchaseOrderOptions: PurchaseOrderTonnageRecord[]
  tonnageByItemId: Map<string, PurchaseOrderTonnageRecord>
  purchaseOrderTonnageLoading: boolean
  localTonByItemId: Map<string, number>
  /** 在吨位列内移动焦点; 返回 false 表示已到列首/列尾(调用方应放行默认 Tab)。 */
  moveFocusTon: (rowId: string, delta: number) => boolean
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  /** 打开采购订单选择弹窗(rowId 用于回填到对应行)。 */
  openPurchaseOrderPicker: (rowId: string) => void
}

/** 构建「报单吨位 + 已开/订货进度 + 明细」列, 供比价表格复用。 */
export function buildTonColumn(ctx: TonColumnContext): ColumnType<GridRow> {
  const { t } = ctx
  const tonColumnTitle = t('priceCompare.sheet.columns.ton')
  const tonTotalLabel = t('priceCompare.sheet.tonTotal')
  return {
    // 表头一行放两段: 左侧列名, 右侧次要的合计; 不再用两行堆叠, 避免列头被挤成
    // 「报单吨位 / 合计: 5」两行后既占高又对不齐。
    title: (
      <span className="price-compare-ton-header">
        <span className="price-compare-ton-header-title">{tonColumnTitle}</span>
        <span className="price-compare-ton-total">
          {tonTotalLabel} {ctx.tonTotalText}
        </span>
      </span>
    ),
    width: ctx.width,
    fixed: 'left',
    align: 'center',
    // 窄列时表头仍可能被裁切: 补 title 展示完整表头(鼠标悬停可见)
    onHeaderCell: () => ({
      title: `${tonColumnTitle} ${tonTotalLabel} ${ctx.tonTotalText}`,
    }),
    render: (_value, row) => {
      if (isSeparatorRow(row.row)) return null
      /*
       * 锁定层级 单据 > 行 > 单元格: 吨位与规格同属「规格和数量」, 行级锁一并冻结。
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
      return (
        <TonCell
          disabled={ctx.readOnly || ctx.sheetSpecQuantityLocked}
          rowLockDisabled={Boolean(row.row.locked)}
          lockReason={lockReason}
          linked={
            row.row.purchaseOrderItemId
              ? ctx.tonnageByItemId.get(row.row.purchaseOrderItemId)
              : undefined
          }
          localTonForItem={
            row.row.purchaseOrderItemId
              ? (ctx.localTonByItemId.get(row.row.purchaseOrderItemId) ?? 0)
              : 0
          }
          rowLocked={Boolean(row.row.locked)}
          loading={ctx.purchaseOrderTonnageLoading}
          lockedClassName={ctx.quantityLockClass}
          options={ctx.purchaseOrderOptions}
          row={row.row}
          rowId={row.rowId}
          onOpenPicker={() => ctx.openPurchaseOrderPicker(row.rowId)}
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
