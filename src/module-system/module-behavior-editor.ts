import dayjs from 'dayjs'
import { getSettlementCompanyOptions } from '@/api/company-settings'
import { registerModuleBehavior } from '@/module-system/module-behavior-registry-core'
import { parseDateTimeValue } from '@/utils/formatters'
import { asString } from '@/utils/type-narrowing'

const currentDateTime = () => dayjs()
const currentDate = () => dayjs().startOf('day')
const addOneYear = (value: dayjs.Dayjs) => value.add(1, 'year')

function findSettlementCompanyName(id: unknown, fallback = '') {
  const normalizedId = asString(id).trim()
  if (!normalizedId) {
    return ''
  }
  return (
    getSettlementCompanyOptions().find(
      (option) => asString(option.value).trim() === normalizedId,
    )?.companyName || fallback
  )
}

registerModuleBehavior('carrier', {
  defaultDraftValues: { priceMode: '按吨' },
  syncEditorForm(editorForm, ctx) {
    if (ctx.changedKeys.has('defaultSettlementCompanyId')) {
      editorForm.defaultSettlementCompanyName = findSettlementCompanyName(
        editorForm.defaultSettlementCompanyId,
      )
    }
  },
})

registerModuleBehavior('customer', {
  syncEditorForm(editorForm, ctx) {
    if (ctx.changedKeys.has('defaultSettlementCompanyId')) {
      editorForm.defaultSettlementCompanyName = findSettlementCompanyName(
        editorForm.defaultSettlementCompanyId,
      )
    }
  },
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
    '当前销售订单已审核，订单编号、客户、项目和明细非价格字段已锁定，仅允许调整送货日期、备注和单价。',
  protectedEditStatuses: ['完成销售'],
})

registerModuleBehavior('purchase-order', { defaultOperatorField: 'buyerName' })
registerModuleBehavior('purchase-order', {
  defaultDraftValues: () => ({ orderDate: currentDateTime() }),
  syncEditorForm(editorForm, ctx) {
    if (ctx.changedKeys.has('settlementCompanyId')) {
      editorForm.settlementCompanyName = findSettlementCompanyName(
        editorForm.settlementCompanyId,
      )
    }
  },
})
const settlementCompanySnapshotModules = [
  'purchase-inbound',
  'sales-order',
  'sales-outbound',
  'freight-bill',
  'supplier-statement',
  'customer-statement',
  'freight-statement',
  'receipt',
  'invoice-issue',
]

for (const key of settlementCompanySnapshotModules) {
  registerModuleBehavior(key, {
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('settlementCompanyId')) {
        editorForm.settlementCompanyName = findSettlementCompanyName(
          editorForm.settlementCompanyId,
          asString(editorForm.settlementCompanyName),
        )
      }
    },
  })
}

registerModuleBehavior('purchase-inbound', {
  defaultOperatorField: 'buyerName',
  defaultDraftValues: () => ({ inboundDate: currentDateTime() }),
  resolveReadonlyEditorFields(record) {
    return asString(record.purchaseOrderNo).trim()
      ? ['supplierName', 'settlementCompanyId']
      : []
  },
  readonlyItemColumns: [
    'warehouseName',
    'quantity',
    'weightTon',
    'unitPrice',
    'settlementMode',
    'amount',
  ],
})
registerModuleBehavior('sales-order', { defaultOperatorField: 'salesName' })
registerModuleBehavior('sales-order', {
  defaultDraftValues: () => ({ deliveryDate: currentDateTime() }),
})
registerModuleBehavior('sales-outbound', {
  defaultDraftValues: () => ({ outboundDate: currentDateTime() }),
})
registerModuleBehavior('purchase-contract', {
  defaultOperatorField: 'buyerName',
  readonlyLineItems: true,
})
registerModuleBehavior('purchase-contract', {
  resolveReadonlyEditorFields(record) {
    return asString(record.sourcePurchaseOrderNos).trim()
      ? ['supplierName']
      : []
  },
  defaultDraftValues: () => {
    const signDate = currentDateTime()
    return {
      signDate,
      effectiveDate: signDate,
      expireDate: addOneYear(signDate),
    }
  },
  syncEditorForm(editorForm, ctx) {
    const signDateValue = editorForm.signDate
    const signDate = dayjs.isDayjs(signDateValue)
      ? signDateValue
      : parseDateTimeValue(signDateValue)
    if (!signDate?.isValid()) {
      return
    }

    const shouldFollowSignDate =
      ctx.changedKeys.has('signDate') ||
      (!editorForm.effectiveDate && !editorForm.expireDate)

    const effectiveDateValue = editorForm.effectiveDate
    const effectiveDate = dayjs.isDayjs(effectiveDateValue)
      ? effectiveDateValue
      : parseDateTimeValue(effectiveDateValue)
    if (
      shouldFollowSignDate ||
      !effectiveDateValue ||
      !effectiveDate?.isValid()
    ) {
      editorForm.effectiveDate = signDate
    }

    const expireDateValue = editorForm.expireDate
    const expireDate = dayjs.isDayjs(expireDateValue)
      ? expireDateValue
      : parseDateTimeValue(expireDateValue)
    if (shouldFollowSignDate || !expireDateValue || !expireDate?.isValid()) {
      editorForm.expireDate = addOneYear(signDate)
    }
  },
})

const operatorNameModules = [
  'receipt',
  'payment',
  'invoice-receipt',
  'invoice-issue',
  'ledger-adjustment',
]

for (const key of operatorNameModules) {
  registerModuleBehavior(key, { defaultOperatorField: 'operatorName' })
}

registerModuleBehavior('ledger-adjustment', {
  defaultDraftValues: () => ({ adjustmentDate: currentDate() }),
  syncEditorForm(editorForm, ctx) {
    if (ctx.changedKeys.has('counterpartyType')) {
      editorForm.counterpartyName = ''
      editorForm.counterpartyCode = ''
      return
    }

    if (ctx.changedKeys.has('counterpartyName')) {
      editorForm.counterpartyCode = ''
    }
  },
})

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
registerModuleBehavior('freight-statement', {
  allowsManualLineItems: false,
  readonlyLineItems: true,
})
registerModuleBehavior('supplier-statement', {
  allowsManualLineItems: false,
  readonlyLineItems: true,
})
registerModuleBehavior('customer-statement', {
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
