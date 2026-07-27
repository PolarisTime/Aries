import dayjs from 'dayjs'
import { findCarrierOption } from '@/api/master/carrier-options'
import { findCustomerOption } from '@/api/master/customer-options'
import { findSupplierOption } from '@/api/master/supplier-options'
import { getSettlementCompanyOptions } from '@/api/system/company-settings'
import type { ModuleBehaviorContributor } from '@/module-system/behavior/module-behavior-registry-core'
import type { ModuleKey } from '@/module-system/core/module-key'
import { findProjectOption } from '@/module-system/core/module-option-resolvers'
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

function isBlank(value: unknown) {
  return !asString(value).trim()
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
  // 显式清空时同步清空快照
  if (isBlank(editorForm.counterpartyId)) {
    clearCounterpartyIdentity(editorForm)
    return
  }
  const identity = resolveCounterpartyIdentity(
    editorForm.counterpartyType,
    editorForm.counterpartyId,
  )
  // 选项缓存未命中（主数据已停用或缓存未就绪）时保留现有快照，避免误清
  if (!identity) {
    return
  }
  editorForm.counterpartyId = asString(identity.id)
  editorForm.counterpartyCode = asString(identity.code).trim()
  editorForm.counterpartyName = asString(identity.name).trim()
}

function snapshotSupplierIdentity(editorForm: Record<string, unknown>) {
  // 显式清空时同步清空快照
  if (isBlank(editorForm.supplierId)) {
    editorForm.supplierId = ''
    editorForm.supplierCode = ''
    editorForm.supplierName = ''
    return
  }
  const supplier = findSupplierOption(editorForm.supplierId)
  // 选项缓存未命中（主数据已停用或缓存未就绪）时保留现有快照，避免误清
  if (!supplier) {
    return
  }
  editorForm.supplierId = asString(supplier.id)
  editorForm.supplierCode = asString(supplier.supplierCode).trim()
  editorForm.supplierName = asString(supplier.supplierName).trim()
}

