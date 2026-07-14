import { describe, expect, it } from 'vitest'
import { enUS } from './en-US'
import { zhCN } from './zh-CN'

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

function getValue(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce((o: unknown, k) => (o as Record<string, unknown>)?.[k], obj)
}

function _extractPlaceholders(s: string): string[] {
  return [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()
}

describe('zh-CN locale', () => {
  it('exports a non-null object', () => {
    expect(typeof zhCN).toBe('object')
    expect(zhCN).not.toBeNull()
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
      'print',
      'error',
      'navigation',
    ]
    for (const key of expected) {
      expect(zhCN).toHaveProperty(key)
    }
  })

  it('has no empty string values in leaf nodes', () => {
    const leaves = getLeaves(zhCN as Record<string, unknown>)
    for (const path of leaves) {
      const val = getValue(zhCN, path)
      expect(typeof val).toBe('string')
      expect((val as string).trim().length).toBeGreaterThan(0)
    }
  })

  it('has the same key structure as en-US', () => {
    const zhKeys = getLeaves(zhCN as Record<string, unknown>).sort()
    const enKeys = getLeaves(enUS as Record<string, unknown>).sort()
    expect(zhKeys).toEqual(enKeys)
  })

  it('has the same number of interpolation placeholders as en-US', () => {
    const leaves = getLeaves(zhCN as Record<string, unknown>)
    for (const path of leaves) {
      const zhVal = getValue(zhCN, path) as string
      const enVal = getValue(enUS, path) as string
      if (typeof zhVal === 'string' && typeof enVal === 'string') {
        const zhCount = (zhVal.match(/\{\{[^}]+\}\}/g) || []).length
        const enCount = (enVal.match(/\{\{[^}]+\}\}/g) || []).length
        expect(
          zhCount,
          `placeholder count mismatch at ${path}: zh="${zhVal}" en="${enVal}"`,
        ).toBe(enCount)
      }
    }
  })
})
