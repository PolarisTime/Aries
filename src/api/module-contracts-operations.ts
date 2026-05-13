import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const operationModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'purchase-order': {
    path: '/purchase-order',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
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
    path: '/purchase-inbound',
    nativeFilterKeys: [
      'keyword',
      'supplierName',
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
    path: '/sales-order',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'projectName',
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
    path: '/sales-outbound',
    nativeFilterKeys: [
      'keyword',
      'customerName',
      'projectName',
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
    path: '/freight-bill',
    nativeFilterKeys: [
      'keyword',
      'carrierName',
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
    path: '/purchase-contract',
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
    path: '/sales-contract',
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
