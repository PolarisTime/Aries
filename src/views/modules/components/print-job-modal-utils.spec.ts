import { describe, expect, it } from 'vitest'
import type { PrintRecordItem } from '@/api/system/print-template'
import {
  buildPrintItemMergeGroups,
  buildPrintItemMergeMarkers,
  reorderPrintItemIds,
  togglePrintItemSplitIds,
} from '@/views/modules/components/print-job-modal-utils'

function printItem(
  id: string,
  overrides: Partial<PrintRecordItem> = {},
): PrintRecordItem {
  return {
    id,
    recordId: 'record-1',
    brand: '品牌A',
    category: '类别A',
    material: '材质A',
    spec: 'HRB400',
    length: '9米',
    quantity: '100',
    pieceWeightTon: '1.00000000',
    weightTon: '10.00000000',
    unitPrice: '100.00',
    amount: '200.00',
    ...overrides,
  }
}

describe('buildPrintItemMergeGroups', () => {
  it('仅返回 ≥2 行的同款分组并保持行序', () => {
    const groups = buildPrintItemMergeGroups(
      [
        printItem('1'),
        printItem('2'),
        printItem('3', { brand: '品牌B' }),
        printItem('4'),
      ],
      {},
    )

    expect(groups).toEqual([['1', '2', '4']])
  })

  it('品牌/规格/长度为空的行不参与合并', () => {
    const groups = buildPrintItemMergeGroups(
      [
        printItem('1', { brand: '' }),
        printItem('2', { brand: '' }),
        printItem('3', { spec: '' }),
        printItem('4', { spec: '' }),
      ],
      {},
    )

    expect(groups).toEqual([])
  })

  it('品牌替换值参与合并键', () => {
    const groups = buildPrintItemMergeGroups(
      [printItem('1'), printItem('2', { brand: '品牌B' })],
      { '1': '品牌B' },
    )

    expect(groups).toEqual([['1', '2']])
  })
})

describe('buildPrintItemMergeMarkers', () => {
  it('为分组行标记组序号与行数', () => {
    const markers = buildPrintItemMergeMarkers(
      [printItem('1'), printItem('2'), printItem('3', { brand: '品牌B' })],
      {},
    )

    expect(markers).toEqual({
      '1': { groupIndex: 1, itemCount: 2 },
      '2': { groupIndex: 1, itemCount: 2 },
    })
  })
})

describe('togglePrintItemSplitIds', () => {
  it('单行勾选与取消', () => {
    expect(togglePrintItemSplitIds([], ['1'])).toEqual(['1'])
    expect(togglePrintItemSplitIds(['1'], ['1'])).toEqual([])
  })

  it('组内未全部勾选时勾选全组', () => {
    expect(togglePrintItemSplitIds(['1'], ['1', '2'])).toEqual(['1', '2'])
    expect(togglePrintItemSplitIds([], ['1', '2'])).toEqual(['1', '2'])
  })

  it('组内全部勾选时取消全组', () => {
    expect(togglePrintItemSplitIds(['1', '2'], ['1', '2'])).toEqual([])
  })
})

describe('reorderPrintItemIds', () => {
  it('按目标位置移动行', () => {
    expect(reorderPrintItemIds(['1', '2', '3'], '3', '1')).toEqual([
      '3',
      '1',
      '2',
    ])
    expect(reorderPrintItemIds(['1', '2', '3'], '9', '1')).toEqual([
      '1',
      '2',
      '3',
    ])
  })
})
