import { describe, expect, it } from 'vitest'
import { reorderPrintItemIds } from '@/views/modules/components/print-job-modal-utils'

describe('print-job-modal-utils', () => {
  describe('reorderPrintItemIds', () => {
    it('returns the original empty array when no ids can be matched', () => {
      const order: string[] = []

      const result = reorderPrintItemIds(order, 'active', 'over')

      expect(result).toBe(order)
      expect(result).toEqual([])
    })

    it('returns the original array when activeId is missing', () => {
      const order = ['first', 'second', 'third']

      const result = reorderPrintItemIds(order, 'missing', 'second')

      expect(result).toBe(order)
      expect(result).toEqual(['first', 'second', 'third'])
    })

    it('returns the original array when overId is missing', () => {
      const order = ['first', 'second', 'third']

      const result = reorderPrintItemIds(order, 'second', 'missing')

      expect(result).toBe(order)
      expect(result).toEqual(['first', 'second', 'third'])
    })

    it('returns the original array when activeId and overId resolve to the same position', () => {
      const order = ['first', 'second', 'third']

      const result = reorderPrintItemIds(order, 'second', 'second')

      expect(result).toBe(order)
      expect(result).toEqual(['first', 'second', 'third'])
    })

    it('moves an item to a later index with a new order array', () => {
      const order = ['first', 'second', 'third', 'fourth']

      const result = reorderPrintItemIds(order, 'first', 'third')

      expect(result).not.toBe(order)
      expect(result).toEqual(['second', 'third', 'first', 'fourth'])
      expect(order).toEqual(['first', 'second', 'third', 'fourth'])
    })

    it('moves an item to an earlier index with a new order array', () => {
      const order = ['first', 'second', 'third', 'fourth']

      const result = reorderPrintItemIds(order, 'fourth', 'second')

      expect(result).not.toBe(order)
      expect(result).toEqual(['first', 'fourth', 'second', 'third'])
      expect(order).toEqual(['first', 'second', 'third', 'fourth'])
    })
  })
})
