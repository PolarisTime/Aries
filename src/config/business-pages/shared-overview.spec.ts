import { describe, expect, it } from 'vitest'
import {
  sumBy,
  buildAmountWeightOverview,
  buildWeightOverview,
  buildStatementOverview,
  buildFinanceOverview,
  buildMasterOverview,
  formatInteger,
  formatWeight,
  formatAmount,
} from './shared-overview'

describe('sumBy', () => {
  it('sums values by key', () => {
    expect(sumBy([{ a: 1 }, { a: 2 }, { a: 3 }], 'a')).toBe(6)
  })

  it('handles empty array', () => {
    expect(sumBy([], 'a')).toBe(0)
  })

  it('handles missing key', () => {
    expect(sumBy([{ a: 1 }, {}], 'a')).toBe(1)
  })

  it('handles non-numeric values', () => {
    expect(sumBy([{ a: '5' }, { a: '10' }], 'a')).toBe(15)
  })
})

describe('buildAmountWeightOverview', () => {
  it('returns record count, weight and amount', () => {
    const rows = [{ totalWeight: 100, totalAmount: 5000 }]
    const result = buildAmountWeightOverview(rows, 'totalAmount')
    expect(result).toHaveLength(3)
    expect(result[0].value).toBe(formatInteger(1))
    expect(result[1].value).toBe(formatWeight(100))
    expect(result[2].value).toBe(formatAmount(5000))
  })

  it('uses custom weightKey', () => {
    const rows = [{ customWeight: 200, totalAmount: 3000 }]
    const result = buildAmountWeightOverview(rows, 'totalAmount', 'customWeight')
    expect(result[1].value).toBe(formatWeight(200))
  })
})

describe('buildWeightOverview', () => {
  it('returns record count and weight', () => {
    const result = buildWeightOverview([{ totalWeight: 50 }])
    expect(result).toHaveLength(2)
  })
})

describe('buildStatementOverview', () => {
  it('returns four statement metrics', () => {
    const rows = [
      { businessAmount: 1000, paidAmount: 600, balanceAmount: 400 },
    ]
    const result = buildStatementOverview(rows, 'businessAmount', 'paidAmount', 'balanceAmount')
    expect(result).toHaveLength(4)
    expect(result[0].value).toBe(formatInteger(1))
    expect(result[1].value).toBe(formatAmount(1000))
    expect(result[2].value).toBe(formatAmount(600))
    expect(result[3].value).toBe(formatAmount(400))
  })
})

describe('buildFinanceOverview', () => {
  it('returns document count and total amount', () => {
    const result = buildFinanceOverview([{ amount: 2000 }], 'amount')
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(formatInteger(1))
    expect(result[1].value).toBe(formatAmount(2000))
  })
})

describe('buildMasterOverview', () => {
  it('returns master data count and normal count', () => {
    const rows = [
      { status: '正常' },
      { status: '正常' },
      { status: '禁用' },
    ]
    const result = buildMasterOverview(rows)
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe(formatInteger(3))
    expect(result[1].value).toBe(formatInteger(2))
  })

  it('uses custom activeKey and activeValue', () => {
    const rows = [
      { state: 'active' },
      { state: 'inactive' },
    ]
    const result = buildMasterOverview(rows, 'state', 'active')
    expect(result[1].value).toBe(formatInteger(1))
  })
})
