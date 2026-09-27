import { describe, expect, it } from 'vitest'
import { duplicateEditorLineItem } from '@/module-system/editor/module-editor-line-item-duplicate'
import type { ModuleLineItem } from '@/types/module-page'

function buildItem(id: string, overrides: Partial<ModuleLineItem> = {}) {
  return {
    id,
    materialCode: 'M-001',
    materialName: '螺纹钢',
    spec: '12',
    quantity: 3,
    unitPrice: 4100,
    amount: 12300,
    ...overrides,
  } satisfies ModuleLineItem
}

describe('duplicateEditorLineItem 明细复制本行', () => {
  it('行数 +1，副本字段值与源行完全相等', () => {
    const source = buildItem('row-1')
    const result = duplicateEditorLineItem([source], 'row-1')

    expect(result).not.toBeNull()
    expect(result?.items).toHaveLength(2)

    const duplicated = result?.items[1]
    const { id: _sourceId, ...sourceFields } = source
    const { id: _duplicatedId, ...duplicatedFields } =
      duplicated as ModuleLineItem
    expect(duplicatedFields).toEqual(sourceFields)
    expect(duplicated?.materialCode).toBe('M-001')
    expect(duplicated?.quantity).toBe(3)
    expect(duplicated?.amount).toBe(12300)
  })

  it('生成的新行 id 与源行不同，且不与其他行重复', () => {
    const items = [buildItem('row-1'), buildItem('row-2')]
    const result = duplicateEditorLineItem(items, 'row-1')

    const newItemId = result?.newItemId
    expect(newItemId).toBeTruthy()
    expect(newItemId).not.toBe('row-1')
    expect(new Set(result?.items.map((item) => item.id)).size).toBe(
      result?.items.length,
    )
  })

  it('副本插入在源行正下方（首行/中间/末行）', () => {
    const items = [
      buildItem('row-1', { materialName: 'A' }),
      buildItem('row-2', { materialName: 'B' }),
      buildItem('row-3', { materialName: 'C' }),
    ]

    const first = duplicateEditorLineItem(items, 'row-1')
    expect(first?.index).toBe(1)
    expect(first?.items.map((item) => item.id)).toEqual([
      'row-1',
      first?.newItemId,
      'row-2',
      'row-3',
    ])

    const middle = duplicateEditorLineItem(items, 'row-2')
    expect(middle?.index).toBe(2)
    expect(middle?.items.map((item) => item.id)).toEqual([
      'row-1',
      'row-2',
      middle?.newItemId,
      'row-3',
    ])

    const last = duplicateEditorLineItem(items, 'row-3')
    expect(last?.index).toBe(3)
    expect(last?.items.map((item) => item.id)).toEqual([
      'row-1',
      'row-2',
      'row-3',
      last?.newItemId,
    ])
  })

  it('不修改入参数组（纯函数，可安全用于 setItems 更新）', () => {
    const items = [buildItem('row-1')]
    const snapshot = [...items]
    const result = duplicateEditorLineItem(items, 'row-1')

    expect(items).toEqual(snapshot)
    expect(items).toHaveLength(1)
    expect(result?.items).not.toBe(items)
  })

  it('源行不存在时返回 null，不插入脏数据', () => {
    expect(duplicateEditorLineItem([buildItem('row-1')], 'missing')).toBeNull()
    expect(duplicateEditorLineItem([], 'row-1')).toBeNull()
  })

  it('连续复制同一行会得到互相不同的 id', () => {
    const items = [buildItem('row-1')]
    const first = duplicateEditorLineItem(items, 'row-1')
    const second = duplicateEditorLineItem(first?.items ?? [], 'row-1')

    expect(first?.newItemId).not.toBe(second?.newItemId)
    expect(new Set(second?.items.map((item) => item.id)).size).toBe(3)
  })

  it('空行（未选商品的占位行）也可复制，便于批量录入', () => {
    const blank: ModuleLineItem = { id: 'blank-1' }
    const result = duplicateEditorLineItem([blank], 'blank-1')

    expect(result?.newItemId).toBeTruthy()
    expect(result?.items[1]).toEqual({ id: result?.newItemId })
  })

  it('浅拷贝复制：源行对象引用保持不变，副本是独立对象', () => {
    const items = [buildItem('row-1')]
    const result = duplicateEditorLineItem(items, 'row-1')

    expect(result?.items[0]).toBe(items[0])
    expect(result?.items[1]).not.toBe(items[0])
  })
})
