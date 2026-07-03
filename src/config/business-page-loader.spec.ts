import { describe, expect, it } from 'vitest'
import {
  loadBusinessPageConfig,
  primeBusinessPageConfig,
} from '@/config/business-page-loader'

describe('business-page-loader', () => {
  const moduleKeys = [
    'material',
    'material-categories',
    'supplier',
    'customer',
    'carrier',
    'warehouse',
    'purchase-order',
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'freight-bill',
    'purchase-contract',
    'sales-contract',
    'supplier-statement',
    'customer-statement',
    'freight-statement',
    'receipt',
    'payment',
    'ledger-adjustment',
    'invoice-receipt',
    'invoice-issue',
    'receivable-payable',
    'inventory-report',
    'io-report',
    'pending-invoice-receipt-report',
    'general-setting',
    'company-setting',
    'operation-log',
    'department',
    'permission',
  ]

  it.each(moduleKeys)('loads %s config by module key', async (moduleKey) => {
    const config = await loadBusinessPageConfig(moduleKey)

    expect(config.key).toBe(moduleKey)
  })

  it('loads the access-control permission catalog config by module key', {
    timeout: 15000,
  }, async () => {
    const config = await loadBusinessPageConfig('permission')
    expect(config.key).toBe('permission')
    expect(config.columns.map((column: any) => column.dataIndex)).toContain(
      'permissionCode',
    )
  })

  it('throws for unknown module key', async () => {
    await expect(loadBusinessPageConfig('nonexistent')).rejects.toThrow(
      'Unknown module key: nonexistent',
    )
  })

  it('caches loaded config and returns cached on second call', async () => {
    const config1 = await loadBusinessPageConfig('permission')
    const config2 = await loadBusinessPageConfig('permission')
    expect(config1).toBe(config2)
  })

  it('throws when config not found in loaded module', async () => {
    await expect(
      loadBusinessPageConfig('system-permission-management'),
    ).rejects.toThrow('Module config not found: system-permission-management')
  })

  it('primeBusinessPageConfig sets cache', async () => {
    const config = { key: 'test-key', columns: [] } as any
    primeBusinessPageConfig('test-key', config)
    const loaded = await loadBusinessPageConfig('test-key')
    expect(loaded).toBe(config)
  })

  it('primeBusinessPageConfig ignores key mismatch', async () => {
    const config = { key: 'other-key' } as any
    primeBusinessPageConfig('test-key', config)
    expect(config.key).toBe('other-key')
  })

  it('handles cached config with different key (cached.key !== moduleKey)', async () => {
    const mismatchedConfig = { key: 'permission', columns: [] } as any
    primeBusinessPageConfig('permission', mismatchedConfig)
    mismatchedConfig.key = 'other-key'

    const loaded = await loadBusinessPageConfig('permission')

    expect(loaded.key).toBe('permission')
    expect(loaded).not.toBe(mismatchedConfig)
  })
})
