import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const reportModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'inventory-report': {
    path: '/inventory-report',
    readOnly: true,
    sortDirectionParam: 'sortDirection',
    nativeFilterKeys: ['keyword', 'warehouseId', 'category', 'includeOutbound'],
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
