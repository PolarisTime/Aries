import type { ModuleBehaviorConfig } from '@/views/modules/module-behavior-types'

export const moduleBehaviorRegistry = new Map<string, ModuleBehaviorConfig>()

export function registerModuleBehavior(
  key: string,
  config: ModuleBehaviorConfig,
) {
  moduleBehaviorRegistry.set(key, {
    ...moduleBehaviorRegistry.get(key),
    ...config,
  })
}
