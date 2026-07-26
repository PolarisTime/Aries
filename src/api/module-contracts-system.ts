import type { ModuleEndpointConfig } from '@/api/module-contract-types'
import type { ModuleKey } from '@/module-system/module-key'

export const systemModuleEndpointContracts = {
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
} satisfies Partial<Record<ModuleKey, ModuleEndpointConfig>>
