import { describe, expect, it } from 'vitest'
import {
  getMenuEntriesByGroup,
  getPageDefinition,
  getPageRoutePath,
  getSearchableModuleKeys,
} from '@/config/module-registry'
import { moduleEndpointContracts } from '@/api/module-contracts'
import {
  menuResourceMap,
  resourceLabelMap,
} from '@/constants/resource-permissions'

describe('module registry helpers', () => {
  it('derives route paths from menu keys instead of storing duplicate route config', () => {
    expect(getPageRoutePath('dashboard')).toBe('dashboard')
    expect(getPageRoutePath('database-management')).toBe('database-management')
  })

  it('returns indexed page definitions and menu groups', () => {
    expect(getPageDefinition('print-templates')).toMatchObject({
      key: 'print-templates',
      menuKey: '/print-templates',
    })
    expect(getPageDefinition('permission-management')).toMatchObject({
      key: 'permission-management',
      menuKey: '/permission-management',
      moduleKey: 'permission-management',
    })
    expect(getPageDefinition('role-settings')).toMatchObject({
      key: 'role-settings',
      menuKey: '/role-settings',
      hiddenInMenu: true,
      activeMenuKey: '/role-action-editor',
    })
    expect(getMenuEntriesByGroup('system').map((entry) => entry.key)).toContain(
      'print-templates',
    )
    expect(getMenuEntriesByGroup('system').map((entry) => entry.key)).toEqual(
      expect.arrayContaining(['permission-management', 'role-action-editor']),
    )
    expect(getMenuEntriesByGroup('system').map((entry) => entry.key)).not.toContain(
      'role-settings',
    )
  })

  it('returns searchable module keys from the precomputed registry', () => {
    expect(getSearchableModuleKeys()).toEqual(
      expect.arrayContaining([
        'purchase-orders',
        'sales-orders',
        'freight-bills',
      ]),
    )
  })

  it('does not expose the retired settlement accounts module', () => {
    expect(getPageDefinition('settlement-accounts')).toBeUndefined()
    expect(moduleEndpointContracts).not.toHaveProperty('settlement-accounts')
    expect(menuResourceMap).not.toHaveProperty('settlement-accounts')
    expect(resourceLabelMap).not.toHaveProperty('settlement-account')
  })
})
