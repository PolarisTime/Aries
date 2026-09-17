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
  it('优先取商品 quantityUnit（数量单位），而非 unit（单位）', () => {
    expect(
      inferQuantityUnit(material({ quantityUnit: '支', unit: '吨' })),
    ).toBe('支')
  })

  it('quantityUnit=件、unit=吨 时取「件」，不被「吨」覆盖', () => {
    expect(
      inferQuantityUnit(material({ quantityUnit: '件', unit: '吨' })),
    ).toBe('件')
  })

  it('quantityUnit 缺失时回落商品 unit', () => {
    expect(inferQuantityUnit(material({ unit: '支' }))).toBe('支')
  })

  it('quantityUnit 为空/空白时回落商品 unit', () => {
    expect(inferQuantityUnit(material({ quantityUnit: '', unit: '支' }))).toBe(
      '支',
    )
    expect(
      inferQuantityUnit(material({ quantityUnit: '   ', unit: '支' })),
    ).toBe('支')
  })

  it('quantityUnit 与 unit 都缺失/空/空白时回落「件」', () => {
    expect(inferQuantityUnit(material({}))).toBe('件')
    expect(inferQuantityUnit(material({ quantityUnit: '', unit: '' }))).toBe(
      '件',
    )
    expect(
      inferQuantityUnit(material({ quantityUnit: '   ', unit: '   ' })),
    ).toBe('件')
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

  it('选中 quantityUnit=支 的商品后行数量单位为「支」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ quantityUnit: '支', unit: '吨' }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('支')
  })

  it('选中 unit=吨、quantityUnit=件 的商品后行数量单位为「件」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ unit: '吨', quantityUnit: '件' }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('件')
  })

  it('quantityUnit 缺失但 unit=支 时行数量单位回落「支」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ unit: '支' }),
      'sales-order',
    )
    expect(item.quantityUnit).toBe('支')
  })

  it('quantityUnit 与 unit 都缺失时行数量单位回落「件」', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem(),
      material({ quantityUnit: undefined, unit: undefined }),
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

  it('重新选择商品会按新商品数量单位更新（商品变更即更新）', () => {
    const item = applyMaterialToEditorLineItem(
      baseItem({ quantityUnit: '支' }),
      material({ quantityUnit: '根', unit: '吨' }),
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
