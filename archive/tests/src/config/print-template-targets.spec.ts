import { describe, expect, it, vi } from 'vitest'

vi.mock('@/config/module-page-meta', () => ({
  modulePageMetaMap: {
    'purchase-order': { key: 'purchase-order', title: '采购订单' },
    'sales-order': { key: 'sales-order', title: '销售订单' },
    'nonexistent-key': undefined,
  },
}))

import {
  printTemplateTargetMap,
  printTemplateTargetOptions,
} from './print-template-targets'

describe('print-template-targets', () => {
  describe('printTemplateTargetOptions', () => {
    it('is an array', () => {
      expect(Array.isArray(printTemplateTargetOptions)).toBe(true)
    })

    it('contains items with value and label', () => {
      for (const item of printTemplateTargetOptions) {
        expect(item).toHaveProperty('value')
        expect(item).toHaveProperty('label')
        expect(typeof item.value).toBe('string')
        expect(typeof item.label).toBe('string')
      }
    })

    it('includes known module keys that exist in meta map', () => {
      const values = printTemplateTargetOptions.map((o) => o.value)
      expect(values).toContain('purchase-order')
      expect(values).toContain('sales-order')
    })

    it('skips keys not present in modulePageMetaMap', () => {
      const values = printTemplateTargetOptions.map((o) => o.value)
      expect(values).not.toContain('nonexistent-key')
    })
  })

  describe('printTemplateTargetMap', () => {
    it('maps value to label', () => {
      expect(printTemplateTargetMap['purchase-order']).toBe('采购订单')
      expect(printTemplateTargetMap['sales-order']).toBe('销售订单')
    })
  })
})
