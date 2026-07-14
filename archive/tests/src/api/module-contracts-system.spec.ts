import { describe, expect, it } from 'vitest'

import { systemModuleEndpointContracts } from './module-contracts-system'

describe('module-contracts-system', () => {
  it('exports system module contracts', () => {
    expect(systemModuleEndpointContracts).toBeDefined()
    expect(typeof systemModuleEndpointContracts).toBe('object')
  })

  it('contains general-setting config', () => {
    const config = systemModuleEndpointContracts['general-setting']
    expect(config).toBeDefined()
    expect(config.path).toBe('/general-settings')
    expect(config.nativeFilterKeys).toContain('keyword')
    expect(config.nativeFilterKeys).toContain('status')
  })

  it('contains operation-log config as read-only', () => {
    const config = systemModuleEndpointContracts['operation-log']
    expect(config).toBeDefined()
    expect(config.path).toBe('/operation-logs')
    expect(config.readOnly).toBe(true)
    expect(config.nativeFilterKeys).toContain('moduleName')
    expect(config.nativeFilterKeys).toContain('actionType')
    expect(config.nativeFilterKeys).toContain('authType')
    expect(config.nativeFilterKeys).toContain('resultStatus')
    expect(config.nativeFilterKeys).toContain('startTime')
    expect(config.nativeFilterKeys).toContain('endTime')
    expect(config.nativeFilterKeys).toContain('recordId')
    expect(config.dateRangeMapping?.operationTime.startKey).toBe('startTime')
    expect(config.dateRangeMapping?.operationTime.endKey).toBe('endTime')
  })

  it('contains permission config as read-only', () => {
    const config = systemModuleEndpointContracts.permission
    expect(config).toBeDefined()
    expect(config.path).toBe('/permissions')
    expect(config.readOnly).toBe(true)
    expect(config.nativeFilterKeys).toContain('keyword')
  })

  it('contains department config', () => {
    const config = systemModuleEndpointContracts.department
    expect(config).toBeDefined()
    expect(config.path).toBe('/departments')
    expect(config.readOnly).toBeUndefined()
  })

  it('contains departments config (alias)', () => {
    const config = systemModuleEndpointContracts.departments
    expect(config).toBeDefined()
    expect(config.path).toBe('/departments')
  })

  it('does not contain settlement company contract', () => {
    expect(systemModuleEndpointContracts['company-setting']).toBeUndefined()
  })
})
