import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const financeModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
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
  'ledger-adjustment': {
    path: '/ledger-adjustments',
    readOnly: true,
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
}