export const contributeEditorBehaviors: ModuleBehaviorContributor = (
  registerModuleBehavior,
) => {
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

  registerModuleBehavior('purchase-order', {
    defaultOperatorField: 'buyerName',
  })
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
  ] as const satisfies readonly ModuleKey[]
  const customerProjectSnapshotModules = new Set<ModuleKey>([
    'sales-order',
    'sales-outbound',
    'customer-statement',
  ])

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
          if (isBlank(editorForm.customerId)) {
            // 显式清空客户：同步清空快照、项目与默认结算公司
            editorForm.customerId = ''
            editorForm.customerCode = ''
            editorForm.customerName = ''
            if (!ctx.changedKeys.has('projectId')) {
              editorForm.projectId = ''
              editorForm.projectName = ''
            }
            applyDefaultSettlementCompany(editorForm, undefined)
          } else {
            const customer = findCustomerOption(editorForm.customerId)
            // 选项缓存未命中时保留现有快照，避免误清
            if (customer) {
              editorForm.customerId = asString(customer.id)
              editorForm.customerCode = asString(customer.customerCode).trim()
              editorForm.customerName = asString(customer.customerName).trim()
              if (!ctx.changedKeys.has('projectId')) {
                editorForm.projectId = ''
                editorForm.projectName = ''
              }
              applyDefaultSettlementCompany(editorForm, customer)
            }
          }
        }

        if (
          customerProjectSnapshotModules.has(key) &&
          ctx.changedKeys.has('projectId')
        ) {
          if (isBlank(editorForm.projectId)) {
            editorForm.projectId = ''
            editorForm.projectName = ''
          } else {
            const project = findProjectOption(
              editorForm.projectId,
              editorForm.customerId,
            )
            // 选项缓存未命中时保留现有快照，避免误清
            if (project) {
              editorForm.projectId = asString(project.id)
              editorForm.projectName = asString(project.projectName).trim()
            }
          }
        }

        if (
          customerProjectSnapshotModules.has(key) &&
          (ctx.changedKeys.has('customerId') ||
            ctx.changedKeys.has('projectId'))
        ) {
          return
        }

        if (
          (key === 'freight-bill' || key === 'freight-statement') &&
          ctx.changedKeys.has('carrierId')
        ) {
          if (!ctx.changedKeys.has('vehiclePlate')) {
            editorForm.vehiclePlate = ''
          }
          if (isBlank(editorForm.carrierId)) {
            // 显式清空承运商：同步清空编码与默认结算公司
            editorForm.carrierId = ''
            editorForm.carrierName = ''
            editorForm.carrierCode = ''
            if (key === 'freight-bill') {
              applyDefaultSettlementCompany(editorForm, undefined)
              return
            }
          } else {
            const carrier = findCarrierOption(editorForm.carrierId)
            // 选项缓存未命中时保留现有编码与结算公司快照，避免误清
            if (carrier) {
              editorForm.carrierId = asString(carrier.id)
              const carrierName = asString(carrier.carrierName).trim()
              if (carrierName) {
                editorForm.carrierName = carrierName
              }
              editorForm.carrierCode = asString(carrier.carrierCode).trim()
              if (key === 'freight-bill') {
                applyDefaultSettlementCompany(editorForm, carrier)
                return
              }
            } else if (key === 'freight-bill') {
              return
            }
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
  const operatorNameModules = [
    'receipt',
    'payment',
  ] as const satisfies readonly ModuleKey[]

  for (const key of operatorNameModules) {
    registerModuleBehavior(key, { defaultOperatorField: 'operatorName' })
  }

  registerModuleBehavior('receipt', {
    defaultDraftValues: () => ({
      receiptDate: currentDate(),
      receiptPurpose: 'CUSTOMER_STATEMENT_SETTLEMENT',
      counterpartyType: '客户',
    }),
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('counterpartyType')) {
        editorForm.receiptPurpose =
          editorForm.counterpartyType === '供应商'
            ? 'SUPPLIER_OTHER_RECEIPT'
            : 'CUSTOMER_STATEMENT_SETTLEMENT'
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

      if (ctx.changedKeys.has('counterpartyId')) {
        snapshotCounterpartyIdentity(editorForm)
        editorForm.projectId = ''
        editorForm.projectName = ''
        editorForm.sourceCustomerStatementId = ''
        if (editorForm.counterpartyType === '客户') {
          editorForm.customerId = editorForm.counterpartyId
          editorForm.customerCode = editorForm.counterpartyCode
          editorForm.customerName = editorForm.counterpartyName
          const customer = findCustomerOption(editorForm.counterpartyId)
          if (isBlank(editorForm.counterpartyId)) {
            applyDefaultSettlementCompany(editorForm, undefined)
          } else if (customer) {
            // 选项缓存未命中时保留现有结算公司快照，避免误清
            applyDefaultSettlementCompany(editorForm, customer)
          }
        } else {
          editorForm.customerId = ''
          editorForm.customerCode = ''
          editorForm.customerName = ''
        }
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
    defaultDraftValues: () => ({
      paymentDate: currentDate(),
      paymentPurpose: 'SUPPLIER_PAYMENT',
      counterpartyType: '供应商',
    }),
    syncEditorForm(editorForm, ctx) {
      if (ctx.changedKeys.has('counterpartyType')) {
        editorForm.paymentPurpose = 'SUPPLIER_PAYMENT'
        clearStatementSources(editorForm)
        editorForm.sourcePurchaseOrderId = ''
        editorForm.purchaseOrderNo = ''
        editorForm.supplierCode = ''
        editorForm.supplierName = ''
        editorForm.items = []
        clearCounterpartyIdentity(editorForm)
        editorForm.settlementCompanyId = ''
        editorForm.settlementCompanyName = ''
        return
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

  registerModuleBehavior('purchase-order', {
    lineItemTrimStrategy: 'purchaseOrderBlank',
  })

  registerModuleBehavior('freight-bill', {
    defaultDraftValues: () => ({ billTime: currentDate() }),
    allowsManualLineItems: false,
    lockParentImportOnlyWhenPersisted: true,
    readonlyItemColumns: [
      'sourceNo',
      'materialCode',
      'materialName',
      'spec',
      'material',
      'customerName',
      'projectName',
      'brand',
      'category',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'piecesPerBundle',
      'batchNo',
      'weightTon',
      'warehouseName',
    ],
    parentImportedEditableFields: [
      'vehiclePlate',
      'billTime',
      'unitPrice',
      'remark',
    ],
    resolveReadonlyEditorFields(record) {
      if (record.id && !asString(record.sourceOrderNos).trim()) {
        return [
          'carrierId',
          'carrierCode',
          'settlementCompanyId',
          'vehiclePlate',
          'billTime',
          'unitPrice',
          'remark',
        ]
      }
      return []
    },
  })
  registerModuleBehavior('freight-statement', {
    allowsManualLineItems: false,
    readonlyItemColumns: [
      'sourceNo',
      'materialCode',
      'materialName',
      'spec',
      'material',
      'customerName',
      'projectName',
      'brand',
      'category',
      'length',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'piecesPerBundle',
      'batchNo',
      'weightTon',
      'warehouseName',
    ],
  })
  registerModuleBehavior('customer-statement', {
    allowsManualLineItems: false,
    readonlyLineItems: true,
  })

  registerModuleBehavior('material', { supportsMaterialImport: true })
}
