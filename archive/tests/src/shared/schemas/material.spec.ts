import { describe, expect, it } from 'vitest'
import { materialImportResultSchema } from './material'

describe('material schemas', () => {
  describe('materialImportResultSchema', () => {
    it('should validate valid import result', () => {
      const data = {
        totalRows: 10,
        successCount: 8,
        createdCount: 5,
        updatedCount: 3,
        failedCount: 2,
        failures: [
          { rowNumber: 1, materialCode: 'M001', reason: 'Invalid' },
          { rowNumber: 2, materialCode: 'M002', reason: 'Missing' },
        ],
      }
      const result = materialImportResultSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should allow empty failures array', () => {
      const data = {
        totalRows: 0,
        successCount: 0,
        createdCount: 0,
        updatedCount: 0,
        failedCount: 0,
        failures: [],
      }
      const result = materialImportResultSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require all count fields', () => {
      const data = { totalRows: 10, failures: [] }
      const result = materialImportResultSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate failure object structure', () => {
      const data = {
        totalRows: 1,
        successCount: 0,
        createdCount: 0,
        updatedCount: 0,
        failedCount: 1,
        failures: [{ rowNumber: 1, materialCode: 'M001', reason: 'Error' }],
      }
      const result = materialImportResultSchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })
})
