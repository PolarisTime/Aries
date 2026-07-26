import type { ModuleBehaviorConfig } from '@/module-system/behavior/module-behavior-types'
import type { ModuleKey } from '@/module-system/core/module-key'

export type ModuleBehaviorRegistrar = (
  key: ModuleKey,
  config: ModuleBehaviorConfig,
) => void

export type ModuleBehaviorContributor = (
  registerModuleBehavior: ModuleBehaviorRegistrar,
) => void

export function assembleModuleBehaviors(
  ...contributors: readonly ModuleBehaviorContributor[]
): ReadonlyMap<ModuleKey, Readonly<ModuleBehaviorConfig>> {
  const registry = new Map<ModuleKey, Readonly<ModuleBehaviorConfig>>()
  const registerModuleBehavior: ModuleBehaviorRegistrar = (key, config) => {
    registry.set(
      key,
      Object.freeze({
        ...registry.get(key),
        ...config,
      }),
    )
  }

  for (const contribute of contributors) {
    contribute(registerModuleBehavior)
  }

  return registry
}
