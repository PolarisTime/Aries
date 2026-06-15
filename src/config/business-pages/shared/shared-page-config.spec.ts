import { describe, expect, it } from 'vitest'
import { freightStatementPageConfig } from '../finance/freight-statement-page'
import { invoiceIssuePageConfig } from '../finance/invoice-issue-page'
import { invoiceReceiptPageConfig } from '../finance/invoice-receipt-page'
import { paymentsPageConfig } from '../finance/payment-page'
import { receiptsPageConfig } from '../finance/receipt-page'
import { carriersPageConfig } from '../master/carrier-page'
import { customersPageConfig } from '../master/customer-page'
import { materialCategoriesPageConfig } from '../master/material-categories-page'
import { materialsPageConfig } from '../master/material-page'
import { suppliersPageConfig } from '../master/supplier-page'
import { purchaseContractsPageConfig } from '../operations/purchase-contract-page'
import { purchaseInboundsPageConfig } from '../operations/purchase-inbound-page'
import { purchaseOrdersPageConfig } from '../operations/purchase-order-page'
import { salesContractsPageConfig } from '../operations/sales-contract-page'
import { salesOrdersPageConfig } from '../operations/sales-order-page'
import { salesOutboundsPageConfig } from '../operations/sales-outbound-page'

const pageConfigs = [
  { name: 'carriersPageConfig', config: carriersPageConfig },
  { name: 'customersPageConfig', config: customersPageConfig },
  { name: 'suppliersPageConfig', config: suppliersPageConfig },
  {
    name: 'materialCategoriesPageConfig',
    config: materialCategoriesPageConfig,
  },
  { name: 'materialsPageConfig', config: materialsPageConfig },
  { name: 'purchaseOrdersPageConfig', config: purchaseOrdersPageConfig },
  { name: 'purchaseInboundsPageConfig', config: purchaseInboundsPageConfig },
  { name: 'purchaseContractsPageConfig', config: purchaseContractsPageConfig },
  { name: 'salesOrdersPageConfig', config: salesOrdersPageConfig },
  { name: 'salesOutboundsPageConfig', config: salesOutboundsPageConfig },
  { name: 'salesContractsPageConfig', config: salesContractsPageConfig },
  { name: 'invoiceIssuePageConfig', config: invoiceIssuePageConfig },
  { name: 'invoiceReceiptPageConfig', config: invoiceReceiptPageConfig },
  { name: 'paymentsPageConfig', config: paymentsPageConfig },
  { name: 'receiptsPageConfig', config: receiptsPageConfig },
  { name: 'freightStatementPageConfig', config: freightStatementPageConfig },
]

