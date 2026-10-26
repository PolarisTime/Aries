import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import { renderProjectNameCell } from '@/utils/project-display'
import { salesReturnsPageConfig } from './sales-return-page'

describe('销售退货单页面配置', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
  })

  it('页面 key 与主编号字段符合模块注册约定', () => {
    expect(salesReturnsPageConfig.key).toBe('sales-return')
    expect(salesReturnsPageConfig.primaryNoKey).toBe('returnNo')
  })

  it('筛选条件覆盖关键词、商品信息、客户、状态与退货日期区间', () => {
    expect(salesReturnsPageConfig.filters.map((filter) => filter.key)).toEqual([
      'keyword',
      'productKeyword',
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

  it('「项目名称」列显示「简称（全称）」，无简称时只显示全称', () => {
    const column = salesReturnsPageConfig.columns.find(
      (item) => item.dataIndex === 'projectName',
    )

    expect(column?.render).toBe(renderProjectNameCell)
    expect(column?.width).toBe(240)
    expect(
      column?.render?.(undefined, {
        id: '1',
        projectNameAbbr: '东钢',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('东钢（广东东钢供应链有限公司）')
    expect(
      column?.render?.(undefined, {
        id: '1',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('广东东钢供应链有限公司')
  })
})
