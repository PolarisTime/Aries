import { describe, expect, it } from 'vitest'
import { QUERY_KEYS } from '@/constants/query-keys'

describe('QUERY_KEYS 静态 key', () => {
  it('设置类 key', () => {
    expect(QUERY_KEYS.runtimeConfig).toEqual(['runtime-config'])
    expect(QUERY_KEYS.companySetting).toEqual(['company-setting'])
    expect(QUERY_KEYS.companySettings).toEqual(['company-settings'])
  })

  it('仪表盘类 key', () => {
    expect(QUERY_KEYS.dashboardSummary).toEqual(['dashboard-summary'])
    expect(QUERY_KEYS.backendInfo).toEqual(['backend-info'])
  })
})

describe('QUERY_KEYS 函数工厂', () => {
  it('cashLedger 携带完整查询参数', () => {
    const query = { settlementCompanyId: '1', page: 0, size: 10 }
    expect(QUERY_KEYS.cashLedger(query)).toEqual(['cash-ledger', query])
  })
})
