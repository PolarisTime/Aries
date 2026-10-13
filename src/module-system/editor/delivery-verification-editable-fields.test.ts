import { describe, expect, it } from 'vitest'
import {
  isEditorFieldDisabledForModule,
  isModuleLineItemsLocked,
} from '@/module-system/editor/module-editor-access'

/**
 * 交付核定状态下的可编辑字段回归。
 *
 * <p>业务要求：交付核定单据允许调整送货日期、报单日期（取价基准 ORDER 的锚点）与备注，
 * 其余字段仍锁定。报单日期此前不在白名单里，交付核定下无法修改。</p>
 */

const DELIVERY_VERIFICATION = '交付核定'

/** 交付核定（明细锁定）时该字段是否可编辑。 */
const editableInDeliveryVerification = (fieldKey: string) =>
  !isEditorFieldDisabledForModule(
    'sales-order',
    fieldKey,
    false,
    true,
    isModuleLineItemsLocked('sales-order', [DELIVERY_VERIFICATION]),
  )

describe('销售订单交付核定可编辑字段', () => {
  it('交付核定会锁定明细（作为判定前提）', () => {
    expect(
      isModuleLineItemsLocked('sales-order', [DELIVERY_VERIFICATION]),
    ).toBe(true)
  })

  it('允许编辑送货日期、报单日期与备注', () => {
    expect(editableInDeliveryVerification('deliveryDate')).toBe(true)
    expect(editableInDeliveryVerification('orderDate')).toBe(true)
    expect(editableInDeliveryVerification('remark')).toBe(true)
  })

  it('其余单据字段在交付核定下仍锁定', () => {
    for (const fieldKey of [
      'customerId',
      'projectId',
      'salesName',
      'purchaseOrderNo',
      'orderNo',
    ]) {
      expect(
        editableInDeliveryVerification(fieldKey),
        `${fieldKey} 不应在交付核定下可编辑`,
      ).toBe(false)
    }
  })
})
