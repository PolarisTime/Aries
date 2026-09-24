import type { ColumnType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { message } from '@/utils/antd-app'
import { isSeparatorRow, SHEET_COLUMN_WIDTH } from './core'
import { TonCell } from './TonCell'
import type { GridRow, PriceRow } from './types'

/** 采购订单吨位数据(选项/回显/加载中), 由视图层透传给吨位列。 */
export interface PurchaseOrderTonnageDraftInput {
  options: PurchaseOrderTonnageRecord[]
  tonnageByOrderId: Map<string, PurchaseOrderTonnageRecord>
  loading: boolean
  /** 选项加载失败: 供视图层提示"吨位暂不可用"。 */
  isError: boolean
}

/** 缺省空数据: 未传入时吨位列仍可编辑吨位, 仅不展示订单关联。 */
export const EMPTY_PURCHASE_ORDER_TONNAGE: PurchaseOrderTonnageDraftInput = {
  options: [],
  tonnageByOrderId: new Map(),
  loading: false,
  isError: false,
}

export interface TonColumnContext {
  t: TFunction
  sheetSpecQuantityLocked: boolean
  readOnly: boolean
  tonTotalText: string
  quantityLockClass?: string
  purchaseOrderOptions: PurchaseOrderTonnageRecord[]
  tonnageByOrderId: Map<string, PurchaseOrderTonnageRecord>
  purchaseOrderTonnageLoading: boolean
  localTonByOrder: Map<string, number>
  moveFocusTon: (rowId: string, delta: number) => void
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
  /** 打开采购订单选择弹窗(rowId 用于回填到对应行)。 */
  openPurchaseOrderPicker: (rowId: string) => void
}

/** 构建「报单吨位 + 已开吨位 + 明细」列, 供比价表格复用。 */
export function buildTonColumn(ctx: TonColumnContext): ColumnType<GridRow> {
  const { t } = ctx
  return {
    title: (
      <span className="price-compare-ton-header">
        <span>{t('priceCompare.sheet.columns.ton')}</span>
        <span className="price-compare-ton-total">
          {t('priceCompare.sheet.tonTotal')}: {ctx.tonTotalText}
        </span>
      </span>
    ),
    width: SHEET_COLUMN_WIDTH.ton,
    fixed: 'left',
    align: 'center',
    render: (_value, row) =>
      isSeparatorRow(row.row) ? null : (
        <TonCell
          disabled={ctx.readOnly || ctx.sheetSpecQuantityLocked}
          linked={
            row.row.purchaseOrderId
              ? ctx.tonnageByOrderId.get(row.row.purchaseOrderId)
              : undefined
          }
          localTonForOrder={
            row.row.purchaseOrderId
              ? (ctx.localTonByOrder.get(row.row.purchaseOrderId) ?? 0)
              : 0
          }
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
      ),
  }
}
