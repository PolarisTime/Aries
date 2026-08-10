import { describe, expect, it } from 'vitest'
import { DISPLAY_WEIGHT_PRECISION, INTERNAL_WEIGHT_PRECISION } from '@/constants/precision'

describe('precision 常量', () => {
  it('内部重量精度为 8', () => {
    expect(INTERNAL_WEIGHT_PRECISION).toBe(8)
  })

  it('展示重量精度为 3', () => {
    expect(DISPLAY_WEIGHT_PRECISION).toBe(3)
  })

  it('内部精度不亚于展示精度', () => {
    expect(INTERNAL_WEIGHT_PRECISION).toBeGreaterThanOrEqual(DISPLAY_WEIGHT_PRECISION)
  })
})
