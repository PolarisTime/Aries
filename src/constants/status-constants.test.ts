import { describe, expect, it } from 'vitest'
import { DOCUMENT_STATUS, SETTLEMENT_TYPE, STATUS } from '@/constants/status-constants'

describe('STATUS 通用状态', () => {
  it('正常/禁用值', () => {
    expect(STATUS.NORMAL).toBe('正常')
    expect(STATUS.DISABLED).toBe('禁用')
  })
})

describe('SETTLEMENT_TYPE 结算账户类型', () => {
  it('三类结算类型', () => {
    expect(SETTLEMENT_TYPE.GENERAL).toBe('通用')
    expect(SETTLEMENT_TYPE.RECEIPT).toBe('收款')
    expect(SETTLEMENT_TYPE.PAYMENT).toBe('付款')
  })
})

describe('DOCUMENT_STATUS 单据状态', () => {
  it('核心业务状态值与后端一致', () => {
    expect(DOCUMENT_STATUS.DRAFT).toBe('草稿')
    expect(DOCUMENT_STATUS.AUDITED).toBe('已审核')
    expect(DOCUMENT_STATUS.PURCHASE_COMPLETED).toBe('完成采购')
    expect(DOCUMENT_STATUS.SALES_COMPLETED).toBe('完成销售')
  })

  it('状态值互不重复', () => {
    const values = Object.values(DOCUMENT_STATUS)
    expect(new Set(values).size).toBe(values.length)
  })
})
