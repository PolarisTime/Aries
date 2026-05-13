import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const systemModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'general-setting': {
    path: '/general-setting',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'company-setting': {
    path: '/company-setting',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'operation-log': {
    path: '/operation-log',
    readOnly: true,
    nativeFilterKeys: [
      'keyword',
      'moduleName',
      'actionType',
      'resultStatus',
      'startTime',
      'endTime',
      'recordId',
    ],
    dateRangeMapping: {
      operationTime: {
        startKey: 'startTime',
        endKey: 'endTime',
      },
    },
  },
  'permission': {
    path: '/permission',
    readOnly: true,
    nativeFilterKeys: ['keyword'],
  },
  department: {
    path: '/department',
    nativeFilterKeys: ['keyword', 'status'],
  },
  departments: {
    path: '/department',
    nativeFilterKeys: ['keyword', 'status'],
  },
}
