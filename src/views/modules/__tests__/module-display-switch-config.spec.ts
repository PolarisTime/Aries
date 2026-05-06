import { describe, expect, it } from 'vitest'
import { operationsPageConfigs } from '@/config/business-pages/operations'
import { applyWeightOnlyViewConfig } from '../module-display-switch-config'

describe('module-display-switch-config', () => {
  it('keeps purchase inbound weigh fields while hiding all amount fields in weight-only mode', () => {
    const config = applyWeightOnlyViewConfig('purchase-inbounds', operationsPageConfigs['purchase-inbounds'])

    expect(config.columns.map((column) => column.dataIndex)).toEqual([
      'inboundNo',
      'purchaseOrderNo',
      'supplierName',
      'inboundDate',
      'totalWeight',
      'status',
      'remark',
    ])
    expect(config.detailFields.map((field) => field.key)).toEqual([
      'inboundNo',
      'purchaseOrderNo',
      'supplierName',
      'inboundDate',
      'totalWeight',
      'status',
      'remark',
    ])
    expect(config.itemColumns?.map((column) => column.dataIndex)).toContain('settlementMode')
    expect(config.itemColumns?.map((column) => column.dataIndex)).toContain('weighWeightTon')
    expect(config.itemColumns?.map((column) => column.dataIndex)).toContain('weightAdjustmentTon')
    expect(config.itemColumns?.map((column) => column.dataIndex)).not.toContain('unitPrice')
    expect(config.itemColumns?.map((column) => column.dataIndex)).not.toContain('amount')
    expect(config.itemColumns?.map((column) => column.dataIndex)).not.toContain('weightAdjustmentAmount')
    expect(config.buildOverview([{ id: '1', totalWeight: 1.234, totalAmount: 999 }])).toEqual([
      { label: '记录数', value: '1' },
      { label: '总重量合计（吨）', value: '1.234' },
    ])
  })

  it('hides sales outbound amount fields without disturbing other item columns', () => {
    const config = applyWeightOnlyViewConfig('sales-outbounds', operationsPageConfigs['sales-outbounds'])

    expect(config.columns.map((column) => column.dataIndex)).not.toContain('totalAmount')
    expect(config.detailFields.map((field) => field.key)).not.toContain('totalAmount')
    expect(config.itemColumns?.map((column) => column.dataIndex)).toContain('warehouseName')
    expect(config.itemColumns?.map((column) => column.dataIndex)).toContain('weightTon')
    expect(config.itemColumns?.map((column) => column.dataIndex)).not.toContain('unitPrice')
    expect(config.itemColumns?.map((column) => column.dataIndex)).not.toContain('amount')
  })

  it('returns the original config for modules without a weight-only variant', () => {
    const config = applyWeightOnlyViewConfig('sales-orders', operationsPageConfigs['sales-orders'])

    expect(config).toBe(operationsPageConfigs['sales-orders'])
  })
})
