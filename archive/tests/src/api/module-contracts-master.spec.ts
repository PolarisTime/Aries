import { describe, expect, it } from 'vitest'

import { masterModuleEndpointContracts } from './module-contracts-master'

describe('module-contracts-master', () => {
  it('exports master module contracts', () => {
    expect(masterModuleEndpointContracts).toBeDefined()
    expect(typeof masterModuleEndpointContracts).toBe('object')
  })

  it('contains material config with search support', () => {
    const config = masterModuleEndpointContracts.material
    expect(config).toBeDefined()
    expect(config.path).toBe('/materials')
    expect(config.supportsSearch).toBe(true)
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('category')
    expect(config.nativeFilterKeys).toContain('material')
  })

  it('contains supplier config', () => {
    const config = masterModuleEndpointContracts.supplier
    expect(config).toBeDefined()
    expect(config.path).toBe('/suppliers')
    expect(config.supportsSearch).toBe(false)
    expect(config.nativeFilterKeys).toContain('status')
  })

  it('contains customer config', () => {
    const config = masterModuleEndpointContracts.customer
    expect(config).toBeDefined()
    expect(config.path).toBe('/customers')
    expect(config.supportsSearch).toBe(false)
  })

  it('contains carrier config', () => {
    const config = masterModuleEndpointContracts.carrier
    expect(config).toBeDefined()
    expect(config.path).toBe('/carriers')
  })

  it('contains material-categories config', () => {
    const config = masterModuleEndpointContracts['material-categories']
    expect(config).toBeDefined()
    expect(config.path).toBe('/material-categories')
  })

  it('contains warehouse config', () => {
    const config = masterModuleEndpointContracts.warehouse
    expect(config).toBeDefined()
    expect(config.path).toBe('/warehouses')
    expect(config.nativeFilterKeys).toContain('warehouseType')
  })

  it('contains settlement company config', () => {
    const config = masterModuleEndpointContracts['company-setting']
    expect(config).toBeDefined()
    expect(config.path).toBe('/company-settings')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('status')
  })
})
