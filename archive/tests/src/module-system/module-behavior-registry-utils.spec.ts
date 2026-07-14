import { describe, expect, it } from 'vitest'
import { collectUniqueSourceNos } from './module-behavior-registry-utils'

describe('collectUniqueSourceNos', () => {
  it('returns empty string for empty items', () => {
    expect(collectUniqueSourceNos([])).toBe('')
  })

  it('returns single source no', () => {
    const items = [{ sourceNo: 'CG001' }] as any[]
    expect(collectUniqueSourceNos(items)).toBe('CG001')
  })

  it('joins unique source nos with comma', () => {
    const items = [
      { sourceNo: 'CG001' },
      { sourceNo: 'CG002' },
      { sourceNo: 'CG001' },
    ] as any[]
    expect(collectUniqueSourceNos(items)).toBe('CG001, CG002')
  })

  it('filters out blank source nos', () => {
    const items = [
      { sourceNo: 'CG001' },
      { sourceNo: '' },
      { sourceNo: '  ' },
    ] as any[]
    expect(collectUniqueSourceNos(items)).toBe('CG001')
  })
})
