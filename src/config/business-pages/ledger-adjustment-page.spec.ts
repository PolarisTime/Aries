import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

import { ledgerAdjustmentPageConfig } from './ledger-adjustment-page'

describe('ledgerAdjustmentPageConfig', () => {
  it('has correct key and primary number field', () => {
    expect(ledgerAdjustmentPageConfig.key).toBe('ledger-adjustment')
    expect(ledgerAdjustmentPageConfig.primaryNoKey).toBe('adjustmentNo')
  })

  it('defines ledger adjustment filters', () => {
    expect(ledgerAdjustmentPageConfig.filters?.map((field) => field.key)).toEqual([
      'direction',
      'counterpartyType',
      'status',
      'adjustmentDate',
    ])
  })

  it('shows counterparty code in columns', () => {
    expect(
      ledgerAdjustmentPageConfig.columns.map((column) => column.dataIndex),
    ).toContain('counterpartyCode')
  })

  it('keeps ledger adjustment scalar save fields', () => {
    expect(ledgerAdjustmentPageConfig.saveFields?.scalar).toEqual([
      'adjustmentNo',
      'direction',
      'counterpartyType',
      'counterpartyCode',
      'counterpartyName',
      'projectId',
      'projectName',
      'adjustmentDate',
      'amount',
      'adjustmentType',
      'effect',
      'status',
      'operatorName',
      'remark',
    ])
  })

  it('builds finance overview from amount', () => {
    const overview = ledgerAdjustmentPageConfig.buildOverview?.([
      { amount: 100 },
      { amount: 20 },
    ])

    expect(Array.isArray(overview)).toBe(true)
  })
})
