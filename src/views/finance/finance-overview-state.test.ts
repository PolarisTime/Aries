import { describe, expect, it } from 'vitest'
import {
  buildSummaryItems,
  createInitialState,
  financeOverviewReducer,
  requestErrorMessage,
} from './finance-overview-state'

describe('finance-overview-state 纯逻辑', () => {
  it('createInitialState 提供默认应收方向与当天截止日期', () => {
    const state = createInitialState()
    expect(state.direction).toBe('RECEIVABLE')
    expect(state.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.page).toBe(1)
    expect(state.onlyOpen).toBe(false)
    expect(state.keywordInput).toBe('')
  })

  it('financeOverviewReducer 支持部分更新', () => {
    const next = financeOverviewReducer(createInitialState(), {
      type: 'update',
      values: { keyword: '客户A', page: 2 },
    })
    expect(next.keyword).toBe('客户A')
    expect(next.page).toBe(2)
    expect(next.direction).toBe('RECEIVABLE')
  })

  it('financeOverviewReducer reset-filters 保留 pageSize', () => {
    const state = { ...createInitialState(), pageSize: 50, keyword: '客户' }
    const next = financeOverviewReducer(state, { type: 'reset-filters' })
    expect(next.pageSize).toBe(50)
    expect(next.keyword).toBeUndefined()
    expect(next.page).toBe(1)
  })

  it('buildSummaryItems 按方向返回对应统计卡', () => {
    const receivable = buildSummaryItems('RECEIVABLE', {
      receivableAmount: 1,
      receivedAmount: 2,
      unreceivedAmount: 3,
      advanceReceiptAmount: 4,
    } as Parameters<typeof buildSummaryItems>[1])
    expect(receivable.map((item) => item.label)).toEqual([
      '应收',
      '已收',
      '未收',
      '预收',
    ])

    const payable = buildSummaryItems('PAYABLE')
    expect(payable.map((item) => item.label)).toEqual([
      '应付',
      '已付',
      '未付',
      '预付',
    ])
  })

  it('buildSummaryItems 无 summary 时值为 undefined', () => {
    const items = buildSummaryItems('RECEIVABLE')
    expect(items.every((item) => item.value === undefined)).toBe(true)
  })

  it('requestErrorMessage 优先使用 Error message', () => {
    expect(requestErrorMessage(new Error('网络失败'), '默认')).toBe('网络失败')
    expect(requestErrorMessage(new Error('  '), '默认')).toBe('默认')
    expect(requestErrorMessage('字符串错误', '默认')).toBe('默认')
  })
})
