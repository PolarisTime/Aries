import { describe, expect, it } from 'vitest'
import { freightOperationsPageConfigs } from './freight-operations'
import { purchaseInboundsPageConfig } from './purchase-inbound-page'
import { purchaseOrdersPageConfig } from './purchase-order-page'
import { salesOrdersPageConfig } from './sales-order-page'
import { salesOutboundsPageConfig } from './sales-outbound-page'

function dataIndexes(config: { itemColumns?: { dataIndex: string }[] }) {
  return (config.itemColumns ?? []).map((column) => column.dataIndex)
}

describe('销售订单明细列', () => {
  const columns = salesOrdersPageConfig.itemColumns ?? []

  it('默认列顺序与基线一致：仓库在品牌前，商品编码与批号不进入页面白名单', () => {
    expect(dataIndexes(salesOrdersPageConfig)).toEqual([
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
      'unitPrice',
      'amount',
      'deliveredQuantity',
      'returnedQuantity',
      'deliveredNetQuantity',
      'outboundRemainingQuantity',
    ])
    expect(dataIndexes(salesOrdersPageConfig)).not.toContain('materialCode')
    expect(dataIndexes(salesOrdersPageConfig)).not.toContain('batchNo')
  })

  it('仓库名称在品牌左侧且宽度与基线一致', () => {
    const warehouseIndex = columns.findIndex(
      (column) => column.dataIndex === 'warehouseName',
    )
    const brandIndex = columns.findIndex(
      (column) => column.dataIndex === 'brand',
    )
    expect(warehouseIndex).toBe(0)
    expect(warehouseIndex).toBeLessThan(brandIndex)
    expect(columns[warehouseIndex]?.width).toBe(160)
  })

  it('材质列承载物料选择，隐藏商品编码后仍可满足保存契约', () => {
    expect(
      columns.find((column) => column.dataIndex === 'material')?.editor,
    ).toEqual({ control: 'material' })
  })

  it('保存结果摘要列由模块配置投影决定', () => {
    expect(
      salesOrdersPageConfig.saveResultItemColumns?.map(
        (column) => column.dataIndex,
      ),
    ).toEqual([
      'brand',
      'material',
      'spec',
      'length',
      'quantity',
      'weightTon',
      'unitPrice',
      'amount',
    ])
  })
})

describe('采购订单明细列', () => {
  it('包含磅差派生列，位于实际重量之后、单价之前；未入库列位于行尾', () => {
    const keys = dataIndexes(purchaseOrdersPageConfig)
    expect(keys).toEqual([
      'materialCode',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'warehouseName',
      'batchNo',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'actualWeightTon',
      'weightVarianceTon',
      'unitPrice',
      'amount',
      'remainingQuantity',
    ])
  })

  it('实际重量列为重量类型', () => {
    const column = purchaseOrdersPageConfig.itemColumns?.find(
      (item) => item.dataIndex === 'actualWeightTon',
    )
    expect(column?.type).toBe('weight')
  })

  it('磅差列为只读重量类型且默认隐藏', () => {
    const column = purchaseOrdersPageConfig.itemColumns?.find(
      (item) => item.dataIndex === 'weightVarianceTon',
    )
    expect(column?.type).toBe('weight')
    expect(column?.align).toBe('right')
    expect(
      purchaseOrdersPageConfig.itemColumnConfig?.hiddenByDefault,
    ).toContain('weightVarianceTon')
  })

  it('未入库列为只读数量类型，位于行尾', () => {
    const column = purchaseOrdersPageConfig.itemColumns?.find(
      (item) => item.dataIndex === 'remainingQuantity',
    )
    expect(column?.type).toBe('count')
    expect(column?.align).toBe('right')
  })

  it('列表页展示订单级未入库件数列', () => {
    const column = purchaseOrdersPageConfig.columns.find(
      (item) => item.dataIndex === 'totalRemainingQuantity',
    )
    expect(column?.type).toBe('count')
    expect(column?.align).toBe('right')
  })

  it('列表页在总金额后依次展示实际货值、差额与入库进度列', () => {
    const keys = purchaseOrdersPageConfig.columns.map((item) => item.dataIndex)
    const totalAmountIndex = keys.indexOf('totalAmount')
    expect(keys.slice(totalAmountIndex, totalAmountIndex + 5)).toEqual([
      'totalAmount',
      'totalActualAmount',
      'totalAmountDifference',
      'totalReceivedQuantity',
      'totalRemainingQuantity',
    ])
  })

  it('实际货值与差额均为右对齐金额列', () => {
    const actual = purchaseOrdersPageConfig.columns.find(
      (item) => item.dataIndex === 'totalActualAmount',
    )
    const difference = purchaseOrdersPageConfig.columns.find(
      (item) => item.dataIndex === 'totalAmountDifference',
    )
    expect(actual?.type).toBe('amount')
    expect(actual?.align).toBe('right')
    expect(difference?.type).toBe('amount')
    expect(difference?.align).toBe('right')
  })

  it('入库进度列为自定义渲染列', () => {
    const column = purchaseOrdersPageConfig.columns.find(
      (item) => item.dataIndex === 'totalReceivedQuantity',
    )
    expect(typeof column?.render).toBe('function')
  })

  it('实际货值、差额与入库进度列默认可见', () => {
    const hidden = purchaseOrdersPageConfig.defaultHiddenColumnKeys ?? []
    expect(hidden).not.toContain('totalActualAmount')
    expect(hidden).not.toContain('totalAmountDifference')
    expect(hidden).not.toContain('totalReceivedQuantity')
  })
})

describe('采购入库明细列', () => {
  it('结算方式、过磅与调重字段位于重量吨之后、单价之前', () => {
    const keys = dataIndexes(purchaseInboundsPageConfig)
    const weightTonIndex = keys.indexOf('weightTon')
    const unitPriceIndex = keys.indexOf('unitPrice')
    expect(keys.slice(weightTonIndex + 1, unitPriceIndex)).toEqual([
      'settlementMode',
      'weighWeightTon',
      'weightAdjustmentTon',
      'weightAdjustmentAmount',
    ])
  })
})

describe('销售出库明细列', () => {
  it('复用采购基础列顺序且不包含实际重量', () => {
    expect(dataIndexes(salesOutboundsPageConfig)).toEqual([
      'materialCode',
      'brand',
      'category',
      'material',
      'spec',
      'length',
      'unit',
      'warehouseName',
      'batchNo',
      'quantity',
      'quantityUnit',
      'pieceWeightTon',
      'weightTon',
      'unitPrice',
      'amount',
      'outboundRemainingQuantity',
    ])
  })
})

describe('物流单明细列', () => {
  const config = freightOperationsPageConfigs['freight-bill']

  it('不展示客户/项目/商品名称/商品编码/批号/每件支数', () => {
    const keys = dataIndexes(config)
    expect(keys).not.toContain('customerName')
    expect(keys).not.toContain('projectName')
    expect(keys).not.toContain('materialName')
    expect(keys).not.toContain('materialCode')
    expect(keys).not.toContain('batchNo')
    expect(keys).not.toContain('piecesPerBundle')
  })

  it('按出库单号、仓库、品牌、类别、材质、规格、长度、单位和数量顺序展示', () => {
    expect(dataIndexes(config)).toEqual([
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

  it('保存结果摘要列来自模块配置投影', () => {
    expect(
      config.saveResultItemColumns?.map((column) => column.dataIndex),
    ).toEqual([
      'warehouseName',
      'brand',
      'material',
      'spec',
      'length',
      'quantity',
      'weightTon',
    ])
  })
})
