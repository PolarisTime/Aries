import { describe, expect, it } from 'vitest'
import type { AppPageDefinition, RouteViewKey } from './page-registry-types'

describe('page-registry-types', () => {
  describe('RouteViewKey', () => {
    it('accepts all valid route view keys', () => {
      const validKeys: RouteViewKey[] = [
        'dashboard',
        'business-grid',
        'number-rules',
        'general-setting',
        'company-setting',
        'print-template',
        'access-control',
        'session',
        'api-key',
        'security-key',
        'database-backup',
      ]

      for (const key of validKeys) {
        expect(typeof key).toBe('string')
      }
    })
  })

  describe('AppPageDefinition', () => {
    it('accepts a valid page definition with required fields', () => {
      const page: AppPageDefinition = {
        key: 'test-page',
        title: 'Test Page',
        menuKey: 'test',
        view: 'dashboard',
        icon: 'DashboardOutlined',
      }

      expect(page.key).toBe('test-page')
      expect(page.view).toBe('dashboard')
    })

    it('accepts optional fields', () => {
      const page: AppPageDefinition = {
        key: 'test-page',
        title: 'Test Page',
        menuKey: 'test',
        view: 'business-grid',
        icon: 'FileOutlined',
        menuParent: 'system',
        moduleKey: 'purchase-order',
        searchable: true,
        accessMenuKeys: ['menu1', 'menu2'],
        hiddenInMenu: false,
        activeMenuKey: 'test',
        openPageKey: 'open-page',
        resourceKey: 'resource-1',
        accessResources: ['res1', 'res2'],
      }

      expect(page.moduleKey).toBe('purchase-order')
      expect(page.searchable).toBe(true)
      expect(page.accessMenuKeys).toEqual(['menu1', 'menu2'])
      expect(page.hiddenInMenu).toBe(false)
      expect(page.resourceKey).toBe('resource-1')
      expect(page.accessResources).toEqual(['res1', 'res2'])
    })
  })
})
