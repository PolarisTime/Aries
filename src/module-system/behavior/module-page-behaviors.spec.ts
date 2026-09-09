import { describe, expect, it } from 'vitest'
import {
  getModuleDeliveryVerification,
  getModulePageBehavior,
  getModuleStatusCommand,
  isDeliveryVerificationStatus,
} from './module-page-behaviors'

describe('module-page-behaviors', () => {
  it('销售订单注册完成销售命令与交付核定特例', () => {
    const command = getModuleStatusCommand('sales-order', '完成销售')
    expect(command).toBeDefined()
    expect(command?.confirmTitle).toBe('确认完成销售')
    expect(command?.okText).toBe('完成销售')
    expect(command?.successMessage).toBe('完成销售成功')

    const deliveryVerification = getModuleDeliveryVerification('sales-order')
    expect(deliveryVerification).toEqual({
      sourceStatus: '交付核定',
      targetStatus: '完成销售',
    })
    expect(isDeliveryVerificationStatus('sales-order', '交付核定')).toBe(true)
    expect(isDeliveryVerificationStatus('sales-order', '已审核')).toBe(false)
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

  it('未知模块 key 回退为 undefined，走默认行为', () => {
    expect(getModulePageBehavior('unknown-module')).toBeUndefined()
    expect(getModuleStatusCommand('unknown-module', '完成销售')).toBeUndefined()
    expect(getModuleStatusCommand('sales-order', '已审核')).toBeUndefined()
    expect(isDeliveryVerificationStatus('unknown-module', '交付核定')).toBe(
      false,
    )
    expect(getModuleDeliveryVerification('purchase-order')).toBeUndefined()
  })
})
