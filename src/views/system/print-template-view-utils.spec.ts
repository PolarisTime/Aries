import { describe, expect, it, vi } from 'vitest'

import {
  buildPrintTemplateCopyName,
  getPrintTemplateBillTypeLabel,
} from '@/views/system/print-template-view-utils'

vi.mock('@/config/print-template-targets', () => ({
  printTemplateTargetMap: {
    PURCHASE_ORDER: '采购订单',
    SALES_ORDER: '销售订单',
  },
}))

describe('print-template-view-utils', () => {
  describe('getPrintTemplateBillTypeLabel', () => {
    it('returns mapped label for known value', () => {
      expect(getPrintTemplateBillTypeLabel('PURCHASE_ORDER')).toBe('采购订单')
    })

    it('returns the value itself for unknown value', () => {
      expect(getPrintTemplateBillTypeLabel('UNKNOWN')).toBe('UNKNOWN')
    })

    it('returns "--" for empty value', () => {
      expect(getPrintTemplateBillTypeLabel('')).toBe('--')
    })

    it('returns "--" for undefined', () => {
      expect(getPrintTemplateBillTypeLabel(undefined)).toBe('--')
    })
  })

  describe('buildPrintTemplateCopyName', () => {
    it('appends copy suffix to template name', () => {
      const result = buildPrintTemplateCopyName({
        id: '1',
        templateName: '采购订单模板',
        billType: 'PURCHASE_ORDER',
        status: '正常',
      } as never)
      expect(result).toContain('采购订单模板')
    })

    it('returns a non-empty string', () => {
      const result = buildPrintTemplateCopyName({
        templateName: 'Test',
      } as never)
      expect(result.length).toBeGreaterThan(0)
    })
  })
})
