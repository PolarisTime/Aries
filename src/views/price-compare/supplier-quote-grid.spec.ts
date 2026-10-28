import { describe, expect, it } from 'vitest'
import type { QuoteRow } from './supplier-price-list-model'
import {
  buildPastePlan,
  nextGridCell,
  parseClipboardGrid,
  parseGridPrice,
  SHEET_COLUMN_WIDTH,
  sheetWidthOf,
} from './supplier-quote-grid'

const row = (spec: number): QuoteRow => ({
  category: '螺纹钢',
  material: 'HRB400',
  spec,
  length: '9米',
})

const ROWS = [row(12), row(14), row(16)]
const BRANDS = ['中天', '永钢']

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

  it('负数与非数字返回 undefined（丢弃，不写坏数据）', () => {
    expect(parseGridPrice('-1')).toBeUndefined()
    expect(parseGridPrice('abc')).toBeUndefined()
  })
})

describe('粘贴铺开：行优先，越界丢弃', () => {
  it('整块粘贴覆盖到品牌列 × 规格行', () => {
    const plan = buildPastePlan({
      matrix: [
        ['3280', '3290'],
        ['3300', '3310'],
      ],
      brandNames: BRANDS,
      rows: ROWS,
      startBrandIndex: 0,
      startRowIndex: 0,
    })

    expect(plan).toEqual({
      cells: [
        { brandName: '中天', rowKey: '螺纹钢|HRB400|12|9米', value: 3280 },
        { brandName: '永钢', rowKey: '螺纹钢|HRB400|12|9米', value: 3290 },
        { brandName: '中天', rowKey: '螺纹钢|HRB400|14|9米', value: 3300 },
        { brandName: '永钢', rowKey: '螺纹钢|HRB400|14|9米', value: 3310 },
      ],
      dropped: 0,
    })
  })

  it('整列粘贴（Excel 最常见）：粘贴到第二行起，只填一列', () => {
    const plan = buildPastePlan({
      matrix: [['3300'], ['3400']],
      brandNames: BRANDS,
      rows: ROWS,
      startBrandIndex: 0,
      startRowIndex: 1,
    })

    expect(plan.cells).toEqual([
      { brandName: '中天', rowKey: '螺纹钢|HRB400|14|9米', value: 3300 },
      { brandName: '中天', rowKey: '螺纹钢|HRB400|16|9米', value: 3400 },
    ])
  })

  it('越过品牌列数或规格行数的部分被丢弃并计数', () => {
    const plan = buildPastePlan({
      matrix: [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['10', '11', '12'],
      ],
      brandNames: BRANDS,
      rows: ROWS,
      startBrandIndex: 1,
      startRowIndex: 2,
    })

    // 锚点在第 3 行第 2 列：只剩 1 行 × 1 列可用，其余 11 格越界
    expect(plan.cells).toEqual([
      { brandName: '永钢', rowKey: '螺纹钢|HRB400|16|9米', value: 1 },
    ])
    expect(plan.dropped).toBe(11)
  })

  it('空格子粘贴为空串时写入"清空"（null），而不是忽略', () => {
    const plan = buildPastePlan({
      matrix: [['']],
      brandNames: BRANDS,
      rows: ROWS,
      startBrandIndex: 0,
      startRowIndex: 0,
    })

    expect(plan.cells).toEqual([
      { brandName: '中天', rowKey: '螺纹钢|HRB400|12|9米', value: null },
    ])
  })

  it('非法值丢弃但不影响同块内的合法值', () => {
    const plan = buildPastePlan({
      matrix: [['abc'], ['3300']],
      brandNames: BRANDS,
      rows: ROWS,
      startBrandIndex: 0,
      startRowIndex: 0,
    })

    expect(plan.cells).toEqual([
      { brandName: '中天', rowKey: '螺纹钢|HRB400|14|9米', value: 3300 },
    ])
    expect(plan.dropped).toBe(1)
  })
})

describe('键盘移动边界', () => {
  it('向下移动', () => {
    expect(
      nextGridCell({
        brandIndex: 0,
        rowIndex: 0,
        deltaCol: 0,
        deltaRow: 1,
        brandCount: 2,
        rowCount: 3,
      }),
    ).toEqual({ brandIndex: 0, rowIndex: 1 })
  })

  it('末行继续向下返回 null（放行浏览器默认行为）', () => {
    expect(
      nextGridCell({
        brandIndex: 0,
        rowIndex: 2,
        deltaCol: 0,
        deltaRow: 1,
        brandCount: 2,
        rowCount: 3,
      }),
    ).toBeNull()
  })

  it('横向越界返回 null', () => {
    expect(
      nextGridCell({
        brandIndex: 0,
        rowIndex: 0,
        deltaCol: -1,
        deltaRow: 0,
        brandCount: 2,
        rowCount: 3,
      }),
    ).toBeNull()
  })
})

describe('列宽：固定表宽，不随容器拉伸', () => {
  it('总宽 = 固定列 + 品牌列 × 品牌数', () => {
    const fixed =
      SHEET_COLUMN_WIDTH.index +
      SHEET_COLUMN_WIDTH.category +
      SHEET_COLUMN_WIDTH.spec
    expect(sheetWidthOf(1)).toBe(fixed + SHEET_COLUMN_WIDTH.brand)
    expect(sheetWidthOf(3)).toBe(fixed + 3 * SHEET_COLUMN_WIDTH.brand)
  })

  it('没有品牌列时仍按 1 列计算，表格不会塌成 0 宽', () => {
    expect(sheetWidthOf(0)).toBe(sheetWidthOf(1))
  })

  it('序号/类别/规格三列是固定窄列（防止被 antd 拉宽）', () => {
    expect(SHEET_COLUMN_WIDTH.index).toBeLessThanOrEqual(60)
    expect(SHEET_COLUMN_WIDTH.category).toBeLessThanOrEqual(100)
    expect(SHEET_COLUMN_WIDTH.spec).toBeLessThanOrEqual(220)
  })
})
