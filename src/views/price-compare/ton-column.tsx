import type { ColumnType } from 'antd/es/table'
import type { TFunction } from 'i18next'
import { message } from '@/utils/antd-app'
import {
  isSeparatorRow,
  LOCK_REASON_KEYS,
  resolveLock,
  type SHEET_COLUMN_WIDTH,
} from './core'
import { TonCell } from './TonCell'
import type { GridRow, PriceRow } from './types'

/** 单据表格列宽表(键与 `core.SHEET_COLUMN_WIDTH` 一致)。 */
export type SheetColumnWidths = Record<keyof typeof SHEET_COLUMN_WIDTH, number>

export interface TonColumnContext {
  t: TFunction
  sheetSpecQuantityLocked: boolean
  readOnly: boolean
  /** 当前字号下的列宽表(见 core.sheetColumnWidths), 所有列宽只能从这里取。 */
  widths: SheetColumnWidths
  quantityLockClass?: string
  /** 在吨位列内移动焦点; 返回 false 表示已到列首/列尾(调用方应放行默认 Tab)。 */
  moveFocusTon: (rowId: string, delta: number) => boolean
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
}

/** 吨位列的锁定视图: 原因文案由最高命中层级决定。 */
function lockReasonOf(ctx: TonColumnContext, row: GridRow): string | undefined {
  /*
   * 锁定层级 单据 > 行: 规格与吨位同属「规格和数量」, 两级锁都冻结吨位输入。
   * 原因文案由最高命中层级决定(而不是"谁先命中用谁"), 否则单据锁 + 行锁叠加时
   * 会显示行级原因, 与工具栏正在生效的全局锁口径不一致。
   */
  const lock = resolveLock({
    sheet: ctx.sheetSpecQuantityLocked,
    row: Boolean(row.row.locked),
  })
  if (ctx.readOnly) return ctx.t('priceCompare.sheet.readOnlyHint')
  if (lock.level) return ctx.t(LOCK_REASON_KEYS[lock.level])
  return undefined
}

/**
 * 「报单吨位」列: 手填输入框(比价页唯一的吨位字段)。
 *
 * <p>必填列, 不参与显隐; 采购订单相关的「已开 / 未开」派生列已随采购解耦移除。</p>
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
      return (
        <TonCell
          disabled={ctx.readOnly || ctx.sheetSpecQuantityLocked}
          rowLockDisabled={Boolean(row.row.locked)}
          lockReason={lockReasonOf(ctx, row)}
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
