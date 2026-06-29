import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const operationModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'purchase-order': {
    path: '/purchase-orders',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      orderDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'purchase-inbound': {
    path: '/purchase-inbounds',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      inboundDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-order': {
    path: '/sales-orders',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'projectName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      deliveryDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-outbound': {
    path: '/sales-outbounds',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'projectName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      outboundDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'freight-bill': {
    path: '/freight-bills',
    nativeFilterKeys: [
      'keyword',
      'carrierName',
      'settlementCompanyId',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      billTime: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'purchase-contract': {
    path: '/purchase-contracts',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      signDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'sales-contract': {
    path: '/sales-contracts',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'status',
      'startDate',
      'endDate',
    ],
    dateRangeMapping: {
      signDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
}
