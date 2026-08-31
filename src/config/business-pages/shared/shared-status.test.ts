import { describe, expect, it } from 'vitest'
import { statusMap } from '@/config/business-pages/shared/shared-status'

describe('业务状态标签颜色', () => {
  it('分别区分审核、核定与完成类状态', () => {
    expect(statusMap.已审核?.color).toBe('success')
    expect(statusMap.交付核定?.color).toBe('processing')

    for (const status of ['完成采购', '完成入库', '完成销售', '已完成']) {
      expect(statusMap[status]?.color).toBe('cyan')
      expect(statusMap[status]?.color).not.toBe(statusMap.已审核?.color)
      expect(statusMap[status]?.color).not.toBe(statusMap.交付核定?.color)
    }
  })
})
