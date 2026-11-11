import { describe, expect, it } from 'vitest'
import { shouldEllipsizeColumn } from './table-column-ellipsis'

describe('shouldEllipsizeColumn —— 短值不省略', () => {
  it.each([
    'amount',
    'weight',
    'count',
    'date',
    'datetime',
    'status',
    'boolean',
  ] as const)('%s 类型默认不省略（放不下改为横向滚动）', (type) => {
    expect(shouldEllipsizeColumn({ type })).toBe(false)
  })

  it('文本列默认省略（全文由 antd 写进 title）', () => {
    expect(shouldEllipsizeColumn({ type: 'text' })).toBe(true)
    expect(shouldEllipsizeColumn({})).toBe(true)
  })

  it('列上显式声明优先于类型默认值', () => {
    expect(shouldEllipsizeColumn({ type: 'text', ellipsis: false })).toBe(false)
    expect(shouldEllipsizeColumn({ type: 'amount', ellipsis: true })).toBe(true)
  })
})
