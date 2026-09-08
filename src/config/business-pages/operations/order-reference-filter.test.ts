import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import type { ModulePageConfig } from '@/types/module-page'

let purchaseOrdersPageConfig: ModulePageConfig
let salesOrdersPageConfig: ModulePageConfig

describe('订单下游引用筛选', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
    ;({ purchaseOrdersPageConfig } = await import(
      '@/config/business-pages/operations/purchase-order-page'
    ))
    ;({ salesOrdersPageConfig } = await import(
      '@/config/business-pages/operations/sales-order-page'
    ))
  })

  it('销售订单提供按实际下游模块的关联选项', () => {
    const filter = salesOrdersPageConfig.filters.find(
      (item) => item.key === 'referencedBy',
    )
    expect(filter?.type).toBe('segmented')
    const options = Array.isArray(filter?.options) ? filter.options : []
    expect(
      options.map((option) => ('value' in option ? option.value : undefined)),
    ).toEqual(['freight-bill', 'sales-outbound', 'none'])
    expect(
      options.map((option) => ('label' in option ? option.label : undefined)),
    ).toEqual(['被物流单引用', '被销售出库引用', '未被引用'])
  })

  it('采购订单提供按实际下游模块的关联选项', () => {
    const filter = purchaseOrdersPageConfig.filters.find(
      (item) => item.key === 'referencedBy',
    )
    expect(filter?.type).toBe('segmented')
    const options = Array.isArray(filter?.options) ? filter.options : []
    expect(
      options.map((option) => ('value' in option ? option.value : undefined)),
    ).toEqual(['sales-order', 'purchase-inbound', 'none'])
    expect(
      options.map((option) => ('label' in option ? option.label : undefined)),
    ).toEqual(['被销售订单引用', '被采购入库引用', '未被引用'])
  })

  it('订单筛选标签声明为下游引用', () => {
    for (const config of [purchaseOrdersPageConfig, salesOrdersPageConfig]) {
      const filter = config.filters.find((item) => item.key === 'referencedBy')
      expect(filter?.label).toBe('下游引用')
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

  it('订单日期不展示快捷日期选择器', () => {
    expect(
      purchaseOrdersPageConfig.filters.find((item) => item.key === 'orderDate')
        ?.showQuickDateFilter,
    ).toBe(false)
  })

  it('将下游模块关联筛选参数声明为订单接口原生筛选', () => {
    expect(
      operationModuleEndpointContracts['purchase-order'].nativeFilterKeys,
    ).toContain('referencedBy')
    expect(
      operationModuleEndpointContracts['sales-order'].nativeFilterKeys,
    ).toContain('referencedBy')
  })
})
