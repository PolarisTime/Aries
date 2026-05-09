import type { ModuleRecord } from '@/types/module-page'

export function getSupplierStatementSelectionError(
  sourceInbounds: ModuleRecord[],
) {
  if (!sourceInbounds.length) {
    return '请先选择采购入库单'
  }

  const supplierNames = Array.from(
    new Set(sourceInbounds.map((record) => String(record.supplierName || ''))),
  )
  if (supplierNames.length !== 1) {
    return '仅支持同一供应商的采购入库单合并生成'
  }

  return null
}

export function getCustomerStatementSelectionError(
  sourceOrders: ModuleRecord[],
) {
  if (!sourceOrders.length) {
    return '请先选择销售订单'
  }

  const customerNames = Array.from(
    new Set(sourceOrders.map((record) => String(record.customerName || ''))),
  )
  const projectNames = Array.from(
    new Set(sourceOrders.map((record) => String(record.projectName || ''))),
  )
  if (customerNames.length !== 1 || projectNames.length !== 1) {
    return '仅支持同一客户同一项目的销售订单合并生成'
  }

  return null
}

export function getFreightStatementSelectionError(sourceBills: ModuleRecord[]) {
  if (!sourceBills.length) {
    return '请先选择物流单'
  }

  const carrierNames = Array.from(
    new Set(sourceBills.map((record) => String(record.carrierName || ''))),
  )
  if (carrierNames.length !== 1) {
    return '仅支持同一物流商的物流单合并生成'
  }

  return null
}
