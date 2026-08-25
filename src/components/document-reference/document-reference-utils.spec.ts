import { describe, expect, it } from 'vitest'
import {
  buildDocumentReferenceSummary,
  normalizeDocumentReferences,
  resolveDocumentReferenceModule,
} from '@/components/document-reference/document-reference-utils'

describe('normalizeDocumentReferences', () => {
  it('兼容中英文逗号文本并去重，保留原始顺序', () => {
    expect(normalizeDocumentReferences(' SO-001,SO-002， SO-001 ')).toEqual([
      { no: 'SO-001' },
      { no: 'SO-002' },
    ])
  })

  it('兼容单号数组与完整对象数组，并保留业务摘要', () => {
    expect(
      normalizeDocumentReferences([
        'PO-001, PO-002',
        { orderNo: 'PO-002', id: '2', supplierName: '供应商A' },
        { documentNo: 'PO-003', totalAmount: 1200, status: '已审核' },
      ]),
    ).toEqual([
      { no: 'PO-001' },
      { no: 'PO-002', id: '2', counterpartyName: '供应商A' },
      { no: 'PO-003', amount: 1200, status: '已审核' },
    ])
  })

  it('空值、空数组和空字符串统一为空集合', () => {
    expect(normalizeDocumentReferences(null)).toEqual([])
    expect(normalizeDocumentReferences([])).toEqual([])
    expect(normalizeDocumentReferences(' ,， ')).toEqual([])
  })
})

describe('buildDocumentReferenceSummary', () => {
  it('单笔显示完整单号，多笔显示关联数量摘要', () => {
    expect(buildDocumentReferenceSummary([])).toEqual('-')
    expect(buildDocumentReferenceSummary([{ no: 'SO-001' }])).toBe('SO-001')
    expect(
      buildDocumentReferenceSummary([{ no: 'SO-001' }, { no: 'SO-002' }]),
    ).toBe('已关联 2 笔单据')
  })
})

describe('resolveDocumentReferenceModule', () => {
  it('按关联字段解析目标业务模块', () => {
    expect(resolveDocumentReferenceModule('purchaseOrderNo')).toBe(
      'purchase-order',
    )
    expect(resolveDocumentReferenceModule('salesOrderNo')).toBe('sales-order')
    expect(resolveDocumentReferenceModule('sourceBillNos')).toBe('freight-bill')
    expect(
      resolveDocumentReferenceModule('sourceNo', 'freight-statement'),
    ).toBe('freight-bill')
    expect(resolveDocumentReferenceModule('sourceNo', 'sales-outbound')).toBe(
      'sales-order',
    )
    expect(resolveDocumentReferenceModule('unknown')).toBeUndefined()
  })
})
