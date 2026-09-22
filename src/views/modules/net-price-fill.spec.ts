import { describe, expect, it } from 'vitest'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'
import {
  applyNetPriceFloat,
  buildNetPriceIndex,
  resolveNetPrice,
  round2,
} from './net-price-fill'

describe('applyNetPriceFloat', () => {
  it('ADD 加价 / SUBTRACT 减价', () => {
    expect(applyNetPriceFloat(3400, 'ADD', 30)).toBe(3430)
    expect(applyNetPriceFloat(3400, 'SUBTRACT', 30)).toBe(3370)
  })

  it('未配置浮动或幅度缺失时返回原价', () => {
    expect(applyNetPriceFloat(3400, undefined, 30)).toBe(3400)
    expect(applyNetPriceFloat(3400, 'ADD', undefined)).toBe(3400)
    expect(applyNetPriceFloat(3400, undefined, undefined)).toBe(3400)
  })

  it('幅度为 0 时保持原价', () => {
    expect(applyNetPriceFloat(3400, 'ADD', 0)).toBe(3400)
    expect(applyNetPriceFloat(3400, 'SUBTRACT', 0)).toBe(3400)
  })

  it('按 2 位小数四舍五入', () => {
    expect(applyNetPriceFloat(3400.125, undefined, undefined)).toBe(3400.13)
    expect(round2(1.005)).toBe(1.01)
  })
})

const row = (overrides: Partial<MaterialPriceMatch>): MaterialPriceMatch => ({
  materialId: null,
  materialCode: null,
  brand: null,
  material: null,
  category: null,
  spec: null,
  length: null,
  status: '匹配',
  basePrice: null,
  price: null,
  quoteDate: '2026-09-22',
  period: '下午',
  ...overrides,
})

const item = (overrides: Partial<ModuleLineItem>): ModuleLineItem => ({
  id: 'i1',
  ...overrides,
})

describe('buildNetPriceIndex / resolveNetPrice', () => {
  it('优先按 materialId 命中', () => {
    const index = buildNetPriceIndex([
      row({ materialId: 'm1', price: '3400.00', brand: '中天' }),
    ])
    expect(resolveNetPrice(item({ materialId: 'm1' }), index)).toBe(3400)
  })

  it('materialId 未命中时按商品维度键命中', () => {
    const index = buildNetPriceIndex([
      row({
        brand: '中天',
        category: '螺纹钢',
        material: 'HRB400E',
        spec: '12',
        length: '9米',
        price: 3350,
      }),
    ])
    expect(
      resolveNetPrice(
        item({
          brand: '中天',
          category: '螺纹钢',
          material: 'HRB400E',
          spec: '12',
          length: '9米',
        }),
        index,
      ),
    ).toBe(3350)
  })

  it('无网价（price 为空）不进入索引, 返回 undefined', () => {
    const index = buildNetPriceIndex([
      row({ materialId: 'm1', price: null, status: '无网价' }),
    ])
    expect(resolveNetPrice(item({ materialId: 'm1' }), index)).toBeUndefined()
  })

  it('非有限价格被忽略', () => {
    const index = buildNetPriceIndex([row({ materialId: 'm1', price: 'NaN' })])
    expect(resolveNetPrice(item({ materialId: 'm1' }), index)).toBeUndefined()
  })
})
