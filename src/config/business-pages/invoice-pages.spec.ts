import { describe, expect, it, vi } from 'vitest'

vi.mock('i18next', () => ({
  default: { t: (key: string) => key },
}))

vi.mock('@/constants/module-options', () => ({
  invoiceIssuePageConfig: { key: 'invoice-issue' },
  invoiceReceiptPageConfig: { key: 'invoice-receipt' },
  customerOptions: [],
  getSupplierOptions: [],
  enabledStatusOptions: [],
  buildValueOptions: (...args: string[]) =>
    args.map((v) => ({ label: v, value: v })),
  userAccountDataScopeOptions: [],
}))

import { invoicePageConfigs } from './invoice-pages'

describe('invoicePageConfigs', () => {
  it('contains invoice-receipt config', () => {
    expect(invoicePageConfigs['invoice-receipt']).toBeDefined()
  })

  it('contains invoice-issue config', () => {
    expect(invoicePageConfigs['invoice-issue']).toBeDefined()
  })

  it('has exactly 2 entries', () => {
    expect(Object.keys(invoicePageConfigs)).toHaveLength(2)
  })
})
