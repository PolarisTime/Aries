import { describe, expect, it } from 'vitest'
import type { QuoteRow } from './supplier-price-list-model'
import {
  applyBrandOrder,
  buildBasePriceFillPlan,
  buildSlots,
  buildSpecPastePlan,
  filterSpecRows,
  groupSpecRows,
  lengthRank,
  orderedLengths,
  parseBrandPrefs,
  parseClipboardGrid,
  parseGridPrice,
  reorderBrands,
  rowKeyOfCell,
  SHEET_COLUMN_WIDTH,
  serializeBrandPrefs,
  sheetWidthOf,
  shiftBrand,
  specRowKey,
  toggleHidden,
} from './supplier-quote-grid'

const row = (spec: number, length: string, material = 'HRB400E'): QuoteRow => ({
  category: '螺纹钢',
  material,
  spec,
  length,
})

describe('Excel 剪贴板解析', () => {
  it('按行/制表符切分，并去掉末尾空行', () => {
    expect(parseClipboardGrid('3280\t3290\n3300\t3310\n')).toEqual([
      ['3280', '3290'],
      ['3300', '3310'],
    ])
  })

  it('兼容 CRLF 与单元格内空格', () => {
    expect(parseClipboardGrid(' 3280 \r\n 3290 \r\n')).toEqual([
      ['3280'],
      ['3290'],
    ])
  })

  it('空文本不产生矩阵', () => {
    expect(parseClipboardGrid('   ')).toEqual([])
  })
})

describe('价格解析：空串=清空、非法=丢弃', () => {
  it('空串表示清空', () => {
    expect(parseGridPrice('')).toBeNull()
    expect(parseGridPrice('  ')).toBeNull()
  })

  it('支持千分位与小数', () => {
    expect(parseGridPrice('3,280.50')).toBe(3280.5)
  })

  it('负数与非数字返回 undefined', () => {
    expect(parseGridPrice('-1')).toBeUndefined()
    expect(parseGridPrice('abc')).toBeUndefined()
  })
})

describe('定尺排序：9米 在 12米 左边，无定尺排最后', () => {
  it('按报价单习惯排序，而不是按字符串', () => {
    expect(lengthRank('9米')).toBeLessThan(lengthRank('12米'))
    expect(lengthRank('12米')).toBeLessThan(lengthRank(''))
    expect(lengthRank('')).toBeLessThan(lengthRank('-'))
  })

  it('去重后排序', () => {
    expect(
      orderedLengths([
        row(12, '12米'),
        row(10, '9米'),
        row(12, '9米'),
        row(8, ''),
      ]),
    ).toEqual(['9米', '12米', ''])
  })
})

describe('规格行合并：一个规格一行，定尺进格子', () => {
  it('同一规格的 9米/12米 合并成一行、内含两个定尺', () => {
    const grouped = groupSpecRows([
      row(12, '12米'),
      row(12, '9米'),
      row(14, '9米'),
    ])
    expect(grouped).toHaveLength(2)
    expect(grouped[0]).toEqual({
      category: '螺纹钢',
      material: 'HRB400E',
      spec: 12,
      lengths: ['9米', '12米'],
    })
    expect(grouped[1]?.lengths).toEqual(['9米'])
  })

  it('按类别/材质/规格排序，规格是数值序（不是 "10" < "9"）', () => {
    const grouped = groupSpecRows([
      row(12, '9米'),
      row(9, '9米'),
      row(10, '9米'),
    ])
    expect(grouped.map((item) => item.spec)).toEqual([9, 10, 12])
  })

  it('规格行键不含定尺（同一规格的 9米/12米 是同一行）', () => {
    expect(
      specRowKey({
        category: '螺纹钢',
        material: 'HRB400E',
        spec: 12,
        lengths: [],
      }),
    ).toBe('螺纹钢|HRB400E|12')
    expect(
      rowKeyOfCell(
        { category: '螺纹钢', material: 'HRB400E', spec: 12, lengths: [] },
        '9米',
      ),
    ).toBe('螺纹钢|HRB400E|12|9米')
  })
})

describe('规格搜索', () => {
  const rows = groupSpecRows([row(12, '9米'), row(12, '9米', 'HPB300')])

  it('材质/规格/类别都能命中，忽略大小写', () => {
    expect(filterSpecRows(rows, 'hpb300')).toHaveLength(1)
    expect(filterSpecRows(rows, '12')).toHaveLength(2)
    expect(filterSpecRows(rows, '  ')).toHaveLength(2)
  })
})

