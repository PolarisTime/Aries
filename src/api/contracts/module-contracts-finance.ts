import type { ModuleEndpointConfig } from '@/api/contracts/module-contract-types'
import type { ModuleKey } from '@/module-system/core/module-key'

export const financeModuleEndpointContracts = {
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
} satisfies Partial<Record<ModuleKey, ModuleEndpointConfig>>
