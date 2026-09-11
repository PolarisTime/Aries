import { describe, expect, it } from 'vitest'
import { ENDPOINTS } from './endpoints'

describe('print endpoint contracts', () => {
  it('exposes resource endpoints for print export and preview items', () => {
    expect(ENDPOINTS.PRINT_EXPORTS).toBe('/print-exports')
    expect(ENDPOINTS.PRINT_PREVIEWS_ITEMS).toBe('/print-previews/items')
  })
})
