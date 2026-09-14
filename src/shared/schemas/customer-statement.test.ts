import { describe, expect, it } from 'vitest'
import {
  customerStatementItemSchema,
  customerStatementRecordSchema,
  DEFAULT_STATEMENT_DIRECTION,
  normalizeStatementDirection,
  statementDirectionSchema,
} from './customer-statement'

const baseRecord = {
  id: '1932500000000000001',
  statementNo: 'CS-2026-0001',
  customerId: '1932500000000000002',
  customerName: '客户甲',
  salesAmount: 1000,
  receiptAmount: 0,
  closingAmount: 1000,
  status: '待确认',
}

describe('statementDirectionSchema', () => {
  it('历史数据缺失方向时回退为蓝字', () => {
    expect(statementDirectionSchema.parse(undefined)).toBe(
      DEFAULT_STATEMENT_DIRECTION,
    )
    expect(customerStatementRecordSchema.parse(baseRecord).direction).toBe(
      '蓝字',
    )
  })

  it('未知方向宽松回退为蓝字', () => {
    expect(statementDirectionSchema.parse('黑字')).toBe('蓝字')
    expect(normalizeStatementDirection('黑字')).toBe('蓝字')
  })

  it('保留红字方向', () => {
    expect(statementDirectionSchema.parse('红字')).toBe('红字')
    expect(normalizeStatementDirection('红字')).toBe('红字')
  })
})

describe('customerStatementRecordSchema', () => {
  it('红字对账单允许负数金额与来源退货单号', () => {
    const parsed = customerStatementRecordSchema.parse({
      ...baseRecord,
      direction: '红字',
      salesAmount: -1000,
      receiptAmount: -100,
      closingAmount: -900,
      sourceSalesReturnId: '1932500000000000009',
      sourceSalesReturnNo: 'RT-2026-0001',
    })
    expect(parsed).toMatchObject({
      direction: '红字',
      salesAmount: -1000,
      closingAmount: -900,
      sourceSalesReturnId: '1932500000000000009',
      sourceSalesReturnNo: 'RT-2026-0001',
    })
  })

  it('来源退货字段可空', () => {
    const parsed = customerStatementRecordSchema.parse({
      ...baseRecord,
      sourceSalesReturnId: null,
      sourceSalesReturnNo: null,
    })
    expect(parsed.sourceSalesReturnId).toBeNull()
    expect(parsed.sourceSalesReturnNo).toBeNull()
  })

  it('雪花 ID 字段解析为字符串', () => {
    const parsed = customerStatementRecordSchema.parse({
      ...baseRecord,
      sourceSalesReturnId: 1932500000000,
    })
    expect(parsed.sourceSalesReturnId).toBe('1932500000000')
  })

  it('非法雪花 ID 失败关闭', () => {
    expect(() =>
      customerStatementRecordSchema.parse({
        ...baseRecord,
        sourceSalesReturnId: 'abc',
      }),
    ).toThrow()
  })
})

describe('customerStatementItemSchema', () => {
  it('红字明细允许负数量、负重量与负金额', () => {
    const parsed = customerStatementItemSchema.parse({
      id: '1932500000000000011',
      quantity: -2,
      weightTon: -1.25,
      unitPrice: -3000,
      amount: -3750,
      sourceSalesReturnId: '1932500000000000009',
      sourceSalesReturnNo: 'RT-2026-0001',
    })
    expect(parsed).toMatchObject({
      quantity: -2,
      weightTon: -1.25,
      unitPrice: -3000,
      amount: -3750,
    })
  })

  it('明细缺失可选字段时不报错', () => {
    expect(() => customerStatementItemSchema.parse({ id: '1' })).not.toThrow()
  })
})
