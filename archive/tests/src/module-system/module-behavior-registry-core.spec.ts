import { beforeEach, describe, expect, it } from 'vitest'
import {
  moduleBehaviorRegistry,
  registerModuleBehavior,
} from './module-behavior-registry-core'

beforeEach(() => {
  moduleBehaviorRegistry.clear()
})

describe('moduleBehaviorRegistry', () => {
  it('is a Map instance', () => {
    expect(moduleBehaviorRegistry).toBeInstanceOf(Map)
  })

  it('starts empty', () => {
    expect(moduleBehaviorRegistry.size).toBe(0)
  })
})

describe('registerModuleBehavior', () => {
  it('registers a new module behavior', () => {
    registerModuleBehavior('test-module', { supportsLineItems: true })
    expect(moduleBehaviorRegistry.has('test-module')).toBe(true)
    expect(moduleBehaviorRegistry.get('test-module')).toEqual({
      supportsLineItems: true,
    })
  })

  it('merges config for existing module', () => {
    registerModuleBehavior('test-module', { supportsLineItems: true })
    registerModuleBehavior('test-module', { defaultStatus: '草稿' })
    expect(moduleBehaviorRegistry.get('test-module')).toEqual({
      supportsLineItems: true,
      defaultStatus: '草稿',
    })
  })

  it('overwrites existing properties', () => {
    registerModuleBehavior('test-module', { defaultStatus: '草稿' })
    registerModuleBehavior('test-module', { defaultStatus: '已审核' })
    expect(moduleBehaviorRegistry.get('test-module')?.defaultStatus).toBe(
      '已审核',
    )
  })

  it('handles multiple modules independently', () => {
    registerModuleBehavior('module-a', { supportsLineItems: true })
    registerModuleBehavior('module-b', { computesAmounts: true })
    expect(moduleBehaviorRegistry.size).toBe(2)
    expect(moduleBehaviorRegistry.get('module-a')).toEqual({
      supportsLineItems: true,
    })
    expect(moduleBehaviorRegistry.get('module-b')).toEqual({
      computesAmounts: true,
    })
  })

  it('handles empty config', () => {
    registerModuleBehavior('test-module', {})
    expect(moduleBehaviorRegistry.has('test-module')).toBe(true)
    expect(moduleBehaviorRegistry.get('test-module')).toEqual({})
  })

  it('handles complex config objects', () => {
    const config = {
      actionKindsByKey: { generate_statement: 'openCreateEditor' },
      actionKindsByLabel: { 生成对账单: 'openCreateEditor' },
      permissionCodesByActionKey: { create: ['create', 'export'] },
    }
    registerModuleBehavior('test-module', config)
    expect(moduleBehaviorRegistry.get('test-module')).toEqual(config)
  })
})
