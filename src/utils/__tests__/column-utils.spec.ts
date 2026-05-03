import { describe, expect, it } from 'vitest'
import { inferColumnAlign } from '../column-utils'

describe('inferColumnAlign', () => {
  it('centers plain business columns by default', () => {
    expect(inferColumnAlign({ title: '客户名称', dataIndex: 'customerName' })).toBe('center')
  })

  it('keeps numeric columns right aligned and explicit alignment unchanged', () => {
    expect(inferColumnAlign({ title: '金额', dataIndex: 'amount', type: 'amount' })).toBe('right')
    expect(inferColumnAlign({ title: '备注', dataIndex: 'remark', align: 'left' })).toBe('left')
  })
})
