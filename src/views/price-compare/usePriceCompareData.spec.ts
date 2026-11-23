import { describe, expect, it } from 'vitest'
import { specRowsToVarieties } from './usePriceCompareData'

describe('specRowsToVarieties（从商品主数据派生报单比价规格）', () => {
  it('把直条归一为螺纹钢，去重跨品牌重复项，并覆盖 Φ36/Φ40 等新增规格', () => {
    const result = specRowsToVarieties([
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 40,
        length: '12米',
      },
      {
        brand: '永钢',
        category: '直条',
        material: 'HRB400E',
        spec: 40,
        length: '12米',
      },
      {
        brand: '中天',
        category: '直条',
        material: 'HRB400E',
        spec: 36,
        length: '9米',
      },
      {
        brand: '中天',
        category: '盘螺',
        material: 'HRB400',
        spec: 8,
        length: '',
      },
    ])

    expect(result).toEqual([
      {
        category: '盘螺',
        material: 'HRB400',
        spec: 8,
        length: '-',
        label: '盘螺 HRB400 8 盘',
      },
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 36,
        length: '9米',
        label: '螺纹钢 HRB400E 36 9米',
      },
      {
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 40,
        length: '12米',
        label: '螺纹钢 HRB400E 40 12米',
      },
    ])
  })

  it('过滤非法行（空类别/空材质/非正整数规格）并按品类→材质→规格→定尺排序', () => {
    const result = specRowsToVarieties([
      { category: '', material: 'HRB400', spec: 12, length: '9米' },
      { category: '直条', material: '', spec: 12, length: '9米' },
      { category: '直条', material: 'HRB400', spec: 0, length: '9米' },
      { category: '直条', material: 'HRB400', spec: 12.5, length: '9米' },
      { category: '直条', material: 'HRB400', spec: 12, length: '12米' },
      { category: '直条', material: 'HRB400', spec: 12, length: '9米' },
      { category: '直条', material: 'HRB400', spec: 10, length: '9米' },
    ])

    expect(
      result.map(
        (item) =>
          `${item.category}|${item.material}|${item.spec}|${item.length}`,
      ),
    ).toEqual([
      '螺纹钢|HRB400|10|9米',
      '螺纹钢|HRB400|12|9米',
      '螺纹钢|HRB400|12|12米',
    ])
  })
})
