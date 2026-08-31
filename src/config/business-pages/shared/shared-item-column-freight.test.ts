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

  it('按出库单号、仓库、品牌、类别、材质、规格、长度、单位和数量顺序展示', () => {
    const dataIndexes = compactFreightItemColumns.map(
      (column) => column.dataIndex,
    )

    expect(dataIndexes).toEqual([
      'sourceNo',
      'warehouseName',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
    ])
  })
})
