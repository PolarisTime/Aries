import { describe, expect, it } from 'vitest'
import { enUS } from './en-US'

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

function extractPlaceholders(s: string): string[] {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
}

describe('en-US locale', () => {
  it('exports a non-null object', () => {
    expect(typeof enUS).toBe('object')
    expect(enUS).not.toBeNull()
  })

  it('has all expected top-level keys', () => {
    const expected = [
      'errorBoundary',
      'result',
      'toolbar',
      'validation',
      'dashboard',
      'common',
      'auth',
      'table',
      'attachment',
      'api',
      'modules',
      'hooks',
      'layouts',
      'system',
      'finance',
      'print',
      'error',
      'navigation',
    ]
    for (const key of expected) {
      expect(enUS).toHaveProperty(key)
    }
  })

  it('has all leaf values as non-empty strings (except known unit suffixes)', () => {
    const allowedEmpty = new Set([
      'modules.statement.documentCountUnit',
      'system.companySubject.unitSuffix',
    ])
    const leaves = getLeaves(enUS as Record<string, unknown>)
    for (const path of leaves) {
      const val = path
        .split('.')
        .reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], enUS)
      expect(typeof val, `${path} should be a string`).toBe('string')
      if (!allowedEmpty.has(path)) {
        expect(
          (val as string).trim().length,
          `${path} should not be empty`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('has consistent interpolation placeholders in nested structures', () => {
    const leaves = getLeaves(enUS as Record<string, unknown>)
    const placeholderPaths = leaves.filter((p) => {
      const val = p
        .split('.')
        .reduce(
          (o: unknown, k) => (o as Record<string, unknown>)?.[k],
          enUS,
        ) as string
      return val.includes('{{')
    })
    expect(placeholderPaths.length).toBeGreaterThan(0)
    for (const path of placeholderPaths) {
      const val = path
        .split('.')
        .reduce(
          (o: unknown, k) => (o as Record<string, unknown>)?.[k],
          enUS,
        ) as string
      const placeholders = extractPlaceholders(val)
      expect(placeholders.length).toBeGreaterThan(0)
      for (const ph of placeholders) {
        expect(ph).toMatch(/^\w+$/)
      }
    }
  })
})
