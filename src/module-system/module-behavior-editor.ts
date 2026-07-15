import dayjs from 'dayjs'
import { findCarrierOption } from '@/api/carrier-options'
import { getSettlementCompanyOptions } from '@/api/company-settings'
import { findCustomerOption } from '@/api/customer-options'
import { findProjectOption } from '@/api/project-options'
import { findSupplierOption } from '@/api/supplier-options'
import { registerModuleBehavior } from '@/module-system/module-behavior-registry-core'
import { asString } from '@/utils/type-narrowing'

const currentDateTime = () => dayjs()
const currentDate = () => dayjs().startOf('day')

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

function optionDisplayName(
  option: { id?: unknown; value?: unknown } | undefined,
  explicitName: unknown,
) {
  const name = asString(explicitName).trim()
  if (name) {
    return name
  }
  const value = asString(option?.value).trim()
  return value && value !== asString(option?.id).trim() ? value : ''
}

function resolveCounterpartyIdentity(type: unknown, id: unknown) {
  const counterpartyType = asString(type).trim()
  if (counterpartyType === '客户') {
    const customer = findCustomerOption(id)
    return customer
      ? {
          id: customer.id,
          code: customer.customerCode,
          name: customer.customerName,
        }
      : undefined
  }
  if (counterpartyType === '供应商') {
    const supplier = findSupplierOption(id)
    return supplier
      ? {
          id: supplier.id,
          code: supplier.supplierCode,
          name: optionDisplayName(supplier, supplier.supplierName),
        }
      : undefined
  }
  if (counterpartyType === '物流商') {
    const carrier = findCarrierOption(id)
    return carrier
      ? {
          id: carrier.id,
          code: carrier.carrierCode,
          name: optionDisplayName(carrier, carrier.carrierName),
        }
      : undefined
  }
  return undefined
}

function clearStatementSources(editorForm: Record<string, unknown>) {
  editorForm.sourceFreightStatementId = ''
}

function clearCounterpartyIdentity(editorForm: Record<string, unknown>) {
  editorForm.counterpartyId = ''
  editorForm.counterpartyCode = ''
  editorForm.counterpartyName = ''
}

function snapshotCounterpartyIdentity(editorForm: Record<string, unknown>) {
  const identity = resolveCounterpartyIdentity(
    editorForm.counterpartyType,
    editorForm.counterpartyId,
  )
  editorForm.counterpartyId = asString(identity?.id)
  editorForm.counterpartyCode = asString(identity?.code).trim()
  editorForm.counterpartyName = asString(identity?.name).trim()
}

function snapshotSupplierIdentity(editorForm: Record<string, unknown>) {
  const supplier = findSupplierOption(editorForm.supplierId)
  editorForm.supplierId = asString(supplier?.id)
  editorForm.supplierCode = asString(supplier?.supplierCode).trim()
  editorForm.supplierName = asString(supplier?.supplierName).trim()
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
    if (ctx.changedKeys.has('supplierId')) {
      snapshotSupplierIdentity(editorForm)
    }
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
  'customer-statement',
  'freight-statement',
]
const customerProjectSnapshotModules = new Set(['sales-order'])

