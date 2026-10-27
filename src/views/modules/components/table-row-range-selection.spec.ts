import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { resolveRowRangeSelection } from '@/views/modules/components/table-row-range-selection'

function makeRows(count: number): ModuleRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `100${index}`,
    orderNo: `SO-${index}`,
  }))
}

const rows = makeRows(6)

describe('resolveRowRangeSelection —— 拖拽框选的范围计算', () => {
  it('向下拖：勾选 [起点, 当前行] 闭区间', () => {
    const result = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 1,
      focusIndex: 3,
      baseKeys: [],
      additive: false,
    })
    expect(result.keys).toEqual(['1001', '1002', '1003'])
    expect(result.rows.map((row) => row.id)).toEqual(['1001', '1002', '1003'])
  })

  it('向上拖：区间与拖拽方向无关(起止取小/大)', () => {
    const result = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 4,
      focusIndex: 2,
      baseKeys: [],
      additive: false,
    })
    expect(result.keys).toEqual(['1002', '1003', '1004'])
  })

  it('起点=当前行: 只勾一行(点住不动不会误选一片)', () => {
    const result = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 2,
      focusIndex: 2,
      baseKeys: [],
      additive: false,
    })
    expect(result.keys).toEqual(['1002'])
  })

  it('越界下标夹到首尾行(拖到表格外仍能继续扩选)', () => {
    const down = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 2,
      focusIndex: 99,
      baseKeys: [],
      additive: false,
    })
    expect(down.keys).toEqual(['1002', '1003', '1004', '1005'])

    const up = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 2,
      focusIndex: -7,
      baseKeys: [],
      additive: false,
    })
    expect(up.keys).toEqual(['1000', '1001', '1002'])
  })

  it('不按修饰键时替换原勾选(Windows 语义)', () => {
    const result = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 1,
      focusIndex: 2,
      baseKeys: ['1005'],
      additive: false,
    })
    expect(result.keys).toEqual(['1001', '1002'])
  })

  it('按住 Ctrl/⌘ 时并入原勾选, 且不重复、保持"先已有后新选"', () => {
    const result = resolveRowRangeSelection({
      dataSource: rows,
      anchorIndex: 2,
      focusIndex: 3,
      // 既包含跨页 key(不在当前 dataSource), 也包含与本段重叠的 key
      baseKeys: ['9999', '1003'],
      additive: true,
    })
    expect(result.keys).toEqual(['9999', '1003', '1002'])
    // 当前页内能提供行对象的只有 1002 / 1003; 跨页 key 交给 selectedRowMap 保留
    expect(result.rows.map((row) => row.id)).toEqual(['1002', '1003'])
  })

  it('空数据源返回空结果(不抛错)', () => {
    expect(
      resolveRowRangeSelection({
        dataSource: [],
        anchorIndex: 0,
        focusIndex: 3,
        baseKeys: ['1'],
        additive: true,
      }),
    ).toEqual({ keys: [], rows: [] })
  })
})
