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
    customerId: '101',
    customerName: '客户A',
    projectId: '201',
    projectName: '项目X',
    settlementCompanyId: '301',
    settlementCompanyName: '主体A',
    closingAmount: 5000,
    endDate: '2026-03-15',
  },
  {
    id: '2',
    statementNo: 'KHDZ20260002',
    customerId: '102',
    customerName: '客户B',
    projectId: '202',
    projectName: '项目Y',
    settlementCompanyId: '302',
    settlementCompanyName: '主体B',
    closingAmount: 0,
    endDate: '2026-03-20',
  },
  {
    id: '3',
    statementNo: 'KHDZ20260003',
    customerId: '101',
    customerName: '客户A',
    projectId: '203',
    projectName: '项目Z',
    settlementCompanyId: '302',
    settlementCompanyName: '主体B',
    closingAmount: 3000,
    endDate: '2026-03-10',
  },
] as any[]

describe('buildCustomerStatementOptions', () => {
  it('filters and sorts by closingAmount and stable customer identity', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerId: '101',
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

  it('excludes customer statements without a stable statement id', () => {
    const result = buildCustomerStatementOptions([
      {
        statementNo: 'KHDZ20260004',
        customerName: '客户A',
        projectName: '项目X',
        closingAmount: 100,
      },
    ] as any[])

    expect(result).toEqual([])
  })

  it('filters by projectId when provided', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerId: '101',
      projectId: '201',
    })
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('1')
  })

  it('filters by settlementCompanyId when provided', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerId: '101',
      settlementCompanyId: '301',
    })

    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('1')
    expect(result[0].settlementCompanyName).toBe('主体A')
  })

  it('sorts by endDate descending', () => {
    const result = buildCustomerStatementOptions(sampleStatements, {
      customerId: '101',
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
        supplierId: '401',
        supplierName: '供应商A',
        closingAmount: 8000,
        endDate: '2026-02-28',
      },
    ] as any[],
    freightStatements: [
      {
        id: '5',
        statementNo: 'WDZ20260001',
        carrierId: '501',
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

  it('returns supplier options for payment with typed counterparty identity', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '供应商',
        counterpartyId: '401',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].label).toContain('待付')
  })

  it('returns freight options for payment with typed counterparty identity', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '物流商',
        counterpartyId: '501',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].label).toContain('待付')
  })

  it('returns empty array for payment with unknown counterpartyType', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '其他',
      },
      catalog,
    )
    expect(result).toEqual([])
  })

  it('filters customer statements by currentStatementId', () => {
    const result = buildStatementLinkOptions(
      'receipt',
      {
        sourceCustomerStatementId: '2',
      },
      catalog,
    )
    const ids = result.map((o) => o.value)
    expect(ids).toContain('2')
  })

  it('filters customer statements by customerId and projectId', () => {
    const result = buildStatementLinkOptions(
      'receipt',
      {
        customerId: '101',
        projectId: '201',
        settlementCompanyId: '301',
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

  it('filters supplier statements by counterpartyId', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '供应商',
        counterpartyId: '401',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
  })

  it('excludes supplier statements without a stable statement id', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '供应商',
        counterpartyId: '401',
      },
      {
        ...catalog,
        supplierStatements: [
          {
            statementNo: 'GYDZ20260002',
            supplierId: '401',
            supplierName: '供应商A',
            closingAmount: 100,
          },
        ] as any[],
      },
    )

    expect(result).toEqual([])
  })

  it('filters freight statements by counterpartyId', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '物流商',
        counterpartyId: '501',
      },
      catalog,
    )
    expect(result.length).toBeGreaterThan(0)
  })

  it('excludes freight statements without a stable statement id', () => {
    const result = buildStatementLinkOptions(
      'payment',
      {
        counterpartyType: '物流商',
        counterpartyId: '501',
      },
      {
        ...catalog,
        freightStatements: [
          {
            statementNo: 'WDZ20260002',
            carrierId: '501',
            carrierName: '物流商A',
            unpaidAmount: 100,
          },
        ] as any[],
      },
    )

    expect(result).toEqual([])
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
