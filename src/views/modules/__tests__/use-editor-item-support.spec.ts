import { computed, ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { buildDefaultEditorLineItem } from '@/views/modules/module-adapter-editor'
import { useEditorItemSupport } from '@/views/modules/use-editor-item-support'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'

describe('useEditorItemSupport', () => {
  it('normalizes selected material codes and applies material defaults to the editor row', () => {
    const item = buildDefaultEditorLineItem('line-1')
    item.quantity = 2
    const editorForm: { items: ModuleLineItem[] } = { items: [item] }
    const materialMap = ref<Record<string, ModuleRecord>>({
      'MAT-001': {
        id: 'material-1',
        materialCode: 'MAT-001',
        brand: '宝钢',
        category: '盘螺',
        material: 'HRB400E',
        spec: '8',
        length: '9m',
        unit: '吨',
        pieceWeightTon: 1.23456,
        piecesPerBundle: 8,
        unitPrice: 4567.89,
      },
    })
    const support = useEditorItemSupport({
      editorForm,
      editorItems: computed(() => editorForm.items),
      materialMap,
      canManageEditorItems: ref(true),
    })

    const originalItems = editorForm.items
    support.handleEditorItemMaterialSelect(item, { value: ' MAT-001 ' })

    expect(item.materialCode).toBe('MAT-001')
    expect(item.brand).toBe('宝钢')
    expect(item.category).toBe('盘螺')
    expect(item.material).toBe('HRB400E')
    expect(item.spec).toBe('8')
    expect(item.length).toBe('9m')
    expect(item.unit).toBe('吨')
    expect(item.pieceWeightTon).toBe(1.235)
    expect(item.piecesPerBundle).toBe(8)
    expect(item.unitPrice).toBe(4567.89)
    expect(item.weightTon).toBe(2.47)
    expect(item.amount).toBe(11282.69)
    expect(editorForm.items).not.toBe(originalItems)
  })

  it('replaces the editor items array after numeric edits so table cells refresh', () => {
    const item = buildDefaultEditorLineItem('line-2')
    item.quantity = 2
    item.pieceWeightTon = 1.235
    item.unitPrice = 4567.89
    item.weightTon = 2.47
    item.amount = 11282.69

    const editorForm: { items: ModuleLineItem[] } = { items: [item] }
    const support = useEditorItemSupport({
      editorForm,
      editorItems: computed(() => editorForm.items),
      materialMap: ref<Record<string, ModuleRecord>>({}),
      canManageEditorItems: ref(true),
    })

    const originalItems = editorForm.items
    support.handleEditorItemNumberChange(item, 'quantity', 3)

    expect(item.weightTon).toBe(3.705)
    expect(item.amount).toBe(16924.03)
    expect(editorForm.items).not.toBe(originalItems)
  })
})