describe.each(pageConfigs)('$name', ({ config }) => {
  it('has required top-level fields', () => {
    expect(config.key).toBeTruthy()
    expect(config.title).toBeTruthy()
    expect(config.primaryNoKey).toBeTruthy()
    expect(Array.isArray(config.filters)).toBe(true)
    expect(Array.isArray(config.columns)).toBe(true)
    expect(Array.isArray(config.detailFields)).toBe(true)
    expect(Array.isArray(config.formFields)).toBe(true)
    if (config.statusMap) {
      expect(typeof config.statusMap).toBe('object')
    }
    expect(typeof config.buildOverview).toBe('function')
  })

  it('has valid actions', () => {
    expect(Array.isArray(config.actions)).toBe(true)
    for (const action of config.actions) {
      expect(action.label).toBeTruthy()
    }
  })

  it('has valid filters with key and label', () => {
    for (const filter of config.filters) {
      expect(filter.key).toBeTruthy()
      expect(filter.label).toBeTruthy()
    }
  })

  it('has valid columns with title and dataIndex', () => {
    for (const col of config.columns) {
      expect(col.title).toBeTruthy()
      expect(col.dataIndex).toBeTruthy()
    }
  })

  it('has valid detailFields with label and key', () => {
    for (const field of config.detailFields) {
      expect(field.label).toBeTruthy()
      expect(field.key).toBeTruthy()
    }
  })

  it('has valid formFields with key and label', () => {
    for (const field of config.formFields) {
      expect(field.key).toBeTruthy()
      expect(field.label).toBeTruthy()
    }
  })

  it('buildOverview returns array of items', () => {
    const overview = config.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
    for (const item of overview) {
      expect(item.label).toBeTruthy()
      expect(item.value).toBeTruthy()
    }
  })

  it('buildOverview handles non-empty rows', () => {
    const overview = config.buildOverview([
      { status: '正常' },
      { status: '禁用' },
    ])
    expect(overview.length).toBeGreaterThan(0)
  })

  it('has rowHighlightStatuses if defined', () => {
    if (config.rowHighlightStatuses) {
      expect(Array.isArray(config.rowHighlightStatuses)).toBe(true)
    }
    if (config.saveFields) {
      expect(Array.isArray(config.saveFields.scalar)).toBe(true)
    }
  })

  it('has valid actions', () => {
    expect(Array.isArray(config.actions)).toBe(true)
    for (const action of config.actions) {
      expect(action.key).toBeTruthy()
      expect(action.label).toBeTruthy()
      expect(['primary', 'default']).toContain(action.type)
    }
  })

  it('has valid filters with key and label', () => {
    for (const filter of config.filters) {
      expect(filter.key).toBeTruthy()
      expect(filter.label).toBeTruthy()
    }
  })

  it('has valid columns with title and dataIndex', () => {
    for (const col of config.columns) {
      expect(col.title).toBeTruthy()
      expect(col.dataIndex).toBeTruthy()
    }
  })

  it('has valid formFields with key and label', () => {
    for (const field of config.formFields) {
      expect(field.key).toBeTruthy()
      expect(field.label).toBeTruthy()
    }
  })

  it('buildOverview returns array of items', () => {
    const overview = config.buildOverview([])
    expect(Array.isArray(overview)).toBe(true)
    for (const item of overview) {
      expect(item.label).toBeTruthy()
      expect(item.value).toBeTruthy()
    }
  })

  it('buildOverview handles non-empty rows', () => {
    const overview = config.buildOverview([
      { status: '正常' },
      { status: '禁用' },
    ])
    expect(overview.length).toBeGreaterThan(0)
  })
})

describe('freightStatementPageConfig', () => {
  it('has parentImport with full structure', () => {
    const pi = freightStatementPageConfig.parentImport
    expect(pi).toBeTruthy()
    expect(pi.parentModuleKey).toBe('freight-bill')
    expect(pi.parentFieldKey).toBe('sourceBillNos')
    expect(pi.enforceUniqueRelation).toBe(true)
    expect(pi.allowMultipleSelection).toBe(true)

    const validation = pi.validateBeforeOpen?.({ carrierName: '' })
    expect(validation).toBe('请先选择物流商，再选择物流单')

    const noValidation = pi.validateBeforeOpen?.({ carrierName: '物流A' })
    expect(noValidation).toBeNull()

    const validateResult = pi.validateParentImport?.({
      currentRecord: { carrierName: '物流A' },
      parentRecord: { status: '已审核', carrierName: '物流A' },
    })
    expect(validateResult).toBeNull()

    const validateWrongStatus = pi.validateParentImport?.({
      currentRecord: { carrierName: '物流A' },
      parentRecord: { status: '草稿', carrierName: '物流A' },
    })
    expect(validateWrongStatus).toBe('只能选择已审核的物流单生成物流对账单')

    const validateWrongCarrier = pi.validateParentImport?.({
      currentRecord: { carrierName: '物流A' },
      parentRecord: { status: '已审核', carrierName: '物流B' },
    })
    expect(validateWrongCarrier).toBe(
      '只能选择同一物流商的物流单生成物流对账单',
    )

    const draft = pi.mapParentToDraft?.({
      carrierName: '物流A',
      billTime: '2024-01-01',
    })
    expect(draft?.carrierName).toBe('物流A')
    expect(draft?.status).toBe('待审核')

    const items = pi.transformItems?.({
      billNo: 'BL2024001',
      items: [{ id: '1' }],
    })
    expect(items).toHaveLength(1)
    expect(items?.[0]?.sourceNo).toBe('BL2024001')

    const emptyItems = pi.transformItems?.({ billNo: 'BL2024002', items: null })
    expect(emptyItems).toEqual([])
  })
})

