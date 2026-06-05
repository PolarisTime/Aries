import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/api/module-contracts-finance', () => ({
  financeModuleEndpointContracts: {
    'supplier-statement': { path: '/supplier-statements' },
    'customer-statement': { path: '/customer-statements' },
  },
}))

vi.mock('@/api/module-contracts-master', () => ({
  masterModuleEndpointContracts: {
    material: { path: '/materials', supportsSearch: true },
    supplier: { path: '/suppliers' },
  },
}))

vi.mock('@/api/module-contracts-operations', () => ({
  operationModuleEndpointContracts: {
    'purchase-order': { path: '/purchase-orders' },
  },
}))

vi.mock('@/api/module-contracts-system', () => ({
  systemModuleEndpointContracts: {
    'general-setting': { path: '/general-settings' },
  },
}))

vi.mock('@/api/module-contracts-reports', () => ({
  reportModuleEndpointContracts: {
    'inventory-report': { path: '/inventory-report', readOnly: true },
  },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import { getModuleConfig } from './module-contracts'

describe('module-contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getModuleConfig', () => {
    it('returns config for material module', () => {
      const config = getModuleConfig('material')
      expect(config).toEqual({ path: '/materials', supportsSearch: true })
    })

    it('returns config for purchase-order module', () => {
      const config = getModuleConfig('purchase-order')
      expect(config).toEqual({ path: '/purchase-orders' })
    })

    it('returns config for supplier-statement module', () => {
      const config = getModuleConfig('supplier-statement')
      expect(config).toEqual({ path: '/supplier-statements' })
    })

    it('returns config for general-setting module', () => {
      const config = getModuleConfig('general-setting')
      expect(config).toEqual({ path: '/general-settings' })
    })

    it('returns config for inventory-report module', () => {
      const config = getModuleConfig('inventory-report')
      expect(config).toEqual({ path: '/inventory-report', readOnly: true })
    })

    it('throws for unknown module key', () => {
      expect(() => getModuleConfig('unknown-module')).toThrow(
        'moduleNotConfigured: unknown-module',
      )
    })
  })
})
