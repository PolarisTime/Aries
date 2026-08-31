import { describe, expect, it } from 'vitest'
import { compactFreightItemColumns } from './shared-item-column-freight'

describe('compactFreightItemColumns', () => {
  it('物流单明细不重复展示分组表头中的客户和项目，也不展示商品名称', () => {
    const dataIndexes = compactFreightItemColumns.map(
      (column) => column.dataIndex,
    )

    expect(dataIndexes).not.toContain('customerName')
    expect(dataIndexes).not.toContain('projectName')
    expect(dataIndexes).not.toContain('materialName')
  })

  it('仓库和品牌紧跟出库单号，并排在规格之前', () => {
    const dataIndexes = compactFreightItemColumns.map(
      (column) => column.dataIndex,
    )

    expect(dataIndexes.slice(0, 4)).toEqual([
      'sourceNo',
      'warehouseName',
      'brand',
      'spec',
    ])
  })
})
