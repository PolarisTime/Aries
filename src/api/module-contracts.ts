import type { ModuleEndpointConfig } from '@/api/module-contract-types'
import { financeModuleEndpointContracts } from '@/api/module-contracts-finance'
import { masterModuleEndpointContracts } from '@/api/module-contracts-master'
import { operationModuleEndpointContracts } from '@/api/module-contracts-operations'
import { reportModuleEndpointContracts } from '@/api/module-contracts-reports'
import { systemModuleEndpointContracts } from '@/api/module-contracts-system'
import { getApiMessage } from '@/utils/api-messages'

export type {
  ModuleEndpointConfig,
  QueryValue,
} from '@/api/module-contract-types'

const moduleEndpointContracts: Record<string, ModuleEndpointConfig> = {
  ...masterModuleEndpointContracts,
  ...operationModuleEndpointContracts,
  ...financeModuleEndpointContracts,
  ...systemModuleEndpointContracts,
  ...reportModuleEndpointContracts,
}

export function getModuleConfig(moduleKey: string) {
  const config = moduleEndpointContracts[moduleKey]
  if (!config) {
    throw new Error(`${getApiMessage('moduleNotConfigured')}: ${moduleKey}`)
  }
  return config
}
