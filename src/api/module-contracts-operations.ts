import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const operationModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'purchase-order': {
    path: '/purchase-orders',
    nativeFilterKeys: [
      'keyword',
      'supplierId',
      'supplierName',
      'currentRecordId',
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
      'supplierId',
      'supplierName',
      'currentRecordId',
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
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'currentRecordId',
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
      'customerId',
      'customerName',
      'projectId',
      'projectName',
      'currentRecordId',
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
      'carrierId',
      'carrierCode',
      'carrierName',
      'customerId',
      'projectId',
      'currentRecordId',
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
}
