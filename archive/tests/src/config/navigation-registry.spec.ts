import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from './navigation-registry'

describe('navigation-registry', () => {
  describe('menuGroupOrder', () => {
    it('contains all expected group keys', () => {
      expect(menuGroupOrder).toEqual([
        'master',
        'purchase',
        'sales',
        'freight',
        'contracts',
        'reports',
        'statements',
        'finance',
        'system',
      ])
    })
  })

  describe('menuGroupDefinitions', () => {
    it('defines a record for each group key', () => {
      for (const key of menuGroupOrder) {
        expect(menuGroupDefinitions[key]).toBeDefined()
        expect(menuGroupDefinitions[key].key).toBe(key)
        expect(menuGroupDefinitions[key].icon).toBeDefined()
      }
    })

    it('assigns correct icons', () => {
      expect(menuGroupDefinitions.master.icon).toBe('AppstoreOutlined')
      expect(menuGroupDefinitions.purchase.icon).toBe('ShoppingCartOutlined')
      expect(menuGroupDefinitions.sales.icon).toBe('ShopOutlined')
      expect(menuGroupDefinitions.freight.icon).toBe('CarOutlined')
      expect(menuGroupDefinitions.contracts.icon).toBe('FileTextOutlined')
      expect(menuGroupDefinitions.reports.icon).toBe('TableOutlined')
      expect(menuGroupDefinitions.statements.icon).toBe('FileTextOutlined')
      expect(menuGroupDefinitions.finance.icon).toBe('WalletOutlined')
      expect(menuGroupDefinitions.system.icon).toBe('SettingOutlined')
    })

    it('defines correct title translations', () => {
      expect(menuGroupDefinitions.master.title).toBe('navigation.master')
      expect(menuGroupDefinitions.purchase.title).toBe('navigation.purchase')
      expect(menuGroupDefinitions.sales.title).toBe('navigation.sales')
      expect(menuGroupDefinitions.freight.title).toBe('navigation.freight')
      expect(menuGroupDefinitions.contracts.title).toBe('navigation.contracts')
      expect(menuGroupDefinitions.reports.title).toBe('navigation.reports')
      expect(menuGroupDefinitions.statements.title).toBe(
        'navigation.statements',
      )
      expect(menuGroupDefinitions.finance.title).toBe('navigation.finance')
      expect(menuGroupDefinitions.system.title).toBe('navigation.system')
    })
  })

  describe('buildMenuEntriesByGroup', () => {
    it('returns a Map with all group keys', () => {
      const result = buildMenuEntriesByGroup([])
      expect(result).toBeInstanceOf(Map)
      expect(result.size).toBe(menuGroupOrder.length)
    })

    it('groups entries by menuParent', () => {
      const entries = [
        {
          key: 'po',
          title: '采购订单',
          menuKey: '/po',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'purchase' as const,
        },
        {
          key: 'so',
          title: '销售订单',
          menuKey: '/so',
          view: 'business-grid' as const,
          icon: 'FileDoneOutlined' as const,
          menuParent: 'sales' as const,
        },
        {
          key: 'po2',
          title: '采购订单2',
          menuKey: '/po2',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'purchase' as const,
        },
      ]
      const result = buildMenuEntriesByGroup(entries)
      expect(result.get('purchase')).toHaveLength(2)
      expect(result.get('sales')).toHaveLength(1)
      expect(result.get('master')).toHaveLength(0)
    })

    it('filters out entries with hiddenInMenu', () => {
      const entries = [
        {
          key: 'hidden',
          title: 'Hidden',
          menuKey: '/hidden',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'purchase' as const,
          hiddenInMenu: true,
        },
        {
          key: 'visible',
          title: 'Visible',
          menuKey: '/visible',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'purchase' as const,
        },
      ]
      const result = buildMenuEntriesByGroup(entries)
      expect(result.get('purchase')).toHaveLength(1)
      expect(result.get('purchase')![0].key).toBe('visible')
    })

    it('returns empty arrays for groups with no entries', () => {
      const result = buildMenuEntriesByGroup([])
      for (const key of menuGroupOrder) {
        expect(result.get(key)).toEqual([])
      }
    })

    it('preserves entry order within groups', () => {
      const entries = [
        {
          key: 'a',
          title: 'A',
          menuKey: '/a',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'master' as const,
        },
        {
          key: 'b',
          title: 'B',
          menuKey: '/b',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'master' as const,
        },
        {
          key: 'c',
          title: 'C',
          menuKey: '/c',
          view: 'business-grid' as const,
          icon: 'ProfileOutlined' as const,
          menuParent: 'master' as const,
        },
      ]
      const result = buildMenuEntriesByGroup(entries)
      const masterEntries = result.get('master')!
      expect(masterEntries.map((e) => e.key)).toEqual(['a', 'b', 'c'])
    })
  })
})
