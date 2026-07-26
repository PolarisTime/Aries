import type { ModuleEndpointConfig } from '@/api/module-contract-types'
import { financeModuleEndpointContracts } from '@/api/module-contracts-finance'
import { masterModuleEndpointContracts } from '@/api/module-contracts-master'
import { operationModuleEndpointContracts } from '@/api/module-contracts-operations'
import { systemModuleEndpointContracts } from '@/api/module-contracts-system'
import { assertModuleKey, type ModuleKey } from '@/module-system/module-key'

export type {
  ModuleEndpointConfig,
  QueryValue,
} from '@/api/module-contract-types'

const moduleEndpointContracts = {
  ...masterModuleEndpointContracts,
  ...operationModuleEndpointContracts,
  ...financeModuleEndpointContracts,
  ...systemModuleEndpointContracts,
} satisfies Record<ModuleKey, ModuleEndpointConfig>

export function getModuleConfig(moduleKey: string): ModuleEndpointConfig {
  const resolvedModuleKey = assertModuleKey(moduleKey)
  return moduleEndpointContracts[resolvedModuleKey]
}
