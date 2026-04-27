import {
  allowedPrintTemplateTargetKeys,
  printTemplateTargetMap,
  printTemplateTargetOptions,
} from '@/config/print-template-targets'

describe('print-template-targets', () => {
  it('only exposes bill types supported by the backend print template service', () => {
    expect(printTemplateTargetOptions.map((item) => item.value)).toEqual([...allowedPrintTemplateTargetKeys])
    expect(printTemplateTargetMap['purchase-orders']).toBe('采购订单')
    expect(printTemplateTargetMap['invoice-receipts']).toBe('收票单')
    expect(printTemplateTargetMap['invoice-issues']).toBe('开票单')
    expect(printTemplateTargetMap['permission-management']).toBeUndefined()
    expect(printTemplateTargetMap['print-templates']).toBeUndefined()
    expect(printTemplateTargetMap['api-keys']).toBeUndefined()
    expect(printTemplateTargetMap['session-management']).toBeUndefined()
  })
})
