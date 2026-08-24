import { describe, expect, it } from 'vitest'
import type { FinanceBalance } from '@/api/finance/finance-overview'
import { buildCounterpartyLedgerQuery } from './finance-overview-support'

describe('buildCounterpartyLedgerQuery', () => {
  it('uses the balance counterparty and settlement company for the ledger popup', () => {
    const balance = {
      key: 'customer:100:200',
      direction: 'RECEIVABLE',
      counterpartyType: '客户',
      counterpartyId: '100',
      counterpartyCode: 'C-100',
      counterpartyName: '测试客户',
      settlementCompanyId: '200',
      settlementCompanyName: '测试公司',
      recognizedAmount: 100,
      settledAmount: 20,
      outstandingAmount: 80,
      advanceAmount: 0,
    } satisfies FinanceBalance

    expect(buildCounterpartyLedgerQuery(balance)).toEqual({
      settlementCompanyId: '200',
      counterpartyType: '客户',
      counterpartyId: '100',
      page: 0,
      size: 100,
    })
  })
})
