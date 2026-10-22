import { useMemo, useState } from 'react'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  linkedPurchaseOrderItemIds,
  sumTonByPurchaseOrderItem,
  unlinkPurchaseOrderPatch,
} from './core'
import type { PickerAllocationPick } from './PurchaseOrderPickerModal'
import { PurchaseOrderPickerModal } from './PurchaseOrderPickerModal'
import { defaultPickAllocations } from './purchase-order-picker-tonnage'
import type { PriceRow, PriceRowPurchaseOrderLink } from './types'

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
 *
 * <p>两条回写路径: 点行=选一张(旧路径, 单选覆盖), 勾选多行后「确认」=按勾选顺序挂多张并分配吨位。</p>
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
   * 口径与吨位列/服务端一致: 一行挂多张明细行时, 该行吨位对每张明细行都计入一次。
   */
  const linkedTonByItemId = useMemo(
    () => sumTonByPurchaseOrderItem(rows),
    [rows],
  )

  /*
   * 当前行已关联的明细行 id: 打开弹窗时回填勾选态。用 useMemo 稳住引用 —— 弹窗按引用
   * 承接这个 prop, 每次渲染新数组会让它误以为关联集合变了。
   */
  const selectedItemIds = useMemo(
    () => (pickerRow ? linkedPurchaseOrderItemIds(pickerRow) : []),
    [pickerRow],
  )

  /** 打开弹窗: 记录待回写行(同 id 重复打开时 setState 自身会跳过重渲染)。 */
  const open = (rowId: string) => setPickerRowId(rowId)

  /**
   * 把用户确认的分配结果转成关联行。
   *
   * <p>**分配量由弹层给出，这里不再按勾选顺序自动摊**：一张采购订单明细行的货会覆盖
   * 两个批次的报价单，每条单占多少只能由业务手动定；勾选顺序是 UI 副产物，不是业务依据。
   * 默认初值仍由 `defaultPickAllocations` 给（同一处口径），用户可逐行改写。</p>
   */
  const buildLinks = (
    picks: PickerAllocationPick[],
  ): PriceRowPurchaseOrderLink[] =>
    picks.map(({ record, allocatedTon }) => ({
      purchaseOrderId: record.purchaseOrderId,
      purchaseOrderNo: record.orderNo,
      purchaseOrderItemId: record.purchaseOrderItemId,
      allocatedTon: Math.max(
        0,
        Number.isFinite(allocatedTon) ? allocatedTon : 0,
      ),
    }))

  return {
    open,
    node: (
      <PurchaseOrderPickerModal
        excludeSheetId={excludeSheetId}
        linkedTonByItemId={linkedTonByItemId}
        reportedTon={pickerRow?.ton ?? 0}
        open={pickerRowId !== undefined}
        selectedItemId={pickerRow?.purchaseOrderItemId}
        selectedItemIds={selectedItemIds}
        matchVariety={
          pickerRow
            ? {
                material: pickerRow.material,
                spec: pickerRow.spec,
                length: pickerRow.length,
              }
            : undefined
        }
        onClose={() => setPickerRowId(undefined)}
        onSelect={(record: PurchaseOrderTonnageRecord | undefined) => {
          if (pickerRowId) {
            const target = rows.find((row) => row.id === pickerRowId)
            if (!record) {
              /*
               * 清除关联: 三列快照与多行关联集合必须一起清 —— 只清三列而省略集合时,
               * 保存载荷仍带旧关联列表, 服务端会把旧关联原样镜像回三列(见
               * unlinkPurchaseOrderPatch 的说明)。清除关联不改锁定状态。
               */
              patchRow(pickerRowId, unlinkPurchaseOrderPatch(target ?? {}))
            } else {
              /*
               * 单选明细行: links 与三列是同一份关联的两种表示, 必须一起改。
               * 只写三列会留下旧 links, 保存时服务端按旧 links 把三列镜像回去, 用户的
               * 单选被静默回滚。单选同样按分摊口径给出该条明细行的分配吨位。
               *
               * 同时补齐行级锁: 服务端门禁是「仅锁定行可关联采购订单, 未锁定的行保存时会被
               * 强制清空关联与快照」(QuoteSheetStore#applyItem), 而单据级「锁定规格和数量」
               * 只冻结规格/吨位、不会给行打 locked 标记。若只写关联不写 locked, 用户点完
               * 保存后关联会被服务端静默清掉。
               */
              const [defaultTon] = defaultPickAllocations(
                [record],
                target?.ton ?? 0,
              ).values()
              const links = buildLinks([
                { record, allocatedTon: defaultTon ?? 0 },
              ])
              const [first] = links
              patchRow(pickerRowId, {
                ...(first && !target?.locked ? { locked: true } : {}),
                purchaseOrderLinks: links,
                purchaseOrderId: first?.purchaseOrderId,
                purchaseOrderNo: first?.purchaseOrderNo,
                purchaseOrderItemId: first?.purchaseOrderItemId,
              })
            }
          }
          setPickerRowId(undefined)
        }}
        onConfirmLinks={(picks) => {
          if (pickerRowId && picks.length > 0) {
            const target = rows.find((row) => row.id === pickerRowId)
            const links = buildLinks(picks)
            const [first] = links
            /*
             * 多行关联整组写回, 旧三列镜像第一条(与服务端 QuoteSheetStore 的镜像口径一致),
             * 并沿用"关联必须锁定"的门禁: 未锁定的行保存时关联会被服务端清空。
             */
            patchRow(pickerRowId, {
              ...(first && !target?.locked ? { locked: true } : {}),
              purchaseOrderLinks: links,
              purchaseOrderId: first?.purchaseOrderId,
              purchaseOrderNo: first?.purchaseOrderNo,
              purchaseOrderItemId: first?.purchaseOrderItemId,
            })
          }
          setPickerRowId(undefined)
        }}
      />
    ),
  }
}
