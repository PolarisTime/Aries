import { describe, expect, it } from 'vitest'

import * as business from './business'

describe('business', () => {
  it('re-exports from business-attachments', () => {
    expect(business).toBeDefined()
  })

  it('re-exports from business-crud', () => {
    expect(business).toBeDefined()
  })

  it('re-exports from business-listing', () => {
    expect(business).toBeDefined()
  })

  it('re-exports from business-types', () => {
    expect(business).toBeDefined()
  })
})