describe('page config specific features', () => {
  it('purchaseOrdersPageConfig has hidePageHeader', () => {
    expect(purchaseOrdersPageConfig.hidePageHeader).toBe(true)
  })

  it('salesOrdersPageConfig has parentImport with complex transformItems', () => {
    const pi = salesOrdersPageConfig.parentImport
    expect(pi?.parentModuleKey).toBe('purchase-order')

    const items = pi?.transformItems?.({
      items: [
        {
          id: '1',
          quantity: 10,
          weightTon: 5,
          pieceWeightTon: 0.5,
          unitPrice: 100,
          salesRemainingQuantity: 3,
          salesRemainingWeightTon: 1.5,
        },
      ],
    })
    expect(items).toHaveLength(1)
    expect(items?.[0]?.sourcePurchaseOrderItemId).toBe('1')
    expect(items?.[0]?.remainingQuantity).toBe(3)
    expect(items?.[0]?.remainingWeightTon).toBe(1.5)

    const itemsWithFallback = pi?.transformItems?.({
      items: [
        {
          id: '2',
          quantity: 0,
          weightTon: 0,
          remainingQuantity: undefined,
          salesRemainingQuantity: undefined,
        },
      ],
    })
    expect(itemsWithFallback).toHaveLength(1)
    expect(itemsWithFallback?.[0]?.remainingQuantity).toBe(0)
    expect(itemsWithFallback?.[0]?.pieceWeightTon).toBe(0)
  })

  it('purchaseContractsPageConfig has parentImport with date logic', () => {
    const pi = purchaseContractsPageConfig.parentImport
    const draft = pi?.mapParentToDraft?.({
      orderNo: 'PO001',
      supplierName: '供应商A',
      buyerName: '采购员',
      orderDate: '2024-06-01',
    })
    expect(draft?.supplierName).toBe('供应商A')
    expect(draft?.buyerName).toBe('采购员')
    expect(draft?.signDate).toBe('2024-06-01')
    expect(draft?.status).toBe('已归档')

    const draftNoDate = pi?.mapParentToDraft?.({})
    expect(draftNoDate?.signDate).toBeUndefined()
    expect(draftNoDate?.expireDate).toBeUndefined()
  })

  it('purchaseInboundsPageConfig has parentImport with settlement mode', () => {
    const pi = purchaseInboundsPageConfig.parentImport
    const items = pi?.transformItems?.({
      items: [
        {
          id: '1',
          category: '盘螺',
          remainingQuantity: 5,
          pieceWeightTon: 0.5,
        },
      ],
    })
    expect(items).toHaveLength(1)
    expect(items?.[0]?.settlementMode).toBe('过磅')
    expect(items?.[0]?.quantity).toBe(5)

    const itemsNoRemaining = pi?.transformItems?.({
      items: [
        { id: '2', category: '螺纹钢', quantity: 0, pieceWeightTon: 0.5 },
      ],
    })
    expect(itemsNoRemaining).toHaveLength(0)
  })

  it('invoiceIssuePageConfig and invoiceReceiptPageConfig have parentImport', () => {
    const issuePi = invoiceIssuePageConfig.parentImport
    expect(issuePi.parentModuleKey).toBe('sales-order')

    const receiptPi = invoiceReceiptPageConfig.parentImport
    expect(receiptPi.parentModuleKey).toBe('purchase-order')

    const draft = issuePi.mapParentToDraft?.({
      customerName: '客户A',
      projectName: '项目X',
    })
    expect(draft?.customerName).toBe('客户A')
    expect(draft?.projectName).toBe('项目X')
  })

  it('materialCategoriesPageConfig has custom buildOverview', () => {
    const rows = [
      { status: '正常', purchaseWeighRequired: true },
      { status: '正常', purchaseWeighRequired: false },
      { status: '禁用', purchaseWeighRequired: true },
    ]
    const overview = materialCategoriesPageConfig.buildOverview(rows)
    expect(overview).toHaveLength(3)
  })

  it('materialsPageConfig has custom buildOverview', () => {
    const rows = [{ category: '螺纹钢' }, { category: '盘螺' }]
    const overview = materialsPageConfig.buildOverview(rows)
    expect(overview).toHaveLength(3)
  })
})
