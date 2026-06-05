import { describe, expect, it } from 'vitest'

import {
  FULL_SCAN_PAGE_SIZE,
  MAX_CLIENT_FILTER_ROWS,
  SOFT_WARN_ROW_THRESHOLD,
} from './business-listing-constants'

describe('business-listing-constants', () => {
  it('exports FULL_SCAN_PAGE_SIZE as 200', () => {
    expect(FULL_SCAN_PAGE_SIZE).toBe(200)
  })

  it('exports MAX_CLIENT_FILTER_ROWS as 2000', () => {
    expect(MAX_CLIENT_FILTER_ROWS).toBe(200 * 10)
  })

  it('exports SOFT_WARN_ROW_THRESHOLD as 5000', () => {
    expect(SOFT_WARN_ROW_THRESHOLD).toBe(5000)
  })
})