for (const key of settlementCompanySnapshotModules) {
  registerModuleBehavior(key, {
    syncEditorForm(editorForm, ctx) {
      if (key === 'purchase-inbound' && ctx.changedKeys.has('supplierId')) {
        snapshotSupplierIdentity(editorForm)
      }

      if (
        customerProjectSnapshotModules.has(key) &&
        ctx.changedKeys.has('customerId')
      ) {
        const customer = findCustomerOption(editorForm.customerId)
        editorForm.customerId = asString(customer?.id)
        editorForm.customerCode = asString(customer?.customerCode).trim()
        editorForm.customerName = asString(customer?.customerName).trim()
        if (!ctx.changedKeys.has('projectId')) {
          editorForm.projectId = ''
          editorForm.projectName = ''
        }
        applyDefaultSettlementCompany(editorForm, customer)
      }

      if (
        customerProjectSnapshotModules.has(key) &&
        ctx.changedKeys.has('projectId')
      ) {
        const project = findProjectOption(
          editorForm.projectId,
          editorForm.customerId,
        )
        editorForm.projectId = asString(project?.id)
        editorForm.projectName = asString(project?.projectName).trim()
      }

      if (
        customerProjectSnapshotModules.has(key) &&
        (ctx.changedKeys.has('customerId') || ctx.changedKeys.has('projectId'))
      ) {
        return
      }

      if (
        (key === 'freight-bill' || key === 'freight-statement') &&
        ctx.changedKeys.has('carrierName')
      ) {
        const carrier = findCarrierOption(editorForm.carrierName)
        const carrierName = asString(carrier?.carrierName).trim()
        if (carrierName) {
          editorForm.carrierName = carrierName
        }
        editorForm.carrierCode = asString(carrier?.carrierCode).trim()
        if (key === 'freight-bill') {
          applyDefaultSettlementCompany(editorForm, carrier)
          return
        }
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
  defaultDraftValues: () => ({ inboundDate: currentDateTime() }),
  allowsManualLineItems: false,
  resolveReadonlyEditorFields(record) {
    return asString(record.purchaseOrderNo).trim()
      ? ['supplierId', 'settlementCompanyId']
      : []
  },
  readonlyItemColumns: [
    'warehouseName',
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
  parentImportedItemEditableColumns: ['actualWeightTon', 'weighWeightTon'],
})
const operatorNameModules = ['receipt', 'payment', 'ledger-adjustment']

for (const key of operatorNameModules) {
  registerModuleBehavior(key, { defaultOperatorField: 'operatorName' })
}

const SUPPLIER_RECEIPT_PURPOSES = new Set([
  'SUPPLIER_PREPAYMENT_REFUND',
  'SUPPLIER_OTHER_RECEIPT',
])

function isSupplierReceiptPurpose(value: unknown) {
  return SUPPLIER_RECEIPT_PURPOSES.has(asString(value).trim())
}

registerModuleBehavior('receipt', {
  defaultDraftValues: () => ({
    receiptDate: currentDate(),
    receiptPurpose: 'CUSTOMER_STATEMENT_SETTLEMENT',
    counterpartyType: '客户',
  }),
  clearLineItemsOnFieldChange: ['receiptPurpose'],
  syncEditorForm(editorForm, ctx) {
    const supplierReceipt = isSupplierReceiptPurpose(editorForm.receiptPurpose)

    if (ctx.changedKeys.has('receiptPurpose')) {
      editorForm.counterpartyType = supplierReceipt ? '供应商' : '客户'
      editorForm.sourceCustomerStatementId = ''
      editorForm.items = []
      clearCounterpartyIdentity(editorForm)
      editorForm.customerId = ''
      editorForm.customerCode = ''
      editorForm.customerName = ''
      editorForm.projectId = ''
      editorForm.projectName = ''
      editorForm.settlementCompanyId = ''
      editorForm.settlementCompanyName = ''
      return
    }

    if (supplierReceipt && ctx.changedKeys.has('counterpartyId')) {
      snapshotCounterpartyIdentity(editorForm)
      return
    }

    if (!supplierReceipt && ctx.changedKeys.has('customerId')) {
      const customer = findCustomerOption(editorForm.customerId)
      editorForm.customerId = asString(customer?.id)
      editorForm.customerCode = asString(customer?.customerCode).trim()
      editorForm.customerName = asString(customer?.customerName).trim()
      editorForm.counterpartyId = editorForm.customerId
      editorForm.counterpartyCode = editorForm.customerCode
      editorForm.counterpartyName = editorForm.customerName
      editorForm.projectId = ''
      editorForm.projectName = ''
      editorForm.sourceCustomerStatementId = ''
      applyDefaultSettlementCompany(editorForm, customer)
      return
    }

    if (!supplierReceipt && ctx.changedKeys.has('projectId')) {
      const project = findProjectOption(
        editorForm.projectId,
        editorForm.customerId,
      )
      editorForm.projectId = asString(project?.id)
      editorForm.projectName = asString(project?.projectName).trim()
      editorForm.sourceCustomerStatementId = ''
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

registerModuleBehavior('payment', {
  clearLineItemsOnFieldChange: ['paymentPurpose'],
  syncEditorForm(editorForm, ctx) {
    if (ctx.changedKeys.has('paymentPurpose')) {
      const purpose = asString(editorForm.paymentPurpose).trim()
      clearStatementSources(editorForm)
      editorForm.sourcePurchaseOrderId = ''
      editorForm.purchaseOrderNo = ''
      editorForm.supplierCode = ''
      editorForm.supplierName = ''
      editorForm.items = []
      clearCounterpartyIdentity(editorForm)
      editorForm.settlementCompanyId = ''
      editorForm.settlementCompanyName = ''
      if (purpose === 'PURCHASE_PREPAYMENT' || purpose === 'SUPPLIER_PAYMENT') {
        editorForm.counterpartyType = '供应商'
      } else {
        editorForm.counterpartyType = '物流商'
      }
      return
    }

    if (ctx.changedKeys.has('counterpartyType')) {
      clearStatementSources(editorForm)
      if (!ctx.changedKeys.has('counterpartyId')) {
        clearCounterpartyIdentity(editorForm)
        return
      }
    }

    if (ctx.changedKeys.has('counterpartyId')) {
      snapshotCounterpartyIdentity(editorForm)
      clearStatementSources(editorForm)
      return
    }

    if (ctx.changedKeys.has('settlementCompanyId')) {
      editorForm.settlementCompanyName = findSettlementCompanyName(
        editorForm.settlementCompanyId,
        asString(editorForm.settlementCompanyName),
      )
      return
    }
  },
})

registerModuleBehavior('ledger-adjustment', {
  defaultDraftValues: () => ({ adjustmentDate: currentDate() }),
  syncEditorForm(editorForm, ctx) {
    if (ctx.changedKeys.has('settlementCompanyId')) {
      editorForm.settlementCompanyName = findSettlementCompanyName(
        editorForm.settlementCompanyId,
        asString(editorForm.settlementCompanyName),
      )
    }

    if (ctx.changedKeys.has('counterpartyType')) {
      if (!ctx.changedKeys.has('counterpartyId')) {
        clearCounterpartyIdentity(editorForm)
        editorForm.customerId = ''
        editorForm.projectId = ''
        editorForm.projectName = ''
        return
      }
    }

    if (ctx.changedKeys.has('counterpartyId')) {
      snapshotCounterpartyIdentity(editorForm)
      editorForm.customerId =
        editorForm.counterpartyType === '客户' ? editorForm.counterpartyId : ''
      if (editorForm.counterpartyType !== '客户') {
        editorForm.projectId = ''
        editorForm.projectName = ''
      }
      return
    }

    if (ctx.changedKeys.has('projectId')) {
      const project =
        editorForm.counterpartyType === '客户'
          ? findProjectOption(editorForm.projectId, editorForm.counterpartyId)
          : undefined
      editorForm.projectId = asString(project?.id)
      editorForm.projectName = asString(project?.projectName).trim()
      return
    }

    if (ctx.changedKeys.has('counterpartyName')) {
      editorForm.counterpartyId = ''
      editorForm.counterpartyCode = ''
    }
  },
})

registerModuleBehavior('purchase-order', {
  lineItemTrimStrategy: 'purchaseOrderBlank',
})

registerModuleBehavior('freight-bill', {
  allowsManualLineItems: false,
  readonlyLineItems: true,
})
registerModuleBehavior('freight-statement', {
  allowsManualLineItems: false,
  readonlyLineItems: true,
})
registerModuleBehavior('customer-statement', {
  allowsManualLineItems: false,
  readonlyLineItems: true,
})

registerModuleBehavior('purchase-inbound', {
  supportsStatements: false,
})
registerModuleBehavior('sales-order', {
  supportsStatements: true,
  statementLinkType: 'customer',
})
registerModuleBehavior('freight-bill', {
  supportsStatements: true,
  statementLinkType: 'freight',
})

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
