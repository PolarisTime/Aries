import { describe, expect, it } from 'vitest'

function resolveSortingState(
  columnKey?: string | number,
  order?: 'ascend' | 'descend' | null,
) {
  if (!columnKey || !order) {
    return []
  }

  return [
    {
      id: String(columnKey),
      desc: order === 'descend',
    },
  ]
}

describe('use-business-grid-table sorting bridge', () => {
  it('maps antd ascend sorter to tanstack sorting state', () => {
    expect(resolveSortingState('orderDate', 'ascend')).toEqual([
      { id: 'orderDate', desc: false },
    ])
  })

  it('maps antd descend sorter to tanstack sorting state', () => {
    expect(resolveSortingState('weightTon', 'descend')).toEqual([
      { id: 'weightTon', desc: true },
    ])
  })

  it('clears sorting when sorter is removed', () => {
    expect(resolveSortingState('orderDate', null)).toEqual([])
    expect(resolveSortingState(undefined, 'ascend')).toEqual([])
  })
})
