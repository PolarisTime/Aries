import { describe, expect, it } from 'vitest'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import { purchaseOrdersPageConfig } from '@/config/business-pages/operations/purchase-order-page'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'

describe('订单是否被关联筛选', () => {
  it('采购订单和销售订单都提供已关联/未关联选项', () => {
    for (const config of [purchaseOrdersPageConfig, salesOrdersPageConfig]) {
      const filter = config.filters.find((item) => item.key === 'referenced')
      expect(filter?.key).toBe('referenced')
      const options = Array.isArray(filter?.options) ? filter.options : []
      expect(options).toHaveLength(2)
      expect(
        options.map((option) => ('value' in option ? option.value : undefined)),
      ).toEqual(['true', 'false'])
    }
  })

  it('订单状态分段不保留隐藏的待处理默认条件', () => {
    for (const config of [purchaseOrdersPageConfig, salesOrdersPageConfig]) {
      expect(config.defaultFilters?.pendingOnly).toBeUndefined()
      expect(
        config.filters.find((item) => item.key === 'status')?.resetKeysOnChange,
      ).toBeUndefined()
    }
  })

  it('将引用筛选参数声明为订单接口原生筛选', () => {
    expect(
      operationModuleEndpointContracts['purchase-order'].nativeFilterKeys,
    ).toContain('referenced')
    expect(
      operationModuleEndpointContracts['sales-order'].nativeFilterKeys,
    ).toContain('referenced')
  })
})
