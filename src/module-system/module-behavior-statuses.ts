import { registerModuleBehavior } from '@/module-system/module-behavior-registry-core'

const lineItemModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'freight-statement',
  'purchase-contract',
  'sales-contract',
]

for (const key of lineItemModules) {
  registerModuleBehavior(key, { supportsLineItems: true })
}

const amountModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'purchase-contract',
  'sales-contract',
]

for (const key of amountModules) {
  registerModuleBehavior(key, { computesAmounts: true })
}

const draftStatusModules: Record<string, string> = {
  'purchase-order': '草稿',
  'purchase-inbound': '草稿',
  'sales-order': '草稿',
  'sales-outbound': '草稿',
  'freight-bill': '未审核',
  'freight-statement': '待审核',
  'supplier-statement': '待确认',
  'customer-statement': '待确认',
  receipt: '草稿',
  payment: '草稿',
  'ledger-adjustment': '草稿',
}

for (const [key, status] of Object.entries(draftStatusModules)) {
  registerModuleBehavior(key, { defaultStatus: status })
}

const approvedStatusModules = [
  'purchase-order',
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'freight-statement',
]

for (const key of approvedStatusModules) {
  registerModuleBehavior(key, { auditStatus: '已审核' })
}

registerModuleBehavior('sales-order', {
  auditSourceStatuses: ['草稿'],
})

registerModuleBehavior('purchase-inbound', {
  reverseAuditTargetsByStatus: { 完成入库: '草稿' },
})

registerModuleBehavior('receipt', { auditStatus: '已审核' })
registerModuleBehavior('payment', { auditStatus: '已审核' })
registerModuleBehavior('ledger-adjustment', { auditStatus: '已审核' })
registerModuleBehavior('supplier-statement', { auditStatus: '已确认' })
registerModuleBehavior('customer-statement', { auditStatus: '已确认' })

export const protectedEditStatuses = new Set([
  '已审核',
  '已完成',
  '完成采购',
  '完成入库',
  '交付核定',
  '完成销售',
  '已确认',
  '已付款',
  '已收款',
  '已签署',
  '已归档',
])

export const protectedDeleteStatuses = new Set([
  '已审核',
  '已完成',
  '完成采购',
  '完成入库',
  '交付核定',
  '完成销售',
  '已确认',
  '已付款',
  '已收款',
  '已签署',
  '已归档',
])
