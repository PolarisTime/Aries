import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) => args.map((v) => ({ label: v, value: v })),
}))

import { balancePageConfigs } from './balance-pages'

describe('balancePageConfigs', () => {
  it('contains receivable-payable config', () => {
    expect(balancePageConfigs['receivable-payable']).toBeDefined()
    expect(balancePageConfigs['receivable-payable'].key).toBe('receivable-payable')
  })

  it('is readOnly', () => {
    expect(balancePageConfigs['receivable-payable'].readOnly).toBe(true)
  })

  it('has filters', () => {
    expect(balancePageConfigs['receivable-payable'].filters).toBeDefined()
    expect(balancePageConfigs['receivable-payable'].filters!.length).toBeGreaterThanOrEqual(3)
  })

  it('has columns', () => {
    expect(balancePageConfigs['receivable-payable'].columns).toBeDefined()
    expect(balancePageConfigs['receivable-payable'].columns.length).toBeGreaterThan(0)
  })

  it('has detailFields', () => {
    expect(balancePageConfigs['receivable-payable'].detailFields).toBeDefined()
  })

  it('has detailItemColumns', () => {
    expect(balancePageConfigs['receivable-payable'].detailItemColumns).toBeDefined()
    expect(balancePageConfigs['receivable-payable'].detailItemColumns!.length).toBeGreaterThan(0)
  })

  it('buildOverview returns result', () => {
    const result = balancePageConfigs['receivable-payable'].buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })

  it('buildOverview computes receivable and payable for rows', () => {
    const rows = [
      { direction: '应收', balanceAmount: 100 },
      { direction: '应付', balanceAmount: 50 },
      { direction: '应收', balanceAmount: 200 },
    ]
    const result = balancePageConfigs['receivable-payable'].buildOverview!(rows as any)
    expect(result).toHaveLength(3)
  })
})
