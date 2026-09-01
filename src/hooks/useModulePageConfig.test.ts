import { describe, expect, it } from 'vitest'
import { purchaseInboundsPageConfig } from '@/config/business-pages/operations/purchase-inbound-page'
import { salesOutboundsPageConfig } from '@/config/business-pages/operations/sales-outbound-page'
import { buildWeightOnlyViewConfig } from './useModulePageConfig'

describe('buildWeightOnlyViewConfig', () => {
  it('重量模式同步过滤保存结果摘要中的金额字段', () => {
    const purchaseInbound = buildWeightOnlyViewConfig(
      purchaseInboundsPageConfig,
    )
    const salesOutbound = buildWeightOnlyViewConfig(salesOutboundsPageConfig)

    expect(
      purchaseInbound.saveResultItemColumns?.map((column) => column.dataIndex),
    ).not.toContain('unitPrice')
    expect(
      purchaseInbound.saveResultItemColumns?.map((column) => column.dataIndex),
    ).not.toContain('amount')
    expect(
      salesOutbound.saveResultItemColumns?.map((column) => column.dataIndex),
    ).not.toContain('unitPrice')
    expect(
      salesOutbound.saveResultItemColumns?.map((column) => column.dataIndex),
    ).not.toContain('amount')
  })
})
