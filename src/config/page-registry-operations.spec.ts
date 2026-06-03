import { describe, expect, it } from 'vitest'
import { operationPageDefinitions } from './page-registry-operations'

describe('page-registry-operations', () => {
  it('exports a non-empty array', () => {
    expect(Array.isArray(operationPageDefinitions)).toBe(true)
    expect(operationPageDefinitions.length).toBeGreaterThan(0)
  })

  it('each definition has required fields', () => {
    for (const def of operationPageDefinitions) {
      expect(def.key).toBeDefined()
      expect(def.title).toBeDefined()
      expect(def.menuKey).toBeDefined()
      expect(def.view).toBeDefined()
      expect(def.icon).toBeDefined()
    }
  })

  it('defines purchase-order page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'purchase-order')
    expect(page).toBeDefined()
    expect(page!.title).toBe('采购订单')
    expect(page!.menuParent).toBe('purchase')
    expect(page!.moduleKey).toBe('purchase-order')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('ProfileOutlined')
  })

  it('defines purchase-inbound page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'purchase-inbound')
    expect(page).toBeDefined()
    expect(page!.title).toBe('采购入库')
    expect(page!.menuParent).toBe('purchase')
    expect(page!.moduleKey).toBe('purchase-inbound')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('InboxOutlined')
  })

  it('defines sales-order page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'sales-order')
    expect(page).toBeDefined()
    expect(page!.title).toBe('销售订单')
    expect(page!.menuParent).toBe('sales')
    expect(page!.moduleKey).toBe('sales-order')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileDoneOutlined')
  })

  it('defines sales-outbound page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'sales-outbound')
    expect(page).toBeDefined()
    expect(page!.title).toBe('销售出库')
    expect(page!.menuParent).toBe('sales')
    expect(page!.moduleKey).toBe('sales-outbound')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('SwapOutlined')
  })

  it('defines freight-bill page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'freight-bill')
    expect(page).toBeDefined()
    expect(page!.title).toBe('物流单')
    expect(page!.menuParent).toBe('freight')
    expect(page!.moduleKey).toBe('freight-bill')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('CarOutlined')
  })

  it('defines purchase-contract page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'purchase-contract')
    expect(page).toBeDefined()
    expect(page!.title).toBe('采购合同')
    expect(page!.menuParent).toBe('contracts')
    expect(page!.moduleKey).toBe('purchase-contract')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('ProfileOutlined')
  })

  it('defines sales-contract page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'sales-contract')
    expect(page).toBeDefined()
    expect(page!.title).toBe('销售合同')
    expect(page!.menuParent).toBe('contracts')
    expect(page!.moduleKey).toBe('sales-contract')
    expect(page!.searchable).toBe(true)
    expect(page!.icon).toBe('FileDoneOutlined')
  })

  it('defines inventory-report page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'inventory-report')
    expect(page).toBeDefined()
    expect(page!.title).toBe('商品库存报表')
    expect(page!.menuParent).toBe('reports')
    expect(page!.moduleKey).toBe('inventory-report')
    expect(page!.searchable).toBeUndefined()
    expect(page!.icon).toBe('BarChartOutlined')
  })

  it('defines io-report page', () => {
    const page = operationPageDefinitions.find((d) => d.key === 'io-report')
    expect(page).toBeDefined()
    expect(page!.title).toBe('出入库报表')
    expect(page!.menuParent).toBe('reports')
    expect(page!.moduleKey).toBe('io-report')
    expect(page!.icon).toBe('SwapOutlined')
  })

  it('groups pages by menuParent correctly', () => {
    const purchase = operationPageDefinitions.filter((d) => d.menuParent === 'purchase')
    const sales = operationPageDefinitions.filter((d) => d.menuParent === 'sales')
    const freight = operationPageDefinitions.filter((d) => d.menuParent === 'freight')
    const contracts = operationPageDefinitions.filter((d) => d.menuParent === 'contracts')
    const reports = operationPageDefinitions.filter((d) => d.menuParent === 'reports')

    expect(purchase).toHaveLength(2)
    expect(sales).toHaveLength(2)
    expect(freight).toHaveLength(1)
    expect(contracts).toHaveLength(2)
    expect(reports).toHaveLength(2)
  })
})
