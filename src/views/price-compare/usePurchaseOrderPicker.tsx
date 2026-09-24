import { useState } from 'react'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'
import type { PriceRow } from './types'

interface Options {
  rows: PriceRow[]
  tonnage: { options: PurchaseOrderTonnageRecord[]; loading: boolean }
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
 * <p>只负责"选哪一行 + 选中回填 patchRow"; 选项数据来自吨位订阅。</p>
 */
export function usePurchaseOrderPicker({
  rows,
  tonnage,
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
        loading={tonnage.loading}
        open={pickerRowId !== undefined}
        options={tonnage.options}
        selectedItemId={pickerRow?.purchaseOrderItemId}
        onClose={() => setPickerRowId(undefined)}
        onSelect={(purchaseOrderItemId) => {
          if (pickerRowId) {
            const selected = purchaseOrderItemId
              ? tonnage.options.find(
                  (option) =>
                    option.purchaseOrderItemId === purchaseOrderItemId,
                )
              : undefined
            // 选中明细行时一并写入其所属订单 id 与订单号快照, 断开时一并清空。
            patchRow(pickerRowId, {
              purchaseOrderId: selected?.purchaseOrderId,
              purchaseOrderNo: selected?.orderNo,
              purchaseOrderItemId,
            })
          }
          setPickerRowId(undefined)
        }}
      />
    ),
  }
}
