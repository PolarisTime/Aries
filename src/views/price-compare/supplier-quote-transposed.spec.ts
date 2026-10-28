import { describe, expect, it } from 'vitest'
import type { QuoteRow } from './supplier-price-list-model'
import {
  buildTransposedSections,
  specHeader,
} from './supplier-quote-transposed'

const row = (
  category: string,
  material: string,
  spec: number,
  length: string,
): QuoteRow => ({ category, material, spec, length })

const ROWS: QuoteRow[] = [
  // 螺纹钢：规格乱序，用来验证列按数字排序
  row('螺纹钢', 'HRB400E', 12, '9米'),
  row('螺纹钢', 'HRB400E', 12, '12米'),
  row('螺纹钢', 'HRB400E', 6, '9米'),
  row('螺纹钢', 'HRB400E', 10, '9米'),
  row('螺纹钢', 'HRB500E', 10, '9米'),
  // 盘螺：另一个品类，自己的规格集合
  row('盘螺', 'HRB400E', 8, '9米'),
  row('盘螺', 'HRB400E', 10, '9米'),
]

describe('规格横置布局', () => {
  it('列头是裸规格数字（不带直径符号 Φ）', () => {
    expect(specHeader(12)).toBe('12')
  })

  it('按品类分块，规格按数字升序成为列', () => {
    const sections = buildTransposedSections(ROWS, ['中天'])
    expect(sections).toHaveLength(1)
    expect(sections[0].blocks.map((block) => block.category)).toEqual([
      '螺纹钢',
      '盘螺',
    ])
    expect(sections[0].blocks[0].specs).toEqual([6, 10, 12])
    expect(sections[0].blocks[1].specs).toEqual([8, 10])
  })

  it('每个品牌都拿到同样结构的块（品牌分块、数据结构共享）', () => {
    const sections = buildTransposedSections(ROWS, ['中天', '镔鑫'])
    expect(sections.map((section) => section.brandName)).toEqual([
      '中天',
      '镔鑫',
    ])
    expect(sections[1].blocks).toEqual(sections[0].blocks)
  })

  it('块内行 = 材质 + 定尺，按材质升序、9米在12米前', () => {
    const [block] = buildTransposedSections(ROWS, ['中天'])[0].blocks
    expect(block.rows.map((item) => `${item.material}/${item.length}`)).toEqual(
      ['HRB400E/9米', 'HRB400E/12米', 'HRB500E/9米'],
    )
  })

  it('单元格携带完整行键（类别|材质|规格|定尺），可直接用于草稿', () => {
    const section = buildTransposedSections(ROWS, ['中天'])[0]
    const steel = section.blocks[0]
    const firstRow = steel.rows[0]
    expect(firstRow.cells[6]).toBe('螺纹钢|HRB400E|6|9米')
    expect(firstRow.cells[12]).toBe('螺纹钢|HRB400E|12|9米')
    // 该行没有的规格不出现在 cells 里（渲染成「—」而不是可编辑格）
    expect(firstRow.cells[8]).toBeUndefined()
  })
})
