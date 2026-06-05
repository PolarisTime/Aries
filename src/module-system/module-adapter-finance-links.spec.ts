import { describe, expect, it } from 'vitest'
import {
  buildCustomerStatementOptions,
  buildStatementLinkOptions,
  findStatementRecordById,
} from './module-adapter-finance-links'

const sampleStatements = [
  {
    id: '1',
    statementNo: 'KHDZ20260001',
    customerName: '客户A',
    projectName: '项目X',
    closingAmount: 5000,
    endDate: '2026-03-15',
  },
  {
    id: '2',
    statementNo: 'KHDZ20260002',
    customerName: '客户B',
    projectName: '项目Y',
    closingAmount: 0,
    endDate: '2026-03-20',
  },
  {
    id: '3',
    statementNo: 'KHDZ20260003',
    customerName: '客户A',
    projectName: '项目Z',
    closingAmount: 3000,
    endDate: '2026-03-10',
  },
] as any[]

describe('buildCustomerStatementOptions', () => {
  it('filters and sorts by closingAmount, customerName, projectName', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerName: '客户A',
    })
    expect(result).toHaveLength(2)
    expect(result[0].value).toBe('1')
    expect(result[1].value).toBe('3')
  })

  it('includes statement with zero balance when it matches currentStatementId', () => {
    const opts = buildCustomerStatementOptions(sampleStatements, {
      currentStatementId: '2',
    })
    const ids = opts.map((o) => o.value)
    expect(ids).toContain('2')
  })

  it('returns empty array for empty statements', () => {
    expect(buildCustomerStatementOptions([])).toEqual([])
  })

  it('filters by projectName when provided', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerName: '客户A',
      projectName: '项目X',
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('1')
  })

  it('sorts by endDate descending', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerName: '客户A',
    })
    expect(result[0].value).toBe('1')
    expect(result[1].value).toBe('3')
  })
})

describe('findStatementRecordById', () => {
  it('returns null when statementId is null', () => {
    expect(findStatementRecordById(sampleStatements, null)).toBeNull()
  })

  it('returns null when statementId is empty string', () => {
    expect(findStatementRecordById(sampleStatements, '')).toBeNull()
  })

  it('returns matching record', () => {
    const result = findStatementRecordById(sampleStatements, '1')
    expect(result?.statementNo).toBe('KHDZ20260001')
  })

  it('returns null when no match found', () => {
    expect(findStatementRecordById(sampleStatements, '999')).toBeNull()
  })
})

describe('buildStatementLinkOptions', () => {
  const catalog = {
    customerStatements: sampleStatements,
    supplierStatements: [
      {
        id: '4',
        statementNo: 'GYDZ20260001',
        supplierName: '供应商A',
        closingAmount: 8000,
        endDate: '2026-02-28',
      },
    ] as any[],
    freightStatements: [
      {
        id: '5',
        statementNo: 'WDZ20260001',
        carrierName: '物流商A',
        unpaidAmount: 6000,
        endDate: '2026-04-01',
      },
    ] as any[],
  }

  it('returns customer options for receipt module', () => {
    const result = buildStatementLinkOptions('receipt', {}, catalog)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].label).toContain('待收')
  })

  it('returns supplier options for payment with businessType 供应商', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        businessType: '供应商',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].label).toContain('待付')
  })

  it('returns freight options for payment with businessType 物流商', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        businessType: '物流商',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].label).toContain('待付')
  })

  it('returns empty array for payment with unknown businessType', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        businessType: '其他',
      },
      catalog,
    )
    expect(result).toEqual([])
  })

  it('filters customer statements by currentStatementId', () => {
    const result = buildStatementLinkOptions(
      'receipt',
      {
        sourceStatementId: '2',
      },
      catalog,
    )
    const ids = result.map((o) => o.value)
    expect(ids).toContain('2')
  })

  it('filters customer statements by customerName and projectName', () => {
    const result = buildStatementLinkOptions(
      'receipt',
      {
        customerName: '客户A',
        projectName: '项目X',
      },
      catalog,
    )
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('1')
  })

  it('returns customer options for receipt with undefined form', () => {
    const result = buildStatementLinkOptions('receipt', undefined, catalog)
    expect(result.length).toBeGreaterThan(0)
  })

  it('filters supplier statements by counterpartyName', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        businessType: '供应商',
        counterpartyName: '供应商A',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
  })

  it('filters freight statements by counterpartyName', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        businessType: '物流商',
        counterpartyName: '物流商A',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns payment options with undefined form', () => {
    const result = buildStatementLinkOptions('payment', undefined, catalog)
    expect(result).toEqual([])
  })
})

describe('compareStatements edge cases', () => {
  it('sorts by statementNo descending when endDates are equal', () => {
    const statements = [
      {
        id: '1',
        statementNo: 'KHDZ0002',
        closingAmount: 100,
        endDate: '2026-03-15',
      },
      {
        id: '2',
        statementNo: 'KHDZ0001',
        closingAmount: 200,
        endDate: '2026-03-15',
      },
    ] as any[]
    const result = buildCustomerStatementOptions(statements)
    expect(result[0].value).toBe('1')
    expect(result[1].value).toBe('2')
  })

  it('handles NaN endDates by sorting by statementNo descending', () => {
    const statements = [
      { id: '1', statementNo: 'B', closingAmount: 100, endDate: 'invalid' },
      { id: '2', statementNo: 'A', closingAmount: 200, endDate: 'invalid' },
    ] as any[]
    const result = buildCustomerStatementOptions(statements)
    expect(result[0].value).toBe('1')
    expect(result[1].value).toBe('2')
  })

  it('handles non-finite amounts in normalizeAmount', () => {
    const statements = [
      {
        id: '1',
        statementNo: 'K001',
        closingAmount: 'abc',
        endDate: '2026-03-15',
        customerName: 'C',
        projectName: 'P',
      },
    ] as any[]
    const result = buildCustomerStatementOptions(statements, {
      currentStatementId: '1',
    })
    expect(result[0].label).toContain('0.00')
  })
})
