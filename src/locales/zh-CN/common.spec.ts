import { describe, expect, it } from 'vitest'
import common from './common.json'

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

describe('zh-CN/common.json', () => {
  it('exports a non-null object', () => {
    expect(typeof common).toBe('object')
    expect(common).not.toBeNull()
  })

  it('has expected top-level keys', () => {
    expect(common).toHaveProperty('button')
    expect(common).toHaveProperty('status')
    expect(common).toHaveProperty('label')
    expect(common).toHaveProperty('message')
  })

  it('has all button labels as non-empty strings', () => {
    for (const [key, val] of Object.entries(common.button)) {
      expect(typeof val, `button.${key}`).toBe('string')
      expect((val as string).trim().length, `button.${key}`).toBeGreaterThan(0)
    }
  })

  it('has all status labels as non-empty strings', () => {
    for (const [key, val] of Object.entries(common.status)) {
      expect(typeof val, `status.${key}`).toBe('string')
      expect((val as string).trim().length, `status.${key}`).toBeGreaterThan(0)
    }
  })

  it('has no empty string values in leaf nodes', () => {
    const leaves = getLeaves(common as Record<string, unknown>)
    for (const path of leaves) {
      const val = path.split('.').reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], common)
      expect(typeof val).toBe('string')
      expect((val as string).trim().length).toBeGreaterThan(0)
    }
  })

  it('contains interpolation placeholders in label.total', () => {
    expect(common.label.total).toContain('{{count}}')
  })
})
