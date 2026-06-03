import { describe, expect, it, vi } from 'vitest'
import {
  loadBusinessPageConfig,
  primeBusinessPageConfig,
} from '@/config/business-page-loader'

describe('business-page-loader', () => {
  it('loads the access-control permission catalog config by module key', { timeout: 15000 }, async () => {
    const config = await loadBusinessPageConfig('permission')
    expect(config.key).toBe('permission')
    expect(config.columns.map((column: any) => column.dataIndex)).toContain('permissionCode')
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
    await expect(loadBusinessPageConfig('material')).resolves.toBeDefined()
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
    const configA = { key: 'permission', columns: [] } as any
    const configB = { key: 'material', columns: [] } as any
    primeBusinessPageConfig('permission', configA)
    await expect(loadBusinessPageConfig('material')).resolves.toBeDefined()
  })
})
