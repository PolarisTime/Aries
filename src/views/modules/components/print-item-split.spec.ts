import { describe, expect, it } from 'vitest'
import type { PrintRecordItem } from '@/api/system/print-template'
import {
  buildPrintItemSplitPreviews,
  parsePrintItemQuantity,
  splitPrintItemParts,
  sumPrintItemDecimals,
  sumPrintItemQuantities,
} from '@/views/modules/components/print-item-split'

function printItem(
  id: string,
  quantity: string,
  weightTon = '10.00000000',
  amount = '200.00',
): PrintRecordItem {
  return {
    id,
    recordId: 'record-1',
    brand: '品牌A',
    category: '类别A',
    material: '材质A',
    spec: 'HRB400',
    length: '9米',
    quantity,
    pieceWeightTon: '1.00000000',
    weightTon,
    unitPrice: '100.00',
    amount,
  }
}

describe('splitPrintItemParts 拆分预览', () => {
  it('整除时按每份件数拆成等份并保持重量金额合计守恒', () => {
    const parts = splitPrintItemParts('100', 25, '10.00000000', '200.00')

    expect(parts).toHaveLength(4)
    expect(parts?.map((part) => part.quantity)).toEqual([25, 25, 25, 25])
    expect(parts?.map((part) => part.weightTon)).toEqual([
      '2.50000000',
      '2.50000000',
      '2.50000000',
      '2.50000000',
    ])
    expect(parts?.map((part) => part.amount)).toEqual([
      '50.00',
      '50.00',
      '50.00',
      '50.00',
    ])
    expect(parts?.map((part) => part.index)).toEqual([1, 2, 3, 4])
    expect(parts?.every((part) => part.total === 4)).toBe(true)
  })

  it('余数并入最后一份', () => {
    const parts = splitPrintItemParts('103', 25, '12.50000000', '1000.00')

    expect(parts?.map((part) => part.quantity)).toEqual([25, 25, 25, 28])
  })

  it('重量与金额按累计舍入拆分且各份之和与原值一致', () => {
    const parts = splitPrintItemParts('103', 25, '12.50000000', '1000.00')

    const weightSum = parts?.reduce(
      (total, part) => total + Number(part.weightTon),
      0,
    )
    const amountSum = parts?.reduce(
      (total, part) => total + Number(part.amount),
      0,
    )

    expect(weightSum).toBeCloseTo(12.5, 8)
    expect(amountSum).toBeCloseTo(1000, 2)
    expect(parts?.map((part) => part.amount)).toEqual([
      '242.72',
      '242.72',
      '242.72',
      '271.84',
    ])
    expect(parts?.every((part) => part.weightTon?.length === 10)).toBe(true)
  })

  it('件数缺失、非法或未超过每份件数时不拆分', () => {
    expect(splitPrintItemParts(undefined, 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('', 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('abc', 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('0', 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('-5', 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('100.5', 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('25', 25, '1.50000000', '10.00')).toBeNull()
    expect(splitPrintItemParts('10', 25, '1.50000000', '10.00')).toBeNull()
  })

  it('每份件数非法时不拆分', () => {
    for (const pieceCount of [undefined, 0, -1, 2.5, Number.NaN, '25']) {
      expect(
        splitPrintItemParts('100', pieceCount, '1.50000000', '10.00'),
      ).toBeNull()
    }
  })

  it('重量或金额缺失时只输出件数拆分', () => {
    const parts = splitPrintItemParts('100', 25, null, undefined)

    expect(parts).toHaveLength(4)
    expect(parts?.every((part) => part.weightTon === undefined)).toBe(true)
    expect(parts?.every((part) => part.amount === undefined)).toBe(true)
  })
})

describe('buildPrintItemSplitPreviews 预览映射', () => {
  it('无合并分组时仅勾选行有条目', () => {
    const previews = buildPrintItemSplitPreviews(
      [printItem('1', '100'), printItem('2', '100')],
      ['2'],
      25,
    )

    expect(Object.keys(previews)).toEqual(['2'])
    expect(previews['2']?.map((part) => part.quantity)).toEqual([
      25, 25, 25, 25,
    ])
  })

  it('勾选但件数未超过每份件数时条目为 null', () => {
    const previews = buildPrintItemSplitPreviews(
      [printItem('1', '10')],
      ['1'],
      25,
    )

    expect(previews).toHaveProperty('1')
    expect(previews['1']).toBeNull()
  })

  it('合并分组按组汇总并挂在组内代表行', () => {
    const previews = buildPrintItemSplitPreviews(
      [
        printItem('1', '100', '10.00000000', '200.00'),
        printItem('2', '50', '5.00000000', '100.00'),
      ],
      ['1', '2'],
      25,
      [['1', '2']],
    )

    // 合并后 150 件 → 6 份，重量/金额按合并值缩放，仅代表行（1）有条目
    expect(Object.keys(previews)).toEqual(['1'])
    expect(previews['1']).toHaveLength(6)
    expect(previews['1']?.map((part) => part.quantity)).toEqual([
      25, 25, 25, 25, 25, 25,
    ])
    expect(
      previews['1']?.reduce((total, part) => total + Number(part.weightTon), 0),
    ).toBeCloseTo(15, 8)
    expect(
      previews['1']?.reduce((total, part) => total + Number(part.amount), 0),
    ).toBeCloseTo(300, 2)
  })

  it('合并分组未勾选时不产生条目', () => {
    const previews = buildPrintItemSplitPreviews(
      [printItem('1', '100'), printItem('2', '50')],
      [],
      25,
      [['1', '2']],
    )

    expect(previews).toEqual({})
  })
})

describe('sumPrintItemQuantities / sumPrintItemDecimals 汇总', () => {
  it('汇总有效值并跳过缺失值', () => {
    expect(sumPrintItemQuantities(['100', '50', null, ''])).toBe(150)
    expect(sumPrintItemQuantities([undefined, 'abc'])).toBeNull()
    expect(sumPrintItemDecimals(['10.00000000', '5.50000000'], 8)).toBe(
      '15.50000000',
    )
    expect(sumPrintItemDecimals([undefined, ''], 8)).toBeUndefined()
  })
})

describe('parsePrintItemQuantity 件数解析', () => {
  it('接受正整数与数字形式', () => {
    expect(parsePrintItemQuantity('100')).toBe(100)
    expect(parsePrintItemQuantity(100)).toBe(100)
  })

  it('拒绝缺失、非整数与非法值', () => {
    for (const value of [
      undefined,
      null,
      '',
      ' ',
      'abc',
      '0',
      '-1',
      '1.5',
      1.5,
      -1,
      0,
    ]) {
      expect(parsePrintItemQuantity(value)).toBeNull()
    }
  })
})
