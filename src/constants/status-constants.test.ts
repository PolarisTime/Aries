import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_STATUS,
  SETTLEMENT_TYPE,
  STATUS,
  STATUS_LABELS,
  statusLabel,
} from '@/constants/status-constants'

describe('STATUS 通用状态', () => {
  it('对外值是英文 code，中文只登记在 STATUS_LABELS', () => {
    expect(STATUS.NORMAL).toBe('NORMAL')
    expect(STATUS.DISABLED).toBe('DISABLED')
    expect(STATUS_LABELS.NORMAL).toBe('正常')
    expect(STATUS_LABELS.DISABLED).toBe('禁用')
  })
})

describe('SETTLEMENT_TYPE 结算账户类型', () => {
  it('三类结算类型（后端仍以中文区分，不是状态 code）', () => {
    expect(SETTLEMENT_TYPE.GENERAL).toBe('通用')
    expect(SETTLEMENT_TYPE.RECEIPT).toBe('收款')
    expect(SETTLEMENT_TYPE.PAYMENT).toBe('付款')
  })
})

describe('DOCUMENT_STATUS 单据状态', () => {
  it('每个常量值等于自身 key（约定：key 即 code）', () => {
    for (const [key, value] of Object.entries(DOCUMENT_STATUS)) {
      expect(value).toBe(key)
    }
  })

  it('code → 中文 与后端 DocumentStatus.label() 逐项一致（含销售合同专用态）', () => {
    const expected = {
      NORMAL: '正常',
      DISABLED: '禁用',
      DRAFT: '草稿',
      AUDITED: '已审核',
      CONTRACT_REVIEWED: '审核',
      CONTRACT_ISSUED: '签发',
      COMPLETED: '已完成',
      VOIDED: '作废',
      PURCHASE_COMPLETED: '完成采购',
      SALES_COMPLETED: '完成销售',
      INBOUND_COMPLETED: '完成入库',
      DELIVERY_VERIFICATION: '交付核定',
      SIGNED: '已签署',
      UNSIGNED: '未签署',
      UNAUDITED: '未审核',
      EXECUTING: '执行中',
      ARCHIVED: '归档',
      PENDING_CONFIRM: '待确认',
      CONFIRMED: '已确认',
      PENDING_AUDIT: '待审核',
      QUOTING: '报价',
      SUCCESS: '成功',
      FAILED: '失败',
      PAID: '已付款',
      RECEIVED: '已收款',
    } as const

    for (const [code, label] of Object.entries(expected)) {
      expect(STATUS_LABELS[code as keyof typeof STATUS_LABELS]).toBe(label)
    }
  })

  it('状态值互不重复', () => {
    const values = Object.values(DOCUMENT_STATUS)
    expect(new Set(values).size).toBe(values.length)
  })
})

describe('statusLabel 展示映射', () => {
  it('已知 code 返回中文', () => {
    expect(statusLabel('DRAFT')).toBe('草稿')
    expect(statusLabel('AUDITED')).toBe('已审核')
    expect(statusLabel('CONTRACT_REVIEWED')).toBe('审核')
    expect(statusLabel('FAILED')).toBe('失败')
  })

  it('未知值原样返回（不吞成空白、也不误导成某个已知状态）', () => {
    expect(statusLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
    expect(statusLabel('')).toBe('')
    expect(statusLabel(null)).toBe('')
    expect(statusLabel(undefined)).toBe('')
  })

  it('过渡期兜底：历史中文值原样返回', () => {
    expect(statusLabel('草稿')).toBe('草稿')
  })
})
