import { describe, expect, it } from 'vitest'
import { normalizeRecord, normalizeRows } from '@/utils/normalizers'
import { EntityIdContractError } from '@/types/entity-id'

describe('normalizeRows', () => {
  it('非数组返回空集合', () => {
    expect(normalizeRows(null)).toEqual([])
    expect(normalizeRows(undefined)).toEqual([])
    expect(normalizeRows('abc')).toEqual([])
    expect(normalizeRows({ id: 1 })).toEqual([])
  })

  it('数组内非法行抛契约错误', () => {
    expect(() => normalizeRows([{ id: 1 }, 'bad'])).toThrow(EntityIdContractError)
    expect(() => normalizeRows([null])).toThrow(EntityIdContractError)
  })

  it('正常行规范化为 ModuleRecord', () => {
    const rows = normalizeRows([{ id: 123, name: '客户A' }])
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe('123')
  })
})

describe('normalizeRecord', () => {
  it('数值实体 ID 规范化为字符串', () => {
    const rec = normalizeRecord({ id: 123, customerId: 456 })
    expect(rec.id).toBe('123')
    expect(rec.customerId).toBe('456')
  })

  it('字符串实体 ID 保留', () => {
    expect(normalizeRecord({ id: '123' }).id).toBe('123')
  })

  it('items 递归规范化', () => {
    const rec = normalizeRecord({ id: '1', items: [{ id: 789 }] })
    expect(rec.items).toEqual([{ id: '789' }])
  })

  it('无 items 时返回对象不含 items 字段', () => {
    const rec = normalizeRecord({ id: '1' })
    expect('items' in rec).toBe(false)
  })

  it('从首行明细提升财务分配来源字段', () => {
    const rec = normalizeRecord({
      id: '1',
      items: [{ id: '11', sourceCustomerStatementId: '99' }],
    })
    expect(rec.sourceCustomerStatementId).toBe('99')
  })

  it('字段已有值时不做来源提升', () => {
    const rec = normalizeRecord({
      id: '1',
      sourceCustomerStatementId: '88',
      items: [{ id: '11', sourceCustomerStatementId: '99' }],
    })
    expect(rec.sourceCustomerStatementId).toBe('88')
  })

  it('无明细时保留原有来源字段', () => {
    const rec = normalizeRecord({ id: '1', sourceFreightStatementId: '77' })
    expect(rec.sourceFreightStatementId).toBe('77')
  })

  it('非法实体 ID 抛契约错误', () => {
    expect(() => normalizeRecord({ id: 'abc' })).toThrow(EntityIdContractError)
    expect(() => normalizeRecord({ id: 1.5 })).toThrow(EntityIdContractError)
  })
})
