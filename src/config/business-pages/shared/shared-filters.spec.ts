import { describe, expect, it } from 'vitest'
import { masterStatusFilter } from './shared-filters'

describe('masterStatusFilter', () => {
  it('has correct filter structure', () => {
    expect(masterStatusFilter.key).toBe('status')
    expect(masterStatusFilter.label).toBeTruthy()
    expect(masterStatusFilter.type).toBe('select')
    expect(Array.isArray(masterStatusFilter.options)).toBe(true)
    expect(masterStatusFilter.options).toHaveLength(2)
  })
})
