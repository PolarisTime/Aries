import { useState } from 'react'
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

  return {
    open: (rowId: string) => setPickerRowId(rowId),
    node: (
      <PurchaseOrderPickerModal
        excludeSheetId={excludeSheetId}
        open={pickerRowId !== undefined}
        selectedItemId={pickerRow?.purchaseOrderItemId}
        onClose={() => setPickerRowId(undefined)}
        onSelect={(record: PurchaseOrderTonnageRecord | undefined) => {
          if (pickerRowId) {
            // 选中明细行时一并写入其所属订单 id 与订单号快照, 断开时一并清空。
            patchRow(pickerRowId, {
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
