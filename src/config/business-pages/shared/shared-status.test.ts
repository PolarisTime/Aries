import { describe, expect, it } from 'vitest'
import { statusMap } from '@/config/business-pages/shared/shared-status'

describe('业务状态标签颜色', () => {
  it('使用不同颜色区分已审核与完成类状态', () => {
    expect(statusMap.已审核?.color).toBe('success')

    for (const status of ['完成采购', '完成入库', '完成销售', '已完成']) {
      expect(statusMap[status]?.color).toBe('processing')
      expect(statusMap[status]?.color).not.toBe(statusMap.已审核?.color)
    }
  })
})
