import { describe, expect, it } from 'vitest'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import {
  applyMaterialToEditorLineItem,
  trimEditorItemsForModule,
} from './module-editor-line-item-utils'
import {
  buildDefaultEditorLineItem,
  inferQuantityUnit,
} from './module-editor-shared'

const material = (overrides: Record<string, unknown>): ModuleRecord => ({
  id: '347011099205312512',
  materialCode: 'M-001',
  brand: '泸钢',
  category: '盘螺',
  material: 'HRB400E',
  spec: '8',
  length: '9米',
  ...overrides,
})

describe('inferQuantityUnit', () => {
  it('取商品 unit（单位）作为数量单位', () => {
    expect(inferQuantityUnit(material({ unit: '支' }))).toBe('支')
  })

  it('商品单位为「件」时保持「件」', () => {
    expect(inferQuantityUnit(material({ unit: '件' }))).toBe('件')
  })

  it('商品单位为「吨」时不再写死「件」', () => {
    expect(inferQuantityUnit(material({ unit: '吨' }))).toBe('吨')
  })

  it('unit 缺失/空/空白时回落「件」', () => {
    expect(inferQuantityUnit(material({}))).toBe('件')
    expect(inferQuantityUnit(material({ unit: '' }))).toBe('件')
    expect(inferQuantityUnit(material({ unit: '   ' }))).toBe('件')
    expect(inferQuantityUnit(null)).toBe('件')
    expect(inferQuantityUnit(undefined)).toBe('件')
  })
})

describe('applyMaterialToEditorLineItem', () => {
  const baseItem = (
    overrides: Record<string, unknown> = {},
  ): ModuleLineItem => ({
    id: 'item-1',
    ...overrides,
  })

  it('选中 unit=支 的商品后行数量单位为「支」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ unit: '支' }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('支')
  })

  it('选中 unit=件 的商品后行数量单位为「件」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ unit: '件' }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('件')
  })

  it('商品 unit 缺失时行数量单位回落「件」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ unit: undefined }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('件')
  })

  it('清空商品时数量单位回落「件」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem({ quantityUnit: '支' }),
      null,
      'sales-order',
    )
    expect(item.quantityUnit).toBe('件')
    expect(item.unit).toBe('吨')
  })

  it('重新选择商品会按新商品单位更新（商品变更即更新）', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem({ quantityUnit: '支' }),
      material({ unit: '根' }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('根')
  })
})

describe('trimEditorItemsForModule 空行判定', () => {
  it('已选商品的行不会仅因数量单位为「件」被误判为空行', () => {
    const draft: ModuleLineItem = {
      id: 'item-material',
      materialId: '347011099205312512',
      unit: '吨',
      quantityUnit: '件',
      quantity: 0,
    }
    expect(trimEditorItemsForModule('sales-order', [draft])).toHaveLength(1)
  })

  it('未选商品的默认空行仍被裁剪', () => {
    const draft = buildDefaultEditorLineItem('item-blank', 'sales-order')
    expect(trimEditorItemsForModule('sales-order', [draft])).toHaveLength(0)
  })
})
