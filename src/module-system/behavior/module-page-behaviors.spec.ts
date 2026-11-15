import { describe, expect, it } from 'vitest'
import {
  getModuleDeliveryVerification,
  getModulePageBehavior,
  getModuleStatusCommand,
  isDeliveryVerificationStatus,
  limitsBulkAuditToSingleSelection,
  shouldAutoFillSettlementCompanyOnCreate,
} from './module-page-behaviors'

describe('module-page-behaviors', () => {
  it('销售订单注册完成销售命令与交付核定特例', () => {
    const command = getModuleStatusCommand('sales-order', 'SALES_COMPLETED')
    expect(command).toBeDefined()
    expect(command?.confirmTitle).toBe('确认完成销售')
    expect(command?.okText).toBe('完成销售')
    expect(command?.successMessage).toBe('完成销售成功')

    const deliveryVerification = getModuleDeliveryVerification('sales-order')
    expect(deliveryVerification).toEqual({
      sourceStatus: 'DELIVERY_VERIFICATION',
      targetStatus: 'SALES_COMPLETED',
    })
    expect(
      isDeliveryVerificationStatus('sales-order', 'DELIVERY_VERIFICATION'),
    ).toBe(true)
    expect(isDeliveryVerificationStatus('sales-order', 'AUDITED')).toBe(false)
  })

  it('采购入库注册仅称重特性开关与关联刷新模块', () => {
    const behavior = getModulePageBehavior('purchase-inbound')
    expect(behavior?.weightOnlyFeatureKey).toBe('weightOnlyPurchaseInbound')
    expect(behavior?.relatedRefreshModuleKeys).toEqual(['purchase-order'])
  })

  it('销售出库注册仅称重特性开关', () => {
    expect(getModulePageBehavior('sales-outbound')?.weightOnlyFeatureKey).toBe(
      'weightOnlySalesOutbound',
    )
  })

  it('project 注册 master options 特殊刷新策略', () => {
    expect(getModulePageBehavior('project')?.masterOptionRefreshMode).toBe(
      'project',
    )
    expect(
      getModulePageBehavior('supplier')?.masterOptionRefreshMode,
    ).toBeUndefined()
  })

  it('对账单模块禁止手工新建', () => {
    expect(
      getModulePageBehavior('customer-statement')?.disablesManualCreate,
    ).toBe(true)
    expect(
      getModulePageBehavior('freight-statement')?.disablesManualCreate,
    ).toBe(true)
    expect(
      getModulePageBehavior('sales-order')?.disablesManualCreate,
    ).toBeUndefined()
  })

  it('采购入库注册批量审核单选限制，其余模块不受限', () => {
    expect(limitsBulkAuditToSingleSelection('purchase-inbound')).toBe(true)
    expect(limitsBulkAuditToSingleSelection('sales-order')).toBe(false)
    expect(limitsBulkAuditToSingleSelection('unknown-module')).toBe(false)
  })

  it('采购订单注册新建自动填充结算主体，其余模块不填充', () => {
    expect(shouldAutoFillSettlementCompanyOnCreate('purchase-order')).toBe(true)
    expect(shouldAutoFillSettlementCompanyOnCreate('sales-order')).toBe(false)
    expect(shouldAutoFillSettlementCompanyOnCreate('unknown-module')).toBe(
      false,
    )
    expect(
      getModulePageBehavior('purchase-inbound')
        ?.autoFillSettlementCompanyOnCreate,
    ).toBeUndefined()
  })

  it('未知模块 key 回退为 undefined，走默认行为', () => {
    expect(getModulePageBehavior('unknown-module')).toBeUndefined()
    expect(
      getModuleStatusCommand('unknown-module', 'SALES_COMPLETED'),
    ).toBeUndefined()
    expect(getModuleStatusCommand('sales-order', 'AUDITED')).toBeUndefined()
    expect(
      isDeliveryVerificationStatus('unknown-module', 'DELIVERY_VERIFICATION'),
    ).toBe(false)
    expect(getModuleDeliveryVerification('purchase-order')).toBeUndefined()
  })
})
