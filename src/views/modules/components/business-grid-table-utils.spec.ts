import { describe, expect, it } from 'vitest'
import { distributeSurplusWidth } from '@/views/modules/components/business-grid-table-utils'

describe('distributeSurplusWidth —— 列宽富余按比例分给业务列', () => {
  const columns = [
    { key: 'a', width: 100 },
    { key: 'b', width: 200 },
  ]

  it('没有富余时原样返回(同一引用, 不触发多余渲染)', () => {
    expect(distributeSurplusWidth(columns, 0)).toBe(columns)
    expect(distributeSurplusWidth(columns, -20)).toBe(columns)
  })

  it('按列宽比例分配, 合计精确等于 原合计 + 富余', () => {
    const next = distributeSurplusWidth(columns, 60)
    // 100:200 = 1:2 → 20 / 40
    expect(next.map((column) => column.width)).toEqual([120, 240])
    const total = next.reduce((sum, column) => sum + Number(column.width), 0)
    expect(total).toBe(360)
    // 不修改入参
    expect(columns.map((column) => column.width)).toEqual([100, 200])
  })

  it('除不尽的余量由最后一列兜底(合计仍精确, 不出 1~2px 误差)', () => {
    const next = distributeSurplusWidth(
      [
        { key: 'a', width: 100 },
        { key: 'b', width: 100 },
        { key: 'c', width: 100 },
      ],
      100,
    )
    const total = next.reduce((sum, column) => sum + Number(column.width), 0)
    expect(total).toBe(400)
  })

  it('空列集不炸', () => {
    expect(distributeSurplusWidth([], 60)).toEqual([])
  })

  it('没写宽度的列按默认列宽(120)参与分配, 与 sumColumnWidths 口径一致', () => {
    const next = distributeSurplusWidth(
      [{ key: 'a', width: 120 }, { key: 'b' }],
      60,
    )
    // 120:120 = 1:1 → 各 +30
    expect(next.map((column) => column.width)).toEqual([150, 150])
  })
})
