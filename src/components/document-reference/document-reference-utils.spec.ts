import { describe, expect, it } from 'vitest'
import {
  formatDocumentReferenceText,
  isListDocumentReferenceField,
  normalizeDocumentReferences,
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

describe('formatDocumentReferenceText（单据引用显示的唯一文本出口）', () => {
  it('兼容逗号文本、单号数组与后端对象数组，多单号按顺序用 ", " 连接', () => {
    expect(formatDocumentReferenceText(' SO-001,SO-002， SO-001 ')).toBe(
      'SO-001, SO-002',
    )
    expect(formatDocumentReferenceText(['PO-1', 'PO-2'])).toBe('PO-1, PO-2')
    expect(
      formatDocumentReferenceText([
        { orderNo: 'PO-1', id: '1' },
        { documentNo: 'PO-2', totalAmount: 1200, status: '已审核' },
      ]),
    ).toBe('PO-1, PO-2')
  })

  it('单号本身原样输出，不做摘要改写（不再出现「已关联 N 笔」）', () => {
    expect(formatDocumentReferenceText('SO-001')).toBe('SO-001')
    expect(formatDocumentReferenceText({ documentNo: 'SK-001', id: '9' })).toBe(
      'SK-001',
    )
    expect(formatDocumentReferenceText('SO-001')).not.toContain('已关联')
  })

  it('空值统一返回空串：回退成 - 还是留空由调用方决定', () => {
    expect(formatDocumentReferenceText(null)).toBe('')
    expect(formatDocumentReferenceText(undefined)).toBe('')
    expect(formatDocumentReferenceText('')).toBe('')
    expect(formatDocumentReferenceText([])).toBe('')
    expect(formatDocumentReferenceText(' ,， ')).toBe('')
  })

  it('不会把对象渲染成 [object Object]，也不会出现 undefined 字面量', () => {
    const text = formatDocumentReferenceText({
      documentNo: 'SK-002',
      id: '1234567890123456789',
    })
    expect(text).toBe('SK-002')
    expect(text).not.toContain('[object Object]')
    expect(text).not.toContain('undefined')
  })
})

describe('isListDocumentReferenceField', () => {
  it('列表主单号与跨单据字段用同一套纯文本口径，仍按字段区分', () => {
    expect(isListDocumentReferenceField('orderNo', 'orderNo')).toBe(false)
    expect(isListDocumentReferenceField('purchaseOrderNo', 'orderNo')).toBe(
      true,
    )
  })
})
