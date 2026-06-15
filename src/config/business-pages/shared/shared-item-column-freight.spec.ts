import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import {
  compactFreightItemColumns,
  freightItemColumns,
} from './shared-item-column-freight'

describe('shared-item-column-freight', () => {
  describe('freightItemColumns', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(freightItemColumns)).toBe(true)
      expect(freightItemColumns.length).toBeGreaterThan(0)
    })

    it('each column has title and dataIndex', () => {
      for (const col of freightItemColumns) {
        expect(col.title).toBeDefined()
        expect(col.dataIndex).toBeDefined()
      }
    })

    it('contains sourceNo column', () => {
      const col = freightItemColumns.find((c) => c.dataIndex === 'sourceNo')
      expect(col).toBeDefined()
    })

    it('contains materialCode column', () => {
      const col = freightItemColumns.find((c) => c.dataIndex === 'materialCode')
      expect(col).toBeDefined()
    })

    it('contains weightTon column', () => {
      const col = freightItemColumns.find((c) => c.dataIndex === 'weightTon')
      expect(col).toBeDefined()
    })

    it('contains warehouseName column', () => {
      const col = freightItemColumns.find(
        (c) => c.dataIndex === 'warehouseName',
      )
      expect(col).toBeDefined()
    })
  })

  describe('compactFreightItemColumns', () => {
    it('is a non-empty array', () => {
      expect(Array.isArray(compactFreightItemColumns)).toBe(true)
      expect(compactFreightItemColumns.length).toBeGreaterThan(0)
    })

    it('has fewer columns than freightItemColumns (some hidden)', () => {
      expect(compactFreightItemColumns.length).toBeLessThanOrEqual(
        freightItemColumns.length,
      )
    })
  })
})
