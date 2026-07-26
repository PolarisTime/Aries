import { asString } from '@/utils/type-narrowing'
/**
 * Centralized registry for per-module behavioral configuration.
 * Replaces scattered Record<string, X> maps across multiple adapter files.
 */

import { contributeActionBehaviors } from '@/module-system/module-behavior-actions'
import { contributeEditorBehaviors } from '@/module-system/module-behavior-editor'
import { contributeNormalizerBehaviors } from '@/module-system/module-behavior-normalizers'
import { assembleModuleBehaviors } from '@/module-system/module-behavior-registry-core'
import { contributeSaveBehaviors } from '@/module-system/module-behavior-save'
import {
  contributeStatusBehaviors,
  protectedDeleteStatuses,
  protectedEditStatuses,
} from '@/module-system/module-behavior-statuses'
import type { ModuleBehaviorConfig } from '@/module-system/module-behavior-types'
import { isModuleKey } from '@/module-system/module-key'

export type { ModuleBehaviorConfig } from '@/module-system/module-behavior-types'

const moduleBehaviorRegistry = assembleModuleBehaviors(
  contributeActionBehaviors,
  contributeEditorBehaviors,
  contributeNormalizerBehaviors,
  contributeSaveBehaviors,
  contributeStatusBehaviors,
)

export function hasBehavior(
  moduleKey: string,
  flag: keyof ModuleBehaviorConfig,
): boolean {
  if (!isModuleKey(moduleKey)) return false
  const config = moduleBehaviorRegistry.get(moduleKey)
  if (!config) return false
  return Boolean(config[flag])
}

export function getBehaviorValue<K extends keyof ModuleBehaviorConfig>(
  moduleKey: string,
  flag: K,
): ModuleBehaviorConfig[K] | undefined {
  if (!isModuleKey(moduleKey)) return undefined
  return moduleBehaviorRegistry.get(moduleKey)?.[flag]
}

export function isEditBlockedByStatus(
  status: unknown,
  moduleKey?: string,
): boolean {
  const normalized = asString(status).trim()
  if (!normalized) return false
  if (moduleKey) {
    const partiallyEditableStatuses = getBehaviorValue(
      moduleKey,
      'partiallyEditableStatuses',
    )
    if (partiallyEditableStatuses?.includes(normalized)) return false
    const perModule = getBehaviorValue(moduleKey, 'protectedEditStatuses')
    if (perModule) return new Set(perModule).has(normalized)
  }
  return protectedEditStatuses.has(normalized)
}

export function isDeleteBlockedByStatus(
  status: unknown,
  moduleKey?: string,
): boolean {
  const normalized = asString(status).trim()
  if (!normalized) return false
  if (moduleKey) {
    const perModule = getBehaviorValue(moduleKey, 'protectedDeleteStatuses')
    if (perModule) return new Set(perModule).has(normalized)
  }
  return protectedDeleteStatuses.has(normalized)
}
