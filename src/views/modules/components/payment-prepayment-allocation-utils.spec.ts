import { describe, expect, it } from 'vitest'
import {
  buildPrepaymentStatementOptions,
  type PrepaymentAllocationValidationMessages,
  summarizePrepaymentAllocations,
  validatePrepaymentAllocations,
} from './payment-prepayment-allocation-utils'

const validationMessages: PrepaymentAllocationValidationMessages = {
  statementRequired: (lineNumber) =>
    `Select a supplier statement for row ${lineNumber}`,
  positiveAmountRequired: (lineNumber) =>
    `Allocation amount on row ${lineNumber} must be greater than zero`,
  statementAmountExceeded: (lineNumber) =>
    `Allocation amount on row ${lineNumber} exceeds the statement availability`,
  duplicateStatement: 'A supplier statement cannot be allocated twice',
  paymentAmountExceeded: 'Total allocation cannot exceed the payment amount',
}

const formatOptionLabel = (statementNo: string, availableAmount: number) =>
  `${statementNo} (Available ${availableAmount.toFixed(2)})`

describe('payment-prepayment-allocation-utils', () => {
  it('calculates allocated and remaining amounts in cents', () => {
    expect(
      summarizePrepaymentAllocations(1, [
        { sourceStatementId: '1', allocatedAmount: 0.1 },
        { sourceStatementId: '2', allocatedAmount: 0.2 },
      ]),
    ).toEqual({ paymentAmount: 1, allocatedAmount: 0.3, remainingAmount: 0.7 })
  })

  it('allows clearing all allocations', () => {
    expect(
      validatePrepaymentAllocations(100, [], new Map(), validationMessages),
    ).toBeNull()
  })

  it('requires a statement and a positive amount for every row', () => {
    expect(
      validatePrepaymentAllocations(
        100,
        [{ sourceStatementId: '', allocatedAmount: 10 }],
        new Map(),
        validationMessages,
      ),
    ).toBe('Select a supplier statement for row 1')
    expect(
      validatePrepaymentAllocations(
        100,
        [{ sourceStatementId: '1', allocatedAmount: 0 }],
        new Map(),
        validationMessages,
      ),
    ).toBe('Allocation amount on row 1 must be greater than zero')
  })

  it('rejects duplicate statements and totals above the payment amount', () => {
    expect(
      validatePrepaymentAllocations(
        100,
        [
          { sourceStatementId: '1', allocatedAmount: 30 },
          { sourceStatementId: '1', allocatedAmount: 20 },
        ],
        new Map(),
        validationMessages,
      ),
    ).toBe('A supplier statement cannot be allocated twice')
    expect(
      validatePrepaymentAllocations(
        100,
        [
          { sourceStatementId: '1', allocatedAmount: 60 },
          { sourceStatementId: '2', allocatedAmount: 40.01 },
        ],
        new Map(),
        validationMessages,
      ),
    ).toBe('Total allocation cannot exceed the payment amount')
  })

  it('rejects an allocation above the selected statement available amount', () => {
    expect(
      validatePrepaymentAllocations(
        1000,
        [{ sourceStatementId: '1', allocatedAmount: 300.01 }],
        new Map([['1', 300]]),
        validationMessages,
      ),
    ).toBe('Allocation amount on row 1 exceeds the statement availability')
  })

  it('keeps current statement selections when they are absent from candidates', () => {
    expect(
      buildPrepaymentStatementOptions(
        [
          {
            id: '1',
            statementNo: 'GYDZ-001',
            closingAmount: 300,
          },
        ],
        [
          {
            id: '11',
            sourceStatementId: '2',
            statementNo: 'GYDZ-002',
            statementBalanceAmount: 200,
            allocatedAmount: 50,
          },
        ],
        formatOptionLabel,
      ),
    ).toEqual([
      {
        value: '1',
        label: 'GYDZ-001 (Available 300.00)',
        availableAmount: 300,
      },
      {
        value: '2',
        label: 'GYDZ-002 (Available 250.00)',
        availableAmount: 250,
      },
    ])
  })
})
