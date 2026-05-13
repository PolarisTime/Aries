import { describe, expect, it } from 'vitest'
import { computeTableBodyScrollY } from '@/views/modules/components/BusinessGridTable'

describe('computeTableBodyScrollY', () => {
  it('should reserve space for table header and pagination', () => {
    expect(computeTableBodyScrollY(600, 48, 56)).toBe(488)
  })

  it('should keep a safe minimum height for small containers', () => {
    expect(computeTableBodyScrollY(220, 48, 56)).toBe(240)
  })
})
