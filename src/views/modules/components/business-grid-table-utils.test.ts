import { describe, expect, it } from 'vitest'
import {
  buildTableScrollConfig,
  computeTableAvailableHeight,
} from '@/views/modules/components/business-grid-table-utils'

describe('业务表格布局稳定性', () => {
  it('隐藏标签页的零高度容器不回退为视口高度', () => {
    expect(computeTableAvailableHeight(0)).toBe(0)
  })

  it('空表与有数据表保持相同的滚动容器结构', () => {
    const options = {
      isVirtual: false,
      scrollX: 940,
      scrollY: 480,
      shellWidth: 720,
    }

    expect(buildTableScrollConfig({ ...options, dataLength: 0 })).toEqual({
      x: 940,
      y: 480,
    })
    expect(buildTableScrollConfig({ ...options, dataLength: 1 })).toEqual({
      x: 940,
      y: 480,
    })
  })
})
