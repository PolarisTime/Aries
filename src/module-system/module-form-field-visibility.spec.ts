import { describe, expect, it } from 'vitest'
import { isModuleFormFieldVisible } from './module-form-field-visibility'

describe('isModuleFormFieldVisible', () => {
  it('keeps fields without a visibility predicate visible', () => {
    expect(
      isModuleFormFieldVisible(
        { key: 'paymentNo', label: '付款单号', type: 'input' },
        {},
      ),
    ).toBe(true)
  })

  it('evaluates visibility against current form values', () => {
    const field = {
      key: 'sourceStatementId',
      label: '关联对账单',
      type: 'select' as const,
      visibleWhen: (form?: Record<string, unknown>) =>
        form?.paymentPurpose === 'STATEMENT_SETTLEMENT',
    }

    expect(
      isModuleFormFieldVisible(field, {
        paymentPurpose: 'STATEMENT_SETTLEMENT',
      }),
    ).toBe(true)
    expect(
      isModuleFormFieldVisible(field, {
        paymentPurpose: 'PURCHASE_PREPAYMENT',
      }),
    ).toBe(false)
  })
})
