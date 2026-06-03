import { describe, it, expect } from 'vitest'
import {
  printTemplateRecordSchema,
  savePrintTemplatePayloadSchema,
} from './print-template'

describe('print-template schemas', () => {
  describe('printTemplateRecordSchema', () => {
    it('should validate valid template record', () => {
      const data = {
        id: '1',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        templateType: 'HTML',
        source: 'db',
        fileName: 'template.html',
        billType: 'purchase',
        createTime: '2024-01-01',
        updateTime: '2024-01-02',
      }
      const result = printTemplateRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require id, templateName, templateHtml', () => {
      const data = { id: '1' }
      const result = printTemplateRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional fields', () => {
      const data = {
        id: '1',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
      }
      const result = printTemplateRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate source enum', () => {
      const data = {
        id: '1',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        source: 'file',
      }
      const result = printTemplateRecordSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid source', () => {
      const data = {
        id: '1',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        source: 'invalid',
      }
      const result = printTemplateRecordSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('savePrintTemplatePayloadSchema', () => {
    it('should validate valid payload', () => {
      const data = {
        billType: 'purchase',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        templateType: 'HTML',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should require billType, templateName, templateHtml', () => {
      const data = { billType: 'purchase' }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should allow optional id and templateType', () => {
      const data = {
        id: '1',
        billType: 'purchase',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        templateType: 'COORD',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should validate templateType enum', () => {
      const data = {
        billType: 'purchase',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        templateType: 'PDF_FORM',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject invalid templateType', () => {
      const data = {
        billType: 'purchase',
        templateName: '模板1',
        templateHtml: '<div>模板</div>',
        templateType: 'INVALID',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should reject empty templateName', () => {
      const data = {
        billType: 'purchase',
        templateName: '',
        templateHtml: '<div>模板</div>',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })
})