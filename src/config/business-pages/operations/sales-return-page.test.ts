import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import { salesReturnsPageConfig } from './sales-return-page'

describe('销售退货单页面配置', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
  })

  it('页面 key 与主编号字段符合模块注册约定', () => {
    expect(salesReturnsPageConfig.key).toBe('sales-return')
    expect(salesReturnsPageConfig.primaryNoKey).toBe('returnNo')
  })

  it('筛选条件覆盖关键词、客户、状态与退货日期区间', () => {
    expect(salesReturnsPageConfig.filters.map((filter) => filter.key)).toEqual([
      'keyword',
      'customerId',
      'status',
      'projectId',
      'returnDate',
    ])
  })

  it('明细列包含数量、单价、金额、重量', () => {
    const keys = (salesReturnsPageConfig.itemColumns ?? []).map(
      (column) => column.dataIndex,
    )
    expect(keys).toEqual(
      expect.arrayContaining(['quantity', 'unitPrice', 'amount', 'weightTon']),
    )
  })

  it('接口契约声明 /sales-returns 与日期区间映射', () => {
    const contract = operationModuleEndpointContracts['sales-return']
    expect(contract.path).toBe('/sales-returns')
    expect(contract.nativeFilterKeys).toContain('keyword')
    expect(contract.nativeFilterKeys).toContain('status')
    expect(contract.dateRangeMapping?.returnDate).toEqual({
      startKey: 'startDate',
      endKey: 'endDate',
    })
  })
})
