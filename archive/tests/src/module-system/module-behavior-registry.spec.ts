import { beforeEach, describe, expect, it } from 'vitest'
import {
  getBehaviorValue,
  hasBehavior,
  isDeleteBlockedByStatus,
  isEditBlockedByStatus,
} from './module-behavior-registry'
import { moduleBehaviorRegistry } from './module-behavior-registry-core'

function withRegistered(key: string, config: Record<string, any>) {
  moduleBehaviorRegistry.set(key, config as any)
}

beforeEach(() => {
  moduleBehaviorRegistry.clear()
})

describe('hasBehavior', () => {
  it('returns false for unregistered module', () => {
    expect(hasBehavior('unknown', 'supportsLineItems')).toBe(false)
  })

  it('returns false when flag is falsy', () => {
    withRegistered('test-module', { supportsLineItems: false })
    expect(hasBehavior('test-module', 'supportsLineItems')).toBe(false)
  })

  it('returns true when flag is truthy', () => {
    withRegistered('test-module', { supportsLineItems: true })
    expect(hasBehavior('test-module', 'supportsLineItems')).toBe(true)
  })
})

describe('getBehaviorValue', () => {
  it('returns undefined for unregistered module', () => {
    expect(getBehaviorValue('unknown', 'defaultStatus')).toBeUndefined()
  })

  it('returns the config value', () => {
    withRegistered('test-module', { defaultStatus: '草稿' })
    expect(getBehaviorValue('test-module', 'defaultStatus')).toBe('草稿')
  })
})

describe('isEditBlockedByStatus', () => {
  it('returns false for empty status', () => {
    expect(isEditBlockedByStatus('')).toBe(false)
  })

  it('returns false for non-blocked status', () => {
    expect(isEditBlockedByStatus('草稿')).toBe(false)
  })

  it('returns true for globally blocked status', () => {
    expect(isEditBlockedByStatus('已审核')).toBe(true)
  })

  it('opens partial editing during delivery verification', () => {
    withRegistered('sales-order', {
      partiallyEditableStatuses: ['交付核定'],
    })
    expect(isEditBlockedByStatus('交付核定', 'sales-order')).toBe(false)
    expect(isEditBlockedByStatus('完成销售', 'sales-order')).toBe(true)
  })

  it('returns true for per-module blocked status', () => {
    withRegistered('test-module', { protectedEditStatuses: ['已关闭'] })
    expect(isEditBlockedByStatus('已关闭', 'test-module')).toBe(true)
  })

  it('returns false for non-blocked per-module status', () => {
    withRegistered('test-module', { protectedEditStatuses: ['已关闭'] })
    expect(isEditBlockedByStatus('草稿', 'test-module')).toBe(false)
  })

  it('falls back to global edit statuses when module has no override', () => {
    withRegistered('test-module', {})
    expect(isEditBlockedByStatus('已审核', 'test-module')).toBe(true)
  })

  it('returns false for undefined status', () => {
    expect(isEditBlockedByStatus(undefined)).toBe(false)
  })

  it('returns false for null status', () => {
    expect(isEditBlockedByStatus(null)).toBe(false)
  })

  it('returns false for whitespace-only status', () => {
    expect(isEditBlockedByStatus('   ')).toBe(false)
  })
})

describe('isDeleteBlockedByStatus', () => {
  it('returns false for empty status', () => {
    expect(isDeleteBlockedByStatus('')).toBe(false)
  })

  it('returns false for non-blocked status', () => {
    expect(isDeleteBlockedByStatus('草稿')).toBe(false)
  })

  it('returns true for globally blocked status', () => {
    expect(isDeleteBlockedByStatus('已审核')).toBe(true)
  })

  it('returns true for per-module blocked status', () => {
    withRegistered('test-module', { protectedDeleteStatuses: ['已关闭'] })
    expect(isDeleteBlockedByStatus('已关闭', 'test-module')).toBe(true)
  })

  it('returns false for non-blocked per-module status', () => {
    withRegistered('test-module', { protectedDeleteStatuses: ['已关闭'] })
    expect(isDeleteBlockedByStatus('草稿', 'test-module')).toBe(false)
  })

  it('falls back to global delete statuses when module has no override', () => {
    withRegistered('test-module', {})
    expect(isDeleteBlockedByStatus('已审核', 'test-module')).toBe(true)
  })

  it('returns false for undefined status', () => {
    expect(isDeleteBlockedByStatus(undefined)).toBe(false)
  })

  it('returns false for null status', () => {
    expect(isDeleteBlockedByStatus(null)).toBe(false)
  })

  it('returns false for whitespace-only status', () => {
    expect(isDeleteBlockedByStatus('   ')).toBe(false)
  })
})
