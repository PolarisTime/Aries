import { describe, expect, it } from 'vitest'
import { appPageDefinitions } from '@/config/page-registry'
import { moduleEndpointContracts } from '@/api/module-contracts'
import { businessPageConfigs } from '@/config/business-pages'
import { menuResourceMap } from '@/constants/resource-permissions'
import {
  getBehaviorValue,
  hasBehavior,
} from '@/views/modules/module-behavior-registry'

/**
 * Cross-registry consistency: when a module key appears in one registry,
 * it must be consistently present (or consistently absent) across all others.
 * This prevents silent drift when modules are added/renamed/removed.
 */

const ALL_MODULE_KEYS = new Set([
  ...appPageDefinitions.map((d) => d.moduleKey).filter(Boolean) as string[],
  ...Object.keys(moduleEndpointContracts),
  ...Object.keys(businessPageConfigs),
])

// These are intentionally excluded from certain registries.
const READ_ONLY_MODULE_KEYS = new Set([
  'permission-management',
  'general-settings',
  'company-settings',
  'dashboard',
  'role-action-editor',
])

describe('cross-registry consistency', () => {
  it('every moduleKey in appPageDefinitions has a page config', () => {
    for (const def of appPageDefinitions) {
      if (!def.moduleKey) continue
      expect(
        businessPageConfigs,
        `moduleKey "${def.moduleKey}" from page-registry is missing in businessPageConfigs`,
      ).toHaveProperty(def.moduleKey)
    }
  })

  it('every moduleKey in businessPageConfigs has an endpoint contract', () => {
    for (const key of Object.keys(businessPageConfigs)) {
      if (READ_ONLY_MODULE_KEYS.has(key)) continue
      expect(
        moduleEndpointContracts,
        `moduleKey "${key}" from businessPageConfigs is missing in moduleEndpointContracts`,
      ).toHaveProperty(key)
    }
  })

  it('every moduleKey with menu entry has a resource permission map', () => {
    for (const def of appPageDefinitions) {
      if (!def.moduleKey || !def.menuKey) continue
      if (READ_ONLY_MODULE_KEYS.has(def.moduleKey)) continue
      expect(
        menuResourceMap,
        `moduleKey "${def.moduleKey}" has menu "${def.menuKey}" but is missing in menuResourceMap`,
      ).toHaveProperty(def.moduleKey)
    }
  })

  it('every module with statement support has a statement link type', () => {
    for (const key of Object.keys(businessPageConfigs)) {
      if (hasBehavior(key, 'supportsStatements')) {
        const linkType = getBehaviorValue(key, 'statementLinkType')
        expect(
          linkType,
          `moduleKey "${key}" has supportsStatements but no statementLinkType`,
        ).toBeDefined()
      }
    }
  })

  it('no module has a statementLinkType without supportsStatements', () => {
    for (const key of Object.keys(businessPageConfigs)) {
      const linkType = getBehaviorValue(key, 'statementLinkType')
      if (linkType) {
        expect(
          hasBehavior(key, 'supportsStatements'),
          `moduleKey "${key}" has statementLinkType but supportsStatements is false`,
        ).toBe(true)
      }
    }
  })

  it('all modules with editableLockedFields also have supportsLineItems', () => {
    for (const key of Object.keys(businessPageConfigs)) {
      const locked = getBehaviorValue(key, 'editableLockedFields')
      if (locked && (locked as string[]).length > 0) {
        expect(
          hasBehavior(key, 'supportsLineItems'),
          `moduleKey "${key}" has editableLockedFields but supportsLineItems is false`,
        ).toBe(true)
      }
    }
  })

  it('all modules with parentImport have an endpoint contract', () => {
    for (const key of Object.keys(businessPageConfigs)) {
      const config = businessPageConfigs[key]
      if (config.parentImport) {
        expect(
          moduleEndpointContracts,
          `moduleKey "${key}" has parentImport but no endpoint contract`,
        ).toHaveProperty(key)
      }
    }
  })

  it('no orphaned resource map entries exist without a module', () => {
    for (const key of Object.keys(menuResourceMap)) {
      const exists = ALL_MODULE_KEYS.has(key) || READ_ONLY_MODULE_KEYS.has(key)
      expect(
        exists,
        `menuResourceMap key "${key}" has no matching module in page-registry, endpoint-contracts, or business-pages`,
      ).toBe(true)
    }
  })

  it('no orphaned endpoint contracts exist without a page config', () => {
    for (const key of Object.keys(moduleEndpointContracts)) {
      expect(
        businessPageConfigs,
        `endpoint contract key "${key}" is missing in businessPageConfigs`,
      ).toHaveProperty(key)
    }
  })
})
