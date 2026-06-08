import { describe, expect, it } from 'vitest'
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
        templateCode: 'TPL_1',
        templateHtml: '<div>模板</div>',
        templateType: 'HTML',
        engine: 'BROWSER_HTML',
        assetRef: null,
        versionNo: 1,
        status: 'ACTIVE',
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
        templateHtml: '',
        templateType: 'PDF_FORM',
        assetRef: 'print-forms/yingjie-a4-remark.pdf',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(true)
    })

    it('should reject PDF_FORM without assetRef', () => {
      const data = {
        billType: 'purchase',
        templateName: '模板1',
        templateHtml: '',
        templateType: 'PDF_FORM',
      }
      const result = savePrintTemplatePayloadSchema.safeParse(data)
      expect(result.success).toBe(false)
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
