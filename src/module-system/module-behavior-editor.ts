import dayjs from 'dayjs'
import { findCarrierOption } from '@/api/carrier-options'
import { getSettlementCompanyOptions } from '@/api/company-settings'
import { findCustomerOption } from '@/api/customer-options'
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

function applyDefaultSettlementCompany(
  editorForm: Record<string, unknown>,
  option:
    | {
        defaultSettlementCompanyId?: string | number
        defaultSettlementCompanyName?: string
      }
    | undefined,
) {
  editorForm.settlementCompanyId =
    option?.defaultSettlementCompanyId == null
      ? ''
      : asString(option.defaultSettlementCompanyId)
  editorForm.settlementCompanyName = asString(
    option?.defaultSettlementCompanyName,
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
  lineItemLockStatuses: ['已审核', '交付核定'],
  lockedLineItemsNotice:
    '关联销售出库已审核，当前仅允许调整送货日期、备注和单价。',
  partiallyEditableStatuses: ['交付核定'],
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
      if (
        key === 'sales-order' &&
        (ctx.changedKeys.has('customerName') ||
          ctx.changedKeys.has('projectName'))
      ) {
        applyDefaultSettlementCompany(
          editorForm,
          findCustomerOption(editorForm.customerName, editorForm.projectName),
        )
        return
      }

      if (key === 'freight-bill' && ctx.changedKeys.has('carrierName')) {
        applyDefaultSettlementCompany(
          editorForm,
          findCarrierOption(editorForm.carrierName),
        )
        return
      }

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
  parentImportedEditableFields: ['outboundDate', 'remark'],
  parentImportedItemEditableColumns: ['quantity'],
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
