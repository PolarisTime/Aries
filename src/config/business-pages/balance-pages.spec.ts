import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
}))

import { balancePageConfigs } from './balance-pages'

function expectUnique(values: Array<string | undefined>) {
  const normalizedValues = values.filter(
    (value): value is string => typeof value === 'string',
  )

  expect(new Set(normalizedValues).size).toBe(normalizedValues.length)
}

describe('balancePageConfigs', () => {
  const config = balancePageConfigs['receivable-payable']

  it('contains receivable-payable config', () => {
    expect(config).toBeDefined()
    expect(config.key).toBe('receivable-payable')
  })

  it('is readOnly', () => {
    expect(config.readOnly).toBe(true)
  })

  it('does not expose create or delete actions', () => {
    const actionKeys = config.actions?.map((action) => action.key) ?? []

    expect(actionKeys).toEqual(['export_balance'])
    expect(actionKeys).not.toContain('create')
    expect(actionKeys).not.toContain('delete')
    expect(actionKeys.some((key) => key?.includes('create'))).toBe(false)
    expect(actionKeys.some((key) => key?.includes('delete'))).toBe(false)
  })

  it('keeps interactive keys unique for idempotent rendering', () => {
    expectUnique(config.actions?.map((action) => action.key) ?? [])
    expectUnique(config.quickFilters?.map((filter) => filter.key) ?? [])
    expectUnique(config.filters.map((filter) => filter.key))
    expectUnique(config.columns.map((column) => String(column.dataIndex)))
    expectUnique(config.detailFields.map((field) => field.key))
    expectUnique(
      config.detailItemColumns?.map((column) => String(column.dataIndex)) ?? [],
    )
  })

  it('uses settlement status filters', () => {
    const statusFilter = config.filters.find(
      (filter) => filter.key === 'status',
    )

    expect(statusFilter).toBeDefined()
    expect(statusFilter?.options).toEqual([
      { label: '未结清', value: '未结清' },
      { label: '已结清', value: '已结清' },
    ])
  })

  it('uses reconciliation status filters', () => {
    const reconciliationStatusFilter = config.filters.find(
      (filter) => filter.key === 'reconciliationStatus',
    )

    expect(reconciliationStatusFilter).toBeDefined()
    expect(reconciliationStatusFilter?.label).toBe(
      'modules.pages.balance.reconciliationStatus',
    )
    expect(reconciliationStatusFilter?.options).toEqual([
      { label: '未对账', value: '未对账' },
      { label: '已对账', value: '已对账' },
    ])
  })

  it('defines AntD quick filters for common balance views', () => {
    expect(config.quickFilters).toEqual([
      {
        key: 'all',
        label: 'modules.pages.balance.allBalances',
        values: {},
      },
      {
        key: 'receivable',
        label: 'modules.pages.balance.receivable',
        values: { direction: '应收' },
      },
      {
        key: 'payable',
        label: 'modules.pages.balance.payable',
        values: { direction: '应付' },
      },
      {
        key: 'open',
        label: 'modules.pages.balance.open',
        values: { status: '未结清' },
      },
      {
        key: 'closed',
        label: 'modules.pages.balance.closed',
        values: { status: '已结清' },
      },
      {
        key: 'unreconciled',
        label: 'modules.pages.balance.unreconciled',
        values: { reconciliationStatus: '未对账' },
      },
      {
        key: 'reconciled',
        label: 'modules.pages.balance.reconciled',
        values: { reconciliationStatus: '已对账' },
      },
    ])
  })

  it('uses ledger summary columns', () => {
    const keys = config.columns.map((column) => column.dataIndex)

    expect(keys).toEqual([
      'direction',
      'counterpartyType',
      'counterpartyCode',
      'counterpartyName',
      'reconciliationStatus',
      'recognizedAmount',
      'settledAmount',
      'balanceAmount',
      'days0To30Amount',
      'days31To60Amount',
      'days61To90Amount',
      'daysOver90Amount',
      'entryCount',
      'status',
    ])
    expect(keys).not.toContain('openingAmount')
    expect(keys).not.toContain('currentAmount')
    expect(keys).not.toContain('documentCount')
    expect(
      config.columns.find((column) => column.dataIndex === 'direction'),
    ).toMatchObject({ type: 'status', align: 'center' })
  })

  it('uses ledger summary detail fields', () => {
    const keys = config.detailFields.map((field) => field.key)

    expect(keys).toContain('recognizedAmount')
    expect(keys).toContain('counterpartyCode')
    expect(keys).toContain('reconciliationStatus')
    expect(keys).toContain('daysOver90Amount')
    expect(keys).toContain('entryCount')
    expect(keys).not.toContain('openingAmount')
    expect(keys).not.toContain('currentAmount')
    expect(keys).not.toContain('documentCount')
  })

  it('uses ledger entry detail item columns', () => {
    const keys = config.detailItemColumns?.map((column) => column.dataIndex)

    expect(keys).toEqual([
      'entryRole',
      'sourceType',
      'documentNo',
      'sourceNo',
      'projectName',
      'reconciliationStatus',
      'accountingDate',
      'dueDate',
      'debitAmount',
      'creditAmount',
      'balanceAmount',
      'ageDays',
      'status',
      'remark',
    ])
    expect(keys).not.toContain('statementNo')
    expect(keys).not.toContain('businessDate')
    expect(keys).not.toContain('periodStart')
    expect(keys).not.toContain('periodEnd')
    expect(keys).not.toContain('statementSettledAmount')
    expect(keys).not.toContain('statementBalanceAmount')
  })

  it('buildOverview returns result', () => {
    const result = config.buildOverview!([])
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(3)
  })

  it('buildOverview computes receivable and payable for rows', () => {
    const rows = [
      { direction: '应收', balanceAmount: 100 },
      { direction: '应付', balanceAmount: 50 },
      { direction: '应收', balanceAmount: 200 },
    ]
    const result = config.buildOverview!(rows as any)
    expect(result).toHaveLength(3)
  })

  it('highlights open ledger balances', () => {
    expect(config.rowHighlightStatuses).toEqual(['未结清', '未对账'])
    expect(config.statusMap?.未结清.color).toBe('warning')
    expect(config.statusMap?.已结清.color).toBe('success')
    expect(config.statusMap?.未对账.color).toBe('warning')
    expect(config.statusMap?.已对账.color).toBe('success')
    expect(config.statusMap?.应收.color).toBe('processing')
    expect(config.statusMap?.应付.color).toBe('warning')
    expect(config.statusMap?.RECOGNITION.color).toBe('processing')
    expect(config.statusMap?.SETTLEMENT.color).toBe('success')
  })
})
