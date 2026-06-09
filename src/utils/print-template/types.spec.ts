import { describe, expect, it } from 'vitest'
import type { PrintDataRow, RenderResult } from './types'

describe('print-template types', () => {
  describe('PrintDataRow', () => {
    it('accepts an object with string keys and string values', () => {
      const row: PrintDataRow = {
        name: 'John',
        age: '30',
        city: 'Beijing',
      }
      expect(row.name).toBe('John')
      expect(row.age).toBe('30')
      expect(row.city).toBe('Beijing')
    })

    it('accepts an empty object', () => {
      const row: PrintDataRow = {}
      expect(row).toBeDefined()
    })
  })

  describe('RenderResult', () => {
    it('accepts COORD type with script', () => {
      const result: RenderResult = {
        type: 'COORD',
        script: 'console.log("test")',
      }
      expect(result.type).toBe('COORD')
      expect(result.script).toBe('console.log("test")')
    })

    it('allows optional script field', () => {
      const result: RenderResult = {
        type: 'COORD',
      }
      expect(result.script).toBeUndefined()
    })
  })
})
