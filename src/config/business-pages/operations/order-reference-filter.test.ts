import i18next from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { operationModuleEndpointContracts } from '@/api/contracts/module-contracts-operations'
import type { ModulePageConfig } from '@/types/module-page'

let purchaseOrdersPageConfig: ModulePageConfig
let salesOrdersPageConfig: ModulePageConfig

/**
 * 「下游引用」筛选已整体下线（产品要求）：采购订单与销售订单列表都不再提供
 * `referencedBy` 筛选项，接口契约也不再声明该查询参数。
 *
 * <p>这里从"功能存在"翻转为"功能不再回来"的守卫：若有人把筛选或查询参数加回来，
 * 两条断言会分别失败。</p>
 */
describe('订单下游引用筛选已下线', () => {
  beforeAll(async () => {
    await i18next.changeLanguage('zh-CN')
    ;({ purchaseOrdersPageConfig } = await import(
      '@/config/business-pages/operations/purchase-order-page'
    ))
    ;({ salesOrdersPageConfig } = await import(
      '@/config/business-pages/operations/sales-order-page'
    ))
  })

  it('采购订单与销售订单列表都不再有 referencedBy 筛选项', () => {
    for (const config of [purchaseOrdersPageConfig, salesOrdersPageConfig]) {
      expect(config.filters.some((item) => item.key === 'referencedBy')).toBe(
        false,
      )
    }
  })

  it('订单接口契约不再声明 referencedBy 查询参数', () => {
    expect(
      operationModuleEndpointContracts['purchase-order'].nativeFilterKeys,
    ).not.toContain('referencedBy')
    expect(
      operationModuleEndpointContracts['sales-order'].nativeFilterKeys,
    ).not.toContain('referencedBy')
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
})
