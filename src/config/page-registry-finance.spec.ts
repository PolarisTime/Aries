import { describe, expect, it } from 'vitest'
import { financePageDefinitions } from './page-registry-finance'

describe('page-registry-finance', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(financePageDefinitions)).toBe(true)
    expect(financePageDefinitions.length).toBeGreaterThan(0)
  })

  it('each definition has required fields', () => {
    for (const def of financePageDefinitions) {
      expect(def.key).toBeDefined()
      expect(def.title).toBeDefined()
      expect(def.menuKey).toBeDefined()
      expect(def.view).toBeDefined()
      expect(def.icon).toBeDefined()
    }
  })

  it('defines supplier-statement page', () => {
    const page = financePageDefinitions.find(
      (d) => d.key === 'supplier-statement',
    )
    expect(page).toBeDefined()
    expect(page!.title).toBe('供应商对账单')
    expect(page!.menuParent).toBe('statements')
    expect(page!.moduleKey).toBe('supplier-statement')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileSearchOutlined')
  })

  it('defines customer-statement page', () => {
    const page = financePageDefinitions.find(
      (d) => d.key === 'customer-statement',
    )
    expect(page).toBeDefined()
    expect(page!.title).toBe('客户对账单')
    expect(page!.menuParent).toBe('statements')
    expect(page!.moduleKey).toBe('customer-statement')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileTextOutlined')
  })

  it('defines freight-statement page', () => {
    const page = financePageDefinitions.find(
      (d) => d.key === 'freight-statement',
    )
    expect(page).toBeDefined()
    expect(page!.title).toBe('物流对账单')
    expect(page!.menuParent).toBe('statements')
    expect(page!.moduleKey).toBe('freight-statement')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileSyncOutlined')
  })

  it('defines receipt page', () => {
    const page = financePageDefinitions.find((d) => d.key === 'receipt')
    expect(page).toBeDefined()
    expect(page!.title).toBe('收款单')
    expect(page!.menuParent).toBe('finance')
    expect(page!.moduleKey).toBe('receipt')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('AccountBookOutlined')
  })

  it('defines payment page', () => {
    const page = financePageDefinitions.find((d) => d.key === 'payment')
    expect(page).toBeDefined()
    expect(page!.title).toBe('付款单')
    expect(page!.menuParent).toBe('finance')
    expect(page!.moduleKey).toBe('payment')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('CreditCardOutlined')
  })

  it('defines invoice-receipt page', () => {
    const page = financePageDefinitions.find((d) => d.key === 'invoice-receipt')
    expect(page).toBeDefined()
    expect(page!.title).toBe('收票单')
    expect(page!.menuParent).toBe('finance')
    expect(page!.moduleKey).toBe('invoice-receipt')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileTextOutlined')
  })

  it('defines invoice-issue page', () => {
    const page = financePageDefinitions.find((d) => d.key === 'invoice-issue')
    expect(page).toBeDefined()
    expect(page!.title).toBe('开票单')
    expect(page!.menuParent).toBe('finance')
    expect(page!.moduleKey).toBe('invoice-issue')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileDoneOutlined')
  })

  it('defines pending-invoice-receipt-report page', () => {
    const page = financePageDefinitions.find(
      (d) => d.key === 'pending-invoice-receipt-report',
    )
    expect(page).toBeDefined()
    expect(page!.title).toBe('未收票报表')
    expect(page!.menuParent).toBe('finance')
    expect(page!.moduleKey).toBe('pending-invoice-receipt-report')
    expect(page!.searchable).toBeUndefined()
    expect(page!.icon).toBe('FileSearchOutlined')
  })

  it('defines receivable-payable page', () => {
    const page = financePageDefinitions.find(
      (d) => d.key === 'receivable-payable',
    )
    expect(page).toBeDefined()
    expect(page!.title).toBe('应收应付')
    expect(page!.menuParent).toBe('finance')
    expect(page!.moduleKey).toBe('receivable-payable')
    expect(page!.icon).toBe('CalculatorOutlined')
  })

  it('groups pages correctly by menuParent', () => {
    const statements = financePageDefinitions.filter(
      (d) => d.menuParent === 'statements',
    )
    const finance = financePageDefinitions.filter(
      (d) => d.menuParent === 'finance',
    )
    const hidden = financePageDefinitions.filter((d) => d.hiddenInMenu)

    expect(statements).toHaveLength(3)
    expect(finance).toHaveLength(6)
    expect(hidden).toHaveLength(0)
  })
})
