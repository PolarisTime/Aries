import dayjs from 'dayjs'
import { registerModuleBehavior } from '@/views/modules/module-behavior-registry-core'

const currentDateTime = () => dayjs()

registerModuleBehavior('carrier', {
  defaultDraftValues: { priceMode: '按吨' },
})

registerModuleBehavior('sales-order', {
  editableLockedFields: ['deliveryDate', 'remark'],
  editableLockedItemColumns: ['unitPrice'],
  locksLineItemsWhenRecordLocked: true,
  lineItemLockSourceModule: 'sales-outbound',
  lineItemLockSourceField: 'salesOrderNo',
  lineItemLockTargetField: 'orderNo',
  lineItemLockStatuses: ['已审核'],
  lockedLineItemsNotice:
    '当前销售订单已存在已审核的销售出库，数量和商品信息已锁定，仅允许调整单价、金额、送货日期和备注。',
})

registerModuleBehavior('purchase-order', { defaultOperatorField: 'buyerName' })
registerModuleBehavior('purchase-order', {
  defaultDraftValues: { orderDate: currentDateTime() },
})
registerModuleBehavior('purchase-inbound', {
  defaultDraftValues: { inboundDate: currentDateTime() },
})
registerModuleBehavior('sales-order', { defaultOperatorField: 'salesName' })
registerModuleBehavior('sales-order', {
  defaultDraftValues: { deliveryDate: currentDateTime() },
})

const operatorNameModules = [
  'receipt',
  'payment',
  'invoice-receipt',
  'invoice-issue',
]

for (const key of operatorNameModules) {
  registerModuleBehavior(key, { defaultOperatorField: 'operatorName' })
}

registerModuleBehavior('purchase-order', {
  lineItemTrimStrategy: 'purchaseOrderBlank',
})

const positiveLineItemModules = ['invoice-receipt', 'invoice-issue']

for (const key of positiveLineItemModules) {
  registerModuleBehavior(key, {
    lineItemTrimStrategy: 'positiveWeightOrAmount',
  })
}

registerModuleBehavior('invoice-issue', { allowsManualLineItems: false })
registerModuleBehavior('freight-bill', {
  allowsManualLineItems: false,
  readonlyLineItems: true,
})

registerModuleBehavior('purchase-inbound', {
  supportsStatements: true,
  statementLinkType: 'supplier',
})
registerModuleBehavior('sales-order', {
  supportsStatements: true,
  statementLinkType: 'customer',
})
registerModuleBehavior('freight-bill', {
  supportsStatements: true,
  statementLinkType: 'freight',
})

registerModuleBehavior('invoice-receipt', { supportsInvoiceSync: true })
registerModuleBehavior('invoice-issue', { supportsInvoiceSync: true })
registerModuleBehavior('sales-order', { supportsFreightPickup: true })
registerModuleBehavior('material', { supportsMaterialImport: true })

registerModuleBehavior('department', { isSettingsModule: true })
registerModuleBehavior('general-setting', {
  isSettingsModule: true,
  hasUploadRuleExpandedRow: true,
})
registerModuleBehavior('permission', {
  alertActionLink: {
    text: '前往角色权限配置 →',
    to: '/access-control?tab=roles',
  },
})