describe('粘贴：列 → 格位（品牌 × 定尺），行 → 规格', () => {
  const specRows = groupSpecRows([
    row(12, '9米'),
    row(12, '12米'),
    row(14, '9米'),
  ])
  const slots = buildSlots(['中天', '永钢'], ['9米', '12米'])

  it('格位顺序 = 品牌 × 定尺（与界面 DOM 顺序一致）', () => {
    expect(slots).toEqual([
      { brandName: '中天', length: '9米' },
      { brandName: '中天', length: '12米' },
      { brandName: '永钢', length: '9米' },
      { brandName: '永钢', length: '12米' },
    ])
  })

  it('贴一列：沿同一品牌同一定尺向下填规格行', () => {
    const plan = buildSpecPastePlan({
      matrix: [['3210'], ['3220']],
      slots,
      specRows,
      startSlotIndex: 0,
      startRowIndex: 0,
    })
    expect(plan.cells).toEqual([
      { brandName: '中天', rowKey: '螺纹钢|HRB400E|12|9米', value: 3210 },
      { brandName: '中天', rowKey: '螺纹钢|HRB400E|14|9米', value: 3220 },
    ])
    expect(plan.dropped).toBe(0)
  })

  it('贴两列：同一规格的 9米/12米 一次贴完', () => {
    const plan = buildSpecPastePlan({
      matrix: [['3210', '3230']],
      slots,
      specRows,
      startSlotIndex: 0,
      startRowIndex: 0,
    })
    expect(plan.cells).toEqual([
      { brandName: '中天', rowKey: '螺纹钢|HRB400E|12|9米', value: 3210 },
      { brandName: '中天', rowKey: '螺纹钢|HRB400E|12|12米', value: 3230 },
    ])
  })

  it('目标规格没有该定尺时丢弃该格并计数', () => {
    const plan = buildSpecPastePlan({
      matrix: [['3210', '3230']],
      slots,
      specRows,
      // 14 只有 9米，第二列 12米 应被丢弃
      startSlotIndex: 0,
      startRowIndex: 1,
    })
    expect(plan.cells).toEqual([
      { brandName: '中天', rowKey: '螺纹钢|HRB400E|14|9米', value: 3210 },
    ])
    expect(plan.dropped).toBe(1)
  })

  it('空串粘贴=清空；越界丢弃', () => {
    const plan = buildSpecPastePlan({
      matrix: [[''], ['']],
      slots,
      specRows,
      startSlotIndex: 3,
      startRowIndex: 0,
    })
    expect(plan.cells).toEqual([
      { brandName: '永钢', rowKey: '螺纹钢|HRB400E|12|12米', value: null },
    ])
    expect(plan.dropped).toBe(1)
  })
})

describe('列显示偏好与顺序', () => {
  it('按保存的顺序排列，新增品牌追加末尾', () => {
    expect(applyBrandOrder(['中天', '永钢', '沙钢'], ['沙钢', '中天'])).toEqual(
      ['沙钢', '中天', '永钢'],
    )
  })

  it('拖拽重排/左右移', () => {
    expect(reorderBrands(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b'])
    expect(shiftBrand(['a', 'b', 'c'], 'a', 1)).toEqual(['b', 'a', 'c'])
    expect(shiftBrand(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
  })

  it('隐藏/取消隐藏', () => {
    expect(toggleHidden([], '中天')).toEqual(['中天'])
    expect(toggleHidden(['中天', '永钢'], '中天')).toEqual(['永钢'])
  })

  it('偏好解析：脏数据退化为默认值', () => {
    expect(parseBrandPrefs(null)).toEqual({ order: [], hidden: [] })
    expect(parseBrandPrefs('not-json')).toEqual({ order: [], hidden: [] })
    expect(parseBrandPrefs('{"order":["a",1],"hidden":["b"]}')).toEqual({
      order: ['a'],
      hidden: ['b'],
    })
    const prefs = { order: ['中天'], hidden: ['永钢'] }
    expect(parseBrandPrefs(serializeBrandPrefs(prefs))).toEqual(prefs)
  })
})

describe('列宽：固定表宽，不随容器拉伸', () => {
  it('总宽 = 固定列（序号/类别/材质/规格） + 品牌列 × 品牌数', () => {
    const fixed =
      SHEET_COLUMN_WIDTH.index +
      SHEET_COLUMN_WIDTH.category +
      SHEET_COLUMN_WIDTH.material +
      SHEET_COLUMN_WIDTH.specNo
    expect(sheetWidthOf(1)).toBe(fixed + SHEET_COLUMN_WIDTH.brand)
    expect(sheetWidthOf(3)).toBe(fixed + 3 * SHEET_COLUMN_WIDTH.brand)
  })

  it('没有品牌列时按 1 列计算，表不会塌成 0 宽', () => {
    expect(sheetWidthOf(0)).toBe(sheetWidthOf(1))
  })
})

describe('基价加价：只填空格子', () => {
  const rows = groupSpecRows([row(10, '9米'), row(12, '9米'), row(14, '9米')])
  const base = { material: 'HRB400E', spec: 10, length: '9米' }
  const items = [
    { material: 'HRB400E', spec: 10, length: '9米', delta: 0 },
    { material: 'HRB400E', spec: 12, length: '9米', delta: 50 },
    { material: 'HRB400E', spec: 14, length: '9米', delta: -20 },
  ]

  it('按 基价 + 加价 算出其它规格，跳过基价本身', () => {
    expect(
      buildBasePriceFillPlan({
        base,
        basePrice: 3200,
        items,
        specRows: rows,
        isFilled: () => false,
      }),
    ).toEqual([
      { rowKey: '螺纹钢|HRB400E|12|9米', value: 3250 },
      { rowKey: '螺纹钢|HRB400E|14|9米', value: 3180 },
    ])
  })

  it('已有价格不覆盖，没有配加价的规格不填', () => {
    const plan = buildBasePriceFillPlan({
      base,
      basePrice: 3200,
      items,
      specRows: rows,
      isFilled: (key) => key === '螺纹钢|HRB400E|12|9米',
    })
    expect(plan.map((cell) => cell.rowKey)).toEqual(['螺纹钢|HRB400E|14|9米'])
  })

  it('基价为空/非正时不填，算出来非正也不填', () => {
    expect(
      buildBasePriceFillPlan({
        base,
        basePrice: 0,
        items,
        specRows: rows,
        isFilled: () => false,
      }),
    ).toEqual([])
    expect(
      buildBasePriceFillPlan({
        base,
        basePrice: 10,
        items: [{ ...items[2], delta: -20 }],
        specRows: rows,
        isFilled: () => false,
      }),
    ).toEqual([])
  })
})
