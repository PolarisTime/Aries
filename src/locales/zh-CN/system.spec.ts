import { describe, expect, it } from 'vitest'
import system from './system.json'

function getLeaves(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'object' && v !== null) {
      keys.push(...getLeaves(v as Record<string, unknown>, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

describe('zh-CN/system.json', () => {
  it('exports a non-null object', () => {
    expect(typeof system).toBe('object')
    expect(system).not.toBeNull()
  })

  it('has expected top-level keys', () => {
    expect(system).toHaveProperty('userAccount')
    expect(system).toHaveProperty('apiKey')
    expect(system).toHaveProperty('session')
    expect(system).toHaveProperty('generalSettings')
    expect(system).toHaveProperty('numberRules')
    expect(system).toHaveProperty('printTemplate')
    expect(system).toHaveProperty('company')
    expect(system).toHaveProperty('database')
    expect(system).toHaveProperty('role')
    expect(system).toHaveProperty('twoFactor')
    expect(system).toHaveProperty('securityKey')
  })

  it('has no empty string values in leaf nodes', () => {
    const leaves = getLeaves(system as Record<string, unknown>)
    for (const path of leaves) {
      const val = path.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], system)
      expect(typeof val).toBe('string')
      expect((val as string).trim().length).toBeGreaterThan(0)
    }
  })

  it('has userAccount section with required fields', () => {
    expect(system.userAccount).toHaveProperty('title')
    expect(system.userAccount).toHaveProperty('searchPlaceholder')
    expect(system.userAccount).toHaveProperty('createButton')
    expect(system.userAccount).toHaveProperty('loginName')
    expect(system.userAccount).toHaveProperty('userName')
  })

  it('has session section with required fields', () => {
    expect(system.session).toHaveProperty('title')
    expect(system.session).toHaveProperty('searchPlaceholder')
    expect(system.session).toHaveProperty('revokeAll')
  })

  it('has twoFactor section with required fields', () => {
    expect(system.twoFactor).toHaveProperty('title')
    expect(system.twoFactor).toHaveProperty('enabled')
    expect(system.twoFactor).toHaveProperty('notEnabled')
    expect(system.twoFactor).toHaveProperty('generateQr')
    expect(system.twoFactor).toHaveProperty('disable')
  })
})
