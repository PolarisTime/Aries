import { describe, expect, it, vi } from 'vitest'

vi.mock('./module-behavior-registry-core', () => ({
  registerModuleBehavior: vi.fn(),
}))

import { registerModuleBehavior } from './module-behavior-registry-core'
import './module-behavior-save'

const mockedRegister = vi.mocked(registerModuleBehavior)

describe('module-behavior-save', () => {
  const lineItemPayloadModules = [
    'purchase-order',
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'freight-bill',
    'purchase-contract',
    'sales-contract',
    'supplier-statement',
    'customer-statement',
    'freight-statement',
    'invoice-receipt',
    'invoice-issue',
  ]

  const extraScalarFieldsMap: Record<string, string[]> = {
    'freight-statement': ['attachment'],
    'purchase-order': ['buyerName'],
    'purchase-inbound': ['buyerName'],
    'sales-order': ['salesName'],
    'sales-outbound': ['salesName'],
    'purchase-contract': ['buyerName'],
    'sales-contract': ['salesName'],
  }

  const chargeItemPayloadModules = [
    'purchase-order',
    'purchase-inbound',
    'sales-order',
    'sales-outbound',
    'freight-bill',
  ]

  it('registers savePayloadLineItems for all line item modules', () => {
    const registeredModules = new Set(
      mockedRegister.mock.calls
        .filter(([, config]) => config.savePayloadLineItems === true)
        .map(([key]) => key),
    )
    lineItemPayloadModules.forEach((moduleKey) => {
      expect(registeredModules.has(moduleKey)).toBe(true)
    })
  })

  it('registers savePayloadChargeItems for supported charge item modules', () => {
    const registeredModules = new Set(
      mockedRegister.mock.calls
        .filter(([, config]) => config.savePayloadChargeItems === true)
        .map(([key]) => key),
    )
    chargeItemPayloadModules.forEach((moduleKey) => {
      expect(registeredModules.has(moduleKey)).toBe(true)
    })
  })

  it('registers extraScalarFields for each module in map', () => {
    Object.entries(extraScalarFieldsMap).forEach(([moduleKey, fields]) => {
      const calls = mockedRegister.mock.calls.filter(
        ([key]) => key === moduleKey,
      )
      const hasExtraFields = calls.some(
        ([, config]) =>
          config.extraScalarFields?.join(',') === fields.join(','),
      )
      expect(hasExtraFields).toBe(true)
    })
  })

  it('registers includeAttachmentIds for freight-statement', () => {
    const calls = mockedRegister.mock.calls.filter(
      ([key]) => key === 'freight-statement',
    )
    const hasAttachmentIds = calls.some(
      ([, config]) => config.includeAttachmentIds === true,
    )
    expect(hasAttachmentIds).toBe(true)
  })

  it('registers supportsStatementLinking for receipt', () => {
    const calls = mockedRegister.mock.calls.filter(([key]) => key === 'receipt')
    const hasStatementLinking = calls.some(
      ([, config]) => config.supportsStatementLinking === 'receipt',
    )
    expect(hasStatementLinking).toBe(true)
  })

  it('registers supportsStatementLinking for payment', () => {
    const calls = mockedRegister.mock.calls.filter(([key]) => key === 'payment')
    const hasStatementLinking = calls.some(
      ([, config]) => config.supportsStatementLinking === 'payment',
    )
    expect(hasStatementLinking).toBe(true)
  })

  it('registers all expected modules', () => {
    const registeredKeys = new Set(
      mockedRegister.mock.calls.map(([key]) => key),
    )
    lineItemPayloadModules.forEach((moduleKey) => {
      expect(registeredKeys.has(moduleKey)).toBe(true)
    })
    expect(registeredKeys.has('receipt')).toBe(true)
    expect(registeredKeys.has('payment')).toBe(true)
  })
})
