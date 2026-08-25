import { describe, expect, it } from 'vitest'
import { ENDPOINTS } from './endpoints'

describe('print endpoint contracts', () => {
  it('keeps print item queries under the print outputs resource', () => {
    expect(ENDPOINTS.PRINT_ITEMS).toBe(`${ENDPOINTS.PRINT_OUTPUTS}/items`)
  })
})
