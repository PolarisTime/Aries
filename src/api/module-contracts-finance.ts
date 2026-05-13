import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const financeModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'supplier-statement': {
    path: '/supplier-statement',
    nativeFilterKeys: ['keyword', 'supplierName', 'status'],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  'customer-statement': {
    path: '/customer-statement',
    nativeFilterKeys: ['keyword', 'customerName', 'status'],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  'freight-statement': {
    path: '/freight-statement',
    nativeFilterKeys: ['keyword', 'carrierName', 'status', 'signStatus'],
    dateRangeMapping: {
      endDate: {
        startKey: 'periodStart',
        endKey: 'periodEnd',
      },
    },
  },
  receipt: {
    path: '/receipt',
    nativeFilterKeys: [
      'keyword',
      'customerName',
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
    path: '/payment',
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
  'invoice-receipt': {
    path: '/invoice-receipt',
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
    path: '/invoice-issue',
    nativeFilterKeys: [
      'keyword',
      'customerName',
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
  'receivable-payable': {
    path: '/receivable-payable',
    readOnly: true,
    sortDirectionParam: 'sortDirection',
    nativeFilterKeys: ['keyword', 'direction', 'counterpartyType', 'status'],
  },
}
