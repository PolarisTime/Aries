import { describe, expect, it } from 'vitest'
import {
  FINANCE_DOCUMENT_MODULE_KEYS,
  financeDocumentRecordSchema,
  isFinanceDocumentModuleKey,
  normalizeFinanceDocumentRecord,
  readFinanceDocumentVersion,
} from './finance-document-record'

describe('financeDocumentRecordSchema（付款单/收款单 version 契约）', () => {
  it('version 为十进制字符串时原样保留', () => {
    const parsed = financeDocumentRecordSchema.parse({
      paymentNo: 'PAY-1',
      version: '42',
    })
    expect(parsed.version).toBe('42')
    expect(parsed.paymentNo).toBe('PAY-1')
  })

  it('version 为 number 时归一化成十进制字符串（兼容旧后端/非字符串序列化）', () => {
    expect(financeDocumentRecordSchema.parse({ version: 7 }).version).toBe('7')
    expect(
      financeDocumentRecordSchema.parse({ version: 1234567890 }).version,
    ).toBe('1234567890')
    // 两侧空白同样被裁剪（与请求头层的规范化口径一致）
    expect(financeDocumentRecordSchema.parse({ version: ' 12 ' }).version).toBe(
      '12',
    )
  })

  it('旧响应缺 version / null / 空串时视为无版本', () => {
    expect(financeDocumentRecordSchema.parse({}).version).toBeUndefined()
    expect(
      financeDocumentRecordSchema.parse({ version: null }).version,
    ).toBeUndefined()
    expect(financeDocumentRecordSchema.parse({ version: '' }).version).toBe(
      undefined,
    )
  })

  it('非法版本（负数/小数/非数字/布尔）不产生可发送的版本值', () => {
    for (const version of ['-1', '1.5', 'abc', true]) {
      expect(
        financeDocumentRecordSchema.parse({ version }).version,
        `version=${String(version)}`,
      ).toBeUndefined()
    }
  })

  it('保留后端下发的其它字段（不做白名单裁剪）', () => {
    const parsed = financeDocumentRecordSchema.parse({
      id: '9001',
      paymentNo: 'PAY-1',
      amount: 100,
      version: '3',
    })
    expect(parsed).toMatchObject({
      id: '9001',
      paymentNo: 'PAY-1',
      amount: 100,
      version: '3',
    })
  })
})

describe('normalizeFinanceDocumentRecord', () => {
  it('返回带十进制字符串 version 的记录，且不改动入参', () => {
    const source = { id: '9001', paymentNo: 'PAY-1', version: 7 }
    const normalized = normalizeFinanceDocumentRecord(source)

    expect(normalized.version).toBe('7')
    expect(normalized.id).toBe('9001')
    // 入参保持原样：归一化不就地改写列表行（列表缓存仍需原始响应）
    expect(source.version).toBe(7)
  })

  it('无版本时保持旧响应 shape（不写入 version 键）', () => {
    const normalized = normalizeFinanceDocumentRecord({
      id: '9001',
      paymentNo: 'PAY-1',
    })
    expect(normalized).not.toHaveProperty('version')
  })

  it('明细行与其它字段一并透传给编辑器', () => {
    const normalized = normalizeFinanceDocumentRecord({
      id: '9001',
      receiptNo: 'REC-1',
      version: '9',
      items: [{ id: '1', amount: 10 }],
    })
    expect(normalized.version).toBe('9')
    expect(normalized.items).toEqual([{ id: '1', amount: 10 }])
  })
})

describe('readFinanceDocumentVersion（编辑器 update 的版本前置条件取值）', () => {
  it('string/number 版本都归一成十进制字符串', () => {
    expect(readFinanceDocumentVersion({ version: '12' })).toBe('12')
    expect(readFinanceDocumentVersion({ version: 12 })).toBe('12')
    expect(readFinanceDocumentVersion({ version: ' 12 ' })).toBe('12')
  })

  it('缺 version / null / 记录为空时返回 undefined（不发空头）', () => {
    expect(readFinanceDocumentVersion({ paymentNo: 'PAY-1' })).toBeUndefined()
    expect(readFinanceDocumentVersion({ version: null })).toBeUndefined()
    expect(readFinanceDocumentVersion(null)).toBeUndefined()
    expect(readFinanceDocumentVersion(undefined)).toBeUndefined()
  })

  it('非法版本不会被当成版本头发送', () => {
    for (const version of ['', '-1', '1.5', 'abc', true]) {
      expect(
        readFinanceDocumentVersion({ version }),
        `version=${String(version)}`,
      ).toBeUndefined()
    }
  })
})

describe('isFinanceDocumentModuleKey', () => {
  it('只认付款单与收款单，其它模块（含已验收的采购/销售订单）不参与版本归一', () => {
    expect(FINANCE_DOCUMENT_MODULE_KEYS).toEqual(['payment', 'receipt'])
    for (const key of FINANCE_DOCUMENT_MODULE_KEYS) {
      expect(isFinanceDocumentModuleKey(key)).toBe(true)
    }
    for (const key of [
      'material',
      'purchase-order',
      'sales-order',
      'sales-return',
      'customer-statement',
    ]) {
      expect(isFinanceDocumentModuleKey(key), key).toBe(false)
    }
  })
})
