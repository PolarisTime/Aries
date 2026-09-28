import { describe, expect, it } from 'vitest'
import { removeEditorLineItems } from '@/module-system/editor/module-editor-line-item-removal'
import type { ModuleLineItem } from '@/types/module-page'

/** 模拟「从采购来源导入」的销售订单明细行。 */
function importedItem(
  id: string,
  sourceInboundItemId: string,
  quantity: number,
  maxImportQuantity = quantity,
): ModuleLineItem {
  return {
    id,
    sourceInboundItemId,
    quantity,
    _maxImportQuantity: maxImportQuantity,
    material: 'HRB400',
    materialCode: 'M-1',
  }
}

describe('removeEditorLineItems 导入上游后删除明细行', () => {
  it('删除单行：只移除选中行', () => {
    const items = [importedItem('1', 'IN-1', 5), importedItem('2', 'IN-2', 3)]
    expect(removeEditorLineItems(items, ['2']).map((item) => item.id)).toEqual([
      '1',
    ])
  })

  it('多选删除：一次移除多行', () => {
    const items = [
      importedItem('1', 'IN-1', 5),
      importedItem('2', 'IN-2', 3),
      importedItem('3', 'IN-3', 2),
    ]
    expect(
      removeEditorLineItems(items, ['1', '3']).map((item) => item.id),
    ).toEqual(['2'])
  })

  it('删除不影响其它行的采购来源关联、件数与导入上限', () => {
    const kept = importedItem('2', 'IN-2', 3, 7)
    const items = [importedItem('1', 'IN-1', 5), kept]
    const next = removeEditorLineItems(items, ['1'])
    expect(next).toHaveLength(1)
    // 同引用：未被删除的行不做任何改写，来源关联与件数保持原样
    expect(next[0]).toBe(kept)
    expect(next[0]).toMatchObject({
      sourceInboundItemId: 'IN-2',
      quantity: 3,
      _maxImportQuantity: 7,
    })
  })

  it('未选中任何行时原样返回（引用不变，调用方可跳过状态更新）', () => {
    const items = [importedItem('1', 'IN-1', 5)]
    expect(removeEditorLineItems(items, [])).toBe(items)
  })

  it('按来源分组删除：连带移除同一来源单的其它行（物流对账单口径）', () => {
    const items = [
      { id: '1', sourceFreightBillId: 'FB-1' } as ModuleLineItem,
      { id: '2', sourceFreightBillId: 'FB-1' } as ModuleLineItem,
      { id: '3', sourceFreightBillId: 'FB-2' } as ModuleLineItem,
      { id: '4' },
    ]
    const next = removeEditorLineItems(items, ['2'], {
      sourceGroupKey: (item) =>
        item.sourceFreightBillId == null
          ? ''
          : String(item.sourceFreightBillId),
    })
    expect(next.map((item) => item.id)).toEqual(['3', '4'])
  })

  it('无来源分组的行只删除自身，不影响同来源分组的其它行', () => {
    const items = [
      { id: '1', sourceFreightBillId: 'FB-1' } as ModuleLineItem,
      { id: '2' },
    ]
    const next = removeEditorLineItems(items, ['2'], {
      sourceGroupKey: (item) =>
        item.sourceFreightBillId == null
          ? ''
          : String(item.sourceFreightBillId),
    })
    expect(next.map((item) => item.id)).toEqual(['1'])
  })
})
