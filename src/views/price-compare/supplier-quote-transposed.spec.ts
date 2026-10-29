import { describe, expect, it } from 'vitest'
import type { QuoteRow } from './supplier-price-list-model'
import {
  buildTransposedSections,
  lengthHeader,
  specHeader,
} from './supplier-quote-transposed'

const row = (
  category: string,
  material: string,
  spec: number,
  length: string,
): QuoteRow => ({ category, material, spec, length })

const ROWS: QuoteRow[] = [
  // 螺纹钢：规格乱序，用来验证行按数字升序
  row('螺纹钢', 'HRB400E', 12, '9米'),
  row('螺纹钢', 'HRB400E', 12, '12米'),
  row('螺纹钢', 'HRB400E', 6, '9米'),
  row('螺纹钢', 'HRB400E', 10, '9米'),
  row('螺纹钢', 'HRB500E', 10, '9米'),
  // 盘螺：另一个品类，自己的规格集合；卷材没有定尺
  row('盘螺', 'HRB400', 8, '-'),
  row('盘螺', 'HRB400', 10, '-'),
]

describe('规格横置布局（行 = 规格、列 = 定尺）', () => {
  it('规格列头是裸数字（不带直径符号 Φ）', () => {
    expect(specHeader(12)).toBe('12')
  })

  it('定尺进表头；无定尺（卷材）显示为「—」', () => {
    expect(lengthHeader('9米')).toBe('9米')
    expect(lengthHeader('12米')).toBe('12米')
    expect(lengthHeader('-')).toBe('—')
    expect(lengthHeader('')).toBe('—')
  })

  it('按品类 + 材质分块：不同规格集合不硬合并成一张表', () => {
    const sections = buildTransposedSections(ROWS, ['中天'])
    expect(sections).toHaveLength(1)
    expect(
      sections[0].blocks.map((block) => `${block.category}/${block.material}`),
    ).toEqual(['螺纹钢/HRB400E', '螺纹钢/HRB500E', '盘螺/HRB400'])
  })

  it('块内：行 = 规格升序，列 = 定尺（9米 在 12米 前）', () => {
    const [block] = buildTransposedSections(ROWS, ['中天'])[0].blocks
    expect(block.rows.map((item) => item.spec)).toEqual([6, 10, 12])
    expect(block.lengths).toEqual(['9米', '12米'])
  })

  it('每个品牌都拿到同样结构的块（品牌分块、数据结构共享）', () => {
    const sections = buildTransposedSections(ROWS, ['中天', '镔鑫'])
    expect(sections.map((section) => section.brandName)).toEqual([
      '中天',
      '镔鑫',
    ])
    expect(sections[1].blocks).toEqual(sections[0].blocks)
  })

  it('单元格按定尺携带完整行键（类别|材质|规格|定尺），可直接用于草稿', () => {
    const section = buildTransposedSections(ROWS, ['中天'])[0]
    const steel = section.blocks[0]
    const spec12 = steel.rows.find((item) => item.spec === 12)
    expect(spec12?.cells['9米']).toBe('螺纹钢|HRB400E|12|9米')
    expect(spec12?.cells['12米']).toBe('螺纹钢|HRB400E|12|12米')
    // 没有该定尺的规格不出现在 cells 里（渲染成「—」而不是可编辑格）
    const spec6 = steel.rows.find((item) => item.spec === 6)
    expect(spec6?.cells['12米']).toBeUndefined()
  })

  it('卷材（无定尺）只占一列，列头是「—」，行键用占位定尺', () => {
    const coil = buildTransposedSections(ROWS, ['中天'])[0].blocks.find(
      (block) => block.category === '盘螺',
    )
    expect(coil?.lengths).toEqual(['-'])
    expect(lengthHeader(coil?.lengths[0] ?? '')).toBe('—')
    expect(coil?.rows[0].cells['-']).toBe('盘螺|HRB400|8|-')
  })
})
