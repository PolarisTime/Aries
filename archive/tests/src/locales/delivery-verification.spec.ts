import { describe, expect, it } from 'vitest'
import { enUS } from '@/locales/en-US'
import { zhCN } from '@/locales/zh-CN'

describe('delivery verification translations', () => {
  it('defines sales order row action labels in both locales', () => {
    expect(zhCN.hooks.recordActions.reopenDeliveryVerification).toBe('重新核定')
    expect(zhCN.hooks.recordActions.confirmDeliveryVerification).toBe(
      '确认无需调整',
    )
    expect(enUS.hooks.recordActions.reopenDeliveryVerification).toBe(
      'Reopen Verification',
    )
  })
})
