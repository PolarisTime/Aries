import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/normalizers', () => ({
  normalizeRecord: vi.fn((record: unknown) => record),
  normalizeRows: vi.fn((rows: unknown) => rows),
}))

import { normalizeRecord, normalizeRows } from './business-normalizers'

describe('business-normalizers', () => {
  it('re-exports normalizeRecord', () => {
    expect(typeof normalizeRecord).toBe('function')
    const input = { id: '1', name: 'test' }
    expect(normalizeRecord(input)).toEqual(input)
  })

  it('re-exports normalizeRows', () => {
    expect(typeof normalizeRows).toBe('function')
    const input = [{ id: '1' }]
    expect(normalizeRows(input)).toEqual(input)
  })
})
