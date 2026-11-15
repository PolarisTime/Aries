import { describe, expect, it } from 'vitest'
import { statusMap } from '@/config/business-pages/shared/shared-status'
import { DOCUMENT_STATUS } from '@/constants/status-constants'

describe('业务状态标签颜色', () => {
  it('分别区分审核、核定与完成类状态', () => {
    // 键是状态 code（后端 V219 起返回英文），不再是中文 label
    expect(statusMap[DOCUMENT_STATUS.AUDITED]?.color).toBe('success')
    expect(statusMap[DOCUMENT_STATUS.DELIVERY_VERIFICATION]?.color).toBe(
      'processing',
    )

    for (const status of [
      DOCUMENT_STATUS.PURCHASE_COMPLETED,
      DOCUMENT_STATUS.INBOUND_COMPLETED,
      DOCUMENT_STATUS.SALES_COMPLETED,
      DOCUMENT_STATUS.COMPLETED,
    ]) {
      expect(statusMap[status]?.color).toBe('cyan')
      expect(statusMap[status]?.color).not.toBe(
        statusMap[DOCUMENT_STATUS.AUDITED]?.color,
      )
      expect(statusMap[status]?.color).not.toBe(
        statusMap[DOCUMENT_STATUS.DELIVERY_VERIFICATION]?.color,
      )
    }
  })
})
