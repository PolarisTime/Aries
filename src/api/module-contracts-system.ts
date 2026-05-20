import type { ModuleEndpointConfig } from '@/api/module-contract-types'

export const systemModuleEndpointContracts: Record<
  string,
  ModuleEndpointConfig
> = {
  'general-setting': {
    path: '/general-settings',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'company-setting': {
    path: '/company-settings',
    nativeFilterKeys: ['keyword', 'status'],
  },
  'operation-log': {
    path: '/operation-logs',
    readOnly: true,
    nativeFilterKeys: [
      'keyword',
      'moduleName',
      'actionType',
      'authType',
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
  permission: {
    path: '/permissions',
    readOnly: true,
    nativeFilterKeys: ['keyword'],
  },
  department: {
    path: '/departments',
    nativeFilterKeys: ['keyword', 'status'],
  },
  departments: {
    path: '/departments',
    nativeFilterKeys: ['keyword', 'status'],
  },
}
