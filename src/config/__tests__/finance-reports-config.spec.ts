import { getMaterialCategoryOptions, getWarehouseOptions } from '@/constants/module-options'
import { financeAndReportPageConfigs } from '@/config/business-pages/finance-reports'

describe('finance reports page config', () => {
  it('uses dynamic master-data options for inventory report filters', () => {
    const config = financeAndReportPageConfigs['inventory-report']
    const warehouseFilter = config.filters.find((filter) => filter.key === 'warehouseName')
    const categoryFilter = config.filters.find((filter) => filter.key === 'category')

    expect(warehouseFilter?.options).toBe(getWarehouseOptions)
    expect(categoryFilter?.options).toBe(getMaterialCategoryOptions)
  })

  it('shows brand in io report list and detail config', () => {
    const config = financeAndReportPageConfigs['io-report']

    expect(config.columns.map((column) => column.dataIndex)).toContain('brand')
    expect(config.detailFields.map((field) => field.key)).toContain('brand')
  })
})
