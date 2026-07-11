/** @file-dynamic-ref:registry — 模块行为注册表，通过 side-effect import 和字符串 key 动态调用 */
import { asString } from '@/utils/type-narrowing'
/**
 * Centralized registry for per-module behavioral configuration.
 * Replaces scattered Record<string, X> maps across multiple adapter files.
 */

import { moduleBehaviorRegistry } from '@/module-system/module-behavior-registry-core'
import {
  protectedDeleteStatuses,
  protectedEditStatuses,
} from '@/module-system/module-behavior-statuses'
import type { ModuleBehaviorConfig } from '@/module-system/module-behavior-types'
import '@/module-system/module-behavior-actions'
import '@/module-system/module-behavior-editor'
import '@/module-system/module-behavior-normalizers'
import '@/module-system/module-behavior-save'
import '@/module-system/module-behavior-statuses'

export type { ModuleBehaviorConfig } from '@/module-system/module-behavior-types'

export function hasBehavior(
  moduleKey: string,
  flag: keyof ModuleBehaviorConfig,
): boolean {
  const config = moduleBehaviorRegistry.get(moduleKey)
  if (!config) return false
  return Boolean(config[flag])
}

export function getBehaviorValue<K extends keyof ModuleBehaviorConfig>(
  moduleKey: string,
  flag: K,
): ModuleBehaviorConfig[K] | undefined {
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
