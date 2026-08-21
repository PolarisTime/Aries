/**
 * 业务模块分类守卫：将"是否某类模块"的判断集中到一处，
 * 避免在多处重复书写模块 key 比较（如采购类 = 采购订单 + 采购入库）。
 */
export function isPurchaseOrder(moduleKey: string | undefined): boolean {
  return moduleKey === 'purchase-order'
}

export function isPurchaseInbound(moduleKey: string | undefined): boolean {
  return moduleKey === 'purchase-inbound'
}

export function isPurchaseModule(moduleKey: string | undefined): boolean {
  return isPurchaseOrder(moduleKey) || isPurchaseInbound(moduleKey)
}

export function isSalesOutbound(moduleKey: string | undefined): boolean {
  return moduleKey === 'sales-outbound'
}

/** 贸易与资金类单据模块：编辑器使用财务化布局与汇总展示。 */
export function isFinanceOrTradeModule(moduleKey: string | undefined): boolean {
  return (
    isPurchaseOrder(moduleKey) ||
    isPurchaseInbound(moduleKey) ||
    moduleKey === 'sales-order' ||
    moduleKey === 'sales-outbound' ||
    moduleKey === 'receipt' ||
    moduleKey === 'payment' ||
    moduleKey === 'customer-statement' ||
    moduleKey === 'freight-statement'
  )
}
