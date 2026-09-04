import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import type { ModulePageConfig } from '@/types/module-page'

let purchaseOrdersPageConfig: ModulePageConfig
let salesOrdersPageConfig: ModulePageConfig

describe('订单被什么关联筛选', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
    ;({ purchaseOrdersPageConfig } = await import(
      '@/config/business-pages/operations/purchase-order-page'
    ))
    ;({ salesOrdersPageConfig } = await import(
      '@/config/business-pages/operations/sales-order-page'
    ))
  })

  it('采购订单和销售订单都提供被什么关联选项', () => {
    for (const config of [purchaseOrdersPageConfig, salesOrdersPageConfig]) {
      const filter = config.filters.find((item) => item.key === 'referenced')
      expect(filter?.key).toBe('referenced')
      expect(filter?.type).toBe('segmented')
      const options = Array.isArray(filter?.options) ? filter.options : []
      expect(options).toHaveLength(2)
      expect(
        options.map((option) => ('value' in option ? option.value : undefined)),
      ).toEqual(['true', 'false'])
    }
  })

  it('订单筛选标签声明为被什么关联', () => {
    for (const config of [purchaseOrdersPageConfig, salesOrdersPageConfig]) {
      const filter = config.filters.find((item) => item.key === 'referenced')
      expect(filter?.label).toBe('被什么关联')
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
