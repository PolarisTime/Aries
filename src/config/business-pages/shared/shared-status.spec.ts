import { describe, expect, it } from 'vitest'
import { actionSet, statusMap } from './shared-status'

describe('statusMap', () => {
  it('contains expected status entries', () => {
    const expectedKeys = [
      '草稿',
      '预出库',
      '完成采购',
      '完成入库',
      '完成销售',
      '待核准',
      '已核准',
      '未审核',
      '已审核',
      '部分入库',
      '部分出库',
      '已完成',
      '待确认',
      '已确认',
      '待审核',
      '已签署',
      '未签署',
      '已收款',
      '已付款',
      '已收票',
      '已开票',
      '未收票',
      '部分结清',
      '执行中',
      '已归档',
      '正常',
      '禁用',
      '成功',
      '失败',
      '已删除',
    ]

    for (const key of expectedKeys) {
      expect(statusMap[key]).toBeDefined()
      expect(statusMap[key].text).toBeTruthy()
      expect([
        'default',
        'success',
        'warning',
        'processing',
        'error',
      ]).toContain(statusMap[key].color)
    }
  })

  it('has correct color for success statuses', () => {
    const successStatuses = [
      '完成采购',
      '完成入库',
      '已确认',
      '已审核',
      '已收款',
      '已付款',
      '正常',
      '成功',
      '已完成',
    ]
    for (const key of successStatuses) {
      expect(statusMap[key].color).toBe('success')
    }
  })

  it('has correct color for warning statuses', () => {
    const warningStatuses = [
      '待核准',
      '未审核',
      '待确认',
      '待审核',
      '未收票',
      '草稿',
      '预出库',
      '未签署',
    ]
    for (const key of warningStatuses) {
      expect(statusMap[key].color).toBe('warning')
    }
    expect(statusMap.禁用.color).toBe('error')
    expect(statusMap.失败.color).toBe('error')
    expect(statusMap.已删除.color).toBe('error')
  })

  it('contains deleted display metadata', () => {
    expect(statusMap.已删除).toMatchObject({
      text: expect.any(String),
      color: 'error',
    })
    expect(statusMap.已删除.text).toBeTruthy()
  })
})

describe('actionSet', () => {
  it('has create and export actions', () => {
    expect(actionSet).toHaveLength(2)
    expect(actionSet[0].key).toBe('create')
    expect(actionSet[0].type).toBe('primary')
    expect(actionSet[1].key).toBe('export')
    expect(actionSet[1].type).toBe('default')
  })
})
