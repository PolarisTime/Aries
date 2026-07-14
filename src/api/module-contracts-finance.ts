import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const financeModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'supplier-statement': {
    path: '/supplier-statements',
    nativeFilterKeys: [
      'keyword',
      'supplierId',
      'supplierName',
      'settlementCompanyId',
      'status',
    ],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  'customer-statement': {
    path: '/customer-statements',
    nativeFilterKeys: [
      'keyword',
      'customerId',
      'customerName',
      'projectId',
      'settlementCompanyId',
      'status',
    ],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  'freight-statement': {
    path: '/freight-statements',
    nativeFilterKeys: [
      'keyword',
      'carrierId',
      'carrierCode',
      'carrierName',
      'settlementCompanyId',
      'status',
      'signStatus',
    ],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  receipt: {
    path: '/receipts',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'counterpartyType',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      receiptDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  payment: {
    path: '/payments',
    nativeFilterKeys: [
      'keyword',
      'businessType',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      paymentDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'cash-reversal': {
    path: '/cash-reversals',
    nativeFilterKeys: [
      'keyword',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      reversalDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'invoice-receipt': {
    path: '/invoice-receipts',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      invoiceDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'invoice-issue': {
    path: '/invoice-issues',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      invoiceDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'ledger-adjustment': {
    path: '/ledger-adjustments',
    nativeFilterKeys: [
      'keyword',
      'direction',
      'counterpartyType',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      adjustmentDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'receivable-payable': {
    path: '/receivable-payables',
    readOnly: true,
    supportsDetail: true,
    sortDirectionParam: 'sortDirection',
    nativeFilterKeys: [
      'keyword',
      'direction',
      'counterpartyType',
      'reconciliationStatus',
      'status',
    ],
  },
}
