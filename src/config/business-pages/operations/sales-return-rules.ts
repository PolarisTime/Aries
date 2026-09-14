import type {
  SalesReturnCandidateItem,
  SalesReturnCandidates,
  SalesReturnSaveItem,
  SalesReturnSaveRequest,
} from '@/shared/schemas/module-record'
import type { ModuleRecord } from '@/types/module-page'
import { buildAmountWeightOverview } from '../shared/shared'

export function buildSalesReturnOverview(rows: ModuleRecord[]) {
  return buildAmountWeightOverview(rows, 'totalAmount')
}

export interface SalesReturnSourceSelection {
  item: SalesReturnCandidateItem
  quantity: number
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function resolveSelectedQuantity(
  selection: SalesReturnSourceSelection,
): number {
  const returnable = Math.max(0, selection.item.returnableQuantity)
  const requested = Number.isFinite(selection.quantity)
    ? Math.floor(selection.quantity)
    : 0
  return Math.max(0, Math.min(requested, returnable))
}

function toSaveItem(
  selection: SalesReturnSourceSelection,
): SalesReturnSaveItem {
  const { item } = selection
  const quantity = resolveSelectedQuantity(selection)
  const pieceWeightTon = item.pieceWeightTon
  const weightTon =
    pieceWeightTon > 0 ? roundTo(quantity * pieceWeightTon, 3) : undefined
  const amount =
    weightTon !== undefined && item.unitPrice > 0
      ? roundTo(weightTon * item.unitPrice, 2)
      : undefined

  return {
    sourceSalesOutboundItemId: item.sourceSalesOutboundItemId,
    sourceSalesOrderItemId: item.sourceSalesOrderItemId ?? undefined,
    materialId: item.materialId ?? undefined,
    materialCode: item.materialCode,
    brand: item.brand,
    category: item.category,
    material: item.material,
    spec: item.spec,
    length: item.length ?? undefined,
    unit: item.unit,
    warehouseId: item.warehouseId ?? undefined,
    warehouseName: item.warehouseName ?? undefined,
    batchNo: item.batchNo ?? undefined,
    quantity,
    quantityUnit: item.quantityUnit ?? undefined,
    pieceWeightTon,
    piecesPerBundle: item.piecesPerBundle,
    weightTon,
    unitPrice: item.unitPrice,
    amount,
  }
}

/**
 * 把销售出库候选行映射为退货保存请求：仅保留数量大于 0 且不超过可退数量的行，
 * 并携带来源出库明细 ID 与物料只读快照。
 */
export function buildSalesReturnSaveRequestFromCandidates(
  candidates: SalesReturnCandidates,
  options: { returnDate: string; selections: SalesReturnSourceSelection[] },
): SalesReturnSaveRequest {
  const items = options.selections
    .map(toSaveItem)
    .filter((item) => item.quantity > 0)

  return {
    salesOrderNo: candidates.salesOrderNo ?? undefined,
    customerId: candidates.customerId ?? undefined,
    customerName: candidates.customerName ?? undefined,
    projectId: candidates.projectId ?? undefined,
    projectName: candidates.projectName ?? undefined,
    warehouseId: candidates.warehouseId ?? undefined,
    warehouseName: candidates.warehouseName ?? undefined,
    settlementCompanyId: candidates.settlementCompanyId ?? undefined,
    settlementCompanyName: candidates.settlementCompanyName ?? undefined,
    returnDate: options.returnDate,
    status: '草稿',
    items,
  }
}
