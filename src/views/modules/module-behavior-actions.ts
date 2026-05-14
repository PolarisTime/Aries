import { registerModuleBehavior } from '@/views/modules/module-behavior-registry-core'

registerModuleBehavior('supplier-statement', {
  actionKindsByKey: { generate_statement: 'openSupplierStatementGenerator' },
  actionKindsByLabel: { 生成对账单: 'openSupplierStatementGenerator' },
})

registerModuleBehavior('customer-statement', {
  actionKindsByKey: { generate_statement: 'openCustomerStatementGenerator' },
  actionKindsByLabel: { 生成对账单: 'openCustomerStatementGenerator' },
})

registerModuleBehavior('freight-statement', {
  actionKindsByKey: {
    generate_freight_statement: 'openFreightStatementGenerator',
    view_freight_summary: 'openFreightSummary',
  },
  actionKindsByLabel: {
    生成物流对账单: 'openFreightStatementGenerator',
    查看运费对账汇总: 'openFreightSummary',
  },
})

registerModuleBehavior('freight-bill', {
  actionKindsByKey: {
    create_freight_bill: 'openCreateEditor',
    generate_pickup_list: 'openFreightPickupList',
    mark_delivered: 'markSelectedFreightDelivered',
  },
  actionKindsByLabel: {
    生成提货清单: 'openFreightPickupList',
    标记送达: 'markSelectedFreightDelivered',
  },
})

registerModuleBehavior('freight-bill', {
  permissionCodesByActionKey: {
    create_freight_bill: ['create'],
    generate_pickup_list: ['export'],
    mark_delivered: ['audit'],
  },
})

registerModuleBehavior('freight-statement', {
  permissionCodesByActionKey: {
    generate_freight_statement: ['create'],
    view_freight_summary: ['read'],
  },
})
