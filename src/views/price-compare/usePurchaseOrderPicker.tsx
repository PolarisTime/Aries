import { useMemo, useState } from 'react'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'
import type { PriceRow } from './types'

interface Options {
  rows: PriceRow[]
  /** 当前报价单 id(用于排除自身已保存吨位), 未持久化时为 undefined。 */
  excludeSheetId?: string
  patchRow: (rowId: string, patch: Partial<PriceRow>) => void
}

export interface PurchaseOrderPickerController {
  /** 打开选择弹窗并记录待回写行。 */
  open: (rowId: string) => void
  /** 待渲染的选择弹窗(由调用方放入 JSX 树)。 */
  node: React.ReactNode
}

/**
 * 采购订单明细行选择弹窗控制器: 收敛弹窗状态与回写逻辑, 避免 SheetPanel 主组件膨胀。
 * <p>选项数据由弹窗自行按关键字从后端查询(服务端过滤), 控制器只负责"选哪一行 + 回填"。</p>
 */
export function usePurchaseOrderPicker({
  rows,
  excludeSheetId,
  patchRow,
}: Options): PurchaseOrderPickerController {
  const [pickerRowId, setPickerRowId] = useState<string | undefined>(undefined)
  const pickerRow = pickerRowId
    ? rows.find((row) => row.id === pickerRowId)
    : undefined

  /*
   * 本单据内各采购订单明细行已用掉的报单吨位合计。
   * 服务端 remainingWeight 已排除本单据自身已保存吨位, 因此"本单据还能不能再用这一行"
   * 必须再减去这里的手填吨位(含未保存草稿), 否则弹窗会把已被本单吃满的行当成可选项。
   */
  const linkedTonByItemId = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of rows) {
      if (row.rowType === 'SEPARATOR') continue
      const itemId = row.purchaseOrderItemId
      const ton = row.ton
      if (!itemId || ton === undefined || !Number.isFinite(ton) || ton <= 0) {
        continue
      }
      map.set(itemId, (map.get(itemId) ?? 0) + ton)
    }
    return map
  }, [rows])

  return {
    open: (rowId: string) => setPickerRowId(rowId),
    node: (
      <PurchaseOrderPickerModal
        excludeSheetId={excludeSheetId}
        linkedTonByItemId={linkedTonByItemId}
        open={pickerRowId !== undefined}
        selectedItemId={pickerRow?.purchaseOrderItemId}
        onClose={() => setPickerRowId(undefined)}
        onSelect={(record: PurchaseOrderTonnageRecord | undefined) => {
          if (pickerRowId) {
            const target = rows.find((row) => row.id === pickerRowId)
            /*
             * 选中明细行时一并写入其所属订单 id 与订单号快照, 断开时一并清空。
             *
             * 同时补齐行级锁: 服务端门禁是「仅锁定行可关联采购订单, 未锁定的行保存时会被
             * 强制清空关联与快照」(QuoteSheetStore#applyItem), 而单据级「锁定规格和数量」
             * 只冻结规格/吨位、不会给行打 locked 标记。若只写关联不写 locked, 用户点完
             * 保存后关联会被服务端静默清掉。清除关联(record === undefined)不改锁定状态。
             */
            patchRow(pickerRowId, {
              ...(record && !target?.locked ? { locked: true } : {}),
              purchaseOrderId: record?.purchaseOrderId,
              purchaseOrderNo: record?.orderNo,
              purchaseOrderItemId: record?.purchaseOrderItemId,
            })
          }
          setPickerRowId(undefined)
        }}
      />
    ),
  }
}
