import type { ModuleEndpointConfig } from '@/api/contracts/module-contract-types'
import { financeModuleEndpointContracts } from '@/api/contracts/module-contracts-finance'
import { masterModuleEndpointContracts } from '@/api/contracts/module-contracts-master'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import { systemModuleEndpointContracts } from '@/api/contracts/module-contracts-system'
import {
  assertModuleKey,
  type ModuleKey,
} from '@/module-system/core/module-key'

export type {
  ModuleEndpointConfig,
  QueryValue,
} from '@/api/contracts/module-contract-types'

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
