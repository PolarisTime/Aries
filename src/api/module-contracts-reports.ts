import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const reportModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'pending-invoice-receipt-report': {
    path: '/pending-invoice-receipt-report',
    readOnly: true,
    sortDirectionParam: 'sortDirection',
    nativeFilterKeys: ['keyword', 'supplierName', 'startDate', 'endDate'],
    dateRangeMapping: {
      orderDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
  'inventory-report': {
    path: '/inventory-report',
    readOnly: true,
    sortDirectionParam: 'sortDirection',
    nativeFilterKeys: [
      'keyword',
      'warehouseName',
      'category',
      'includeOutbound',
    ],
  },
  'io-report': {
    path: '/io-report',
    readOnly: true,
    sortDirectionParam: 'sortDirection',
    nativeFilterKeys: ['keyword', 'businessType', 'startDate', 'endDate'],
    dateRangeMapping: {
      businessDate: {
        startKey: 'startDate',
        endKey: 'endDate',
      },
    },
  },
}
