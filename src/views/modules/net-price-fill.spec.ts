import { describe, expect, it } from 'vitest'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'
import {
  applyNetPriceFloat,
  applyNetPricesToItems,
  buildNetPriceIndex,
  evaluateNetPriceMatch,
  hasItemIdentity,
  normalizeDateValue,
  resolveNetPrice,
  round2,
  summarizeNetPriceMatch,
} from './net-price-fill'

describe('normalizeDateValue', () => {
  it('ISO 字符串含时间时取日期部分', () => {
    expect(normalizeDateValue('2026-09-16 00:00:00')).toBe('2026-09-16')
    expect(normalizeDateValue('2026-09-16T00:00:00')).toBe('2026-09-16')
  })

  it('中文展示格式归一', () => {
    expect(normalizeDateValue('2026年09月16日')).toBe('2026-09-16')
    expect(normalizeDateValue('2026年9月6日')).toBe('2026-09-06')
  })

  it('空值与非日期返回空串', () => {
    expect(normalizeDateValue(null)).toBe('')
    expect(normalizeDateValue(undefined)).toBe('')
    expect(normalizeDateValue('')).toBe('')
    expect(normalizeDateValue('not-a-date')).toBe('')
  })
})

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

describe('evaluateNetPriceMatch', () => {
  const index = buildNetPriceIndex([
    row({ materialId: 'm1', price: 3400, brand: '中天' }),
  ])

  it('当前单价 = 网价 + 加价时判为匹配', () => {
    expect(
      evaluateNetPriceMatch(
        item({ materialId: 'm1', unitPrice: 3430 }),
        index,
        {
          mode: 'ADD',
          amount: 30,
        },
      ),
    ).toEqual({ state: 'MATCHED', expectedPrice: 3430, currentPrice: 3430 })
  })

  it('减价规则同样参与判定(用两种口径不同值的数据锁定)', () => {
    // 3400 的网价: 加价 30 → 3430, 减价 30 → 3370。同一当前值只能命中一种口径。
    expect(
      evaluateNetPriceMatch(
        item({ materialId: 'm1', unitPrice: 3370 }),
        index,
        {
          mode: 'SUBTRACT',
          amount: 30,
        },
      ).state,
    ).toBe('MATCHED')
    expect(
      evaluateNetPriceMatch(
        item({ materialId: 'm1', unitPrice: 3370 }),
        index,
        {
          mode: 'ADD',
          amount: 30,
        },
      ).state,
    ).toBe('MISMATCH')
  })

  it('单价与应有价不一致判为不匹配, 并给出应有价', () => {
    expect(
      evaluateNetPriceMatch(
        item({ materialId: 'm1', unitPrice: 3200 }),
        index,
        {
          mode: 'ADD',
          amount: 30,
        },
      ),
    ).toEqual({ state: 'MISMATCH', expectedPrice: 3430, currentPrice: 3200 })
  })

  it('单价为空时判为不匹配(整单取价会把它补上), 而不是无网价', () => {
    expect(evaluateNetPriceMatch(item({ materialId: 'm1' }), index)).toEqual({
      state: 'MISMATCH',
      expectedPrice: 3400,
    })
  })

  it('取不到网价时判为无网价并保留当前单价', () => {
    expect(
      evaluateNetPriceMatch(item({ materialId: 'm2', unitPrice: 3200 }), index),
    ).toEqual({ state: 'NO_PRICE', currentPrice: 3200 })
  })

  it('两位小数只差半分以内视为匹配(金额精度口径)', () => {
    expect(
      evaluateNetPriceMatch(
        item({ materialId: 'm1', unitPrice: 3400.004 }),
        index,
      ).state,
    ).toBe('MATCHED')
    expect(
      evaluateNetPriceMatch(
        item({ materialId: 'm1', unitPrice: 3400.01 }),
        index,
      ).state,
    ).toBe('MISMATCH')
  })
})

describe('summarizeNetPriceMatch', () => {
  it('按行汇总四类状态并给出不匹配行 id', () => {
    const items = [
      item({ id: 'a', materialId: 'm1', unitPrice: 3430 }),
      item({ id: 'b', materialId: 'm1', unitPrice: 3200 }),
      // 带商品维度但索引里没有对应网价: 不会命中"空维度"键, 判为无网价
      item({ id: 'c', materialId: 'm2', brand: '沙钢', material: 'HRB500' }),
      item({ id: 'd', materialId: 'm1', unitPrice: 3430 }),
    ]
    const index = buildNetPriceIndex([row({ materialId: 'm1', price: 3400 })])
    const entries = {
      a: evaluateNetPriceMatch(items[0], index, { mode: 'ADD', amount: 30 }),
      b: evaluateNetPriceMatch(items[1], index, { mode: 'ADD', amount: 30 }),
      c: evaluateNetPriceMatch(items[2], index, { mode: 'ADD', amount: 30 }),
      // d 故意不写: 未核查
    }
    expect(summarizeNetPriceMatch(items, entries)).toEqual({
      total: 4,
      matched: 1,
      mismatch: 1,
      noPrice: 1,
      unchecked: 1,
      mismatchIds: ['b'],
    })
  })

  it('没有核查结果时整单都是未核查', () => {
    const items = [item({ id: 'a' }), item({ id: 'b' })]
    expect(summarizeNetPriceMatch(items, {})).toEqual({
      total: 2,
      matched: 0,
      mismatch: 0,
      noPrice: 0,
      unchecked: 2,
      mismatchIds: [],
    })
  })
})

describe('applyNetPricesToItems', () => {
  const index = buildNetPriceIndex([
    row({ materialId: 'm1', price: 3400 }),
    row({ materialId: 'm3', price: 2000, brand: '沙钢' }),
  ])

  it('整单写入: 无网价行保持原值, 空行跳过, 并统计改写行', () => {
    const items = [
      item({ id: 'a', materialId: 'm1', unitPrice: 3200 }),
      item({ id: 'b', materialId: 'm2', unitPrice: 999, material: 'HRB500' }),
      item({ id: 'c' }),
    ]
    const outcome = applyNetPricesToItems(items, index, {
      mode: 'ADD',
      amount: 30,
    })
    expect(outcome.filled).toBe(1)
    expect(outcome.nextItems[0].unitPrice).toBe(3430)
    // 无网价行保持原值, 不被清空/改写
    expect(outcome.nextItems[1]).toEqual(items[1])
    expect(outcome.noPrice).toEqual(['HRB500'])
    expect(outcome.noPriceIds).toEqual(['b'])
    expect(outcome.skipped).toBe(1)
    expect(outcome.overwrittenIds).toEqual(['a'])
  })

  it('单价已经等于应有价时不计入改写行(避免无意义确认与覆盖)', () => {
    const items = [item({ id: 'a', materialId: 'm1', unitPrice: 3430 })]
    const outcome = applyNetPricesToItems(items, index, {
      mode: 'ADD',
      amount: 30,
    })
    expect(outcome.filled).toBe(1)
    expect(outcome.overwrittenIds).toEqual([])
  })

  it('减价规则按减价写回', () => {
    const items = [item({ id: 'a', materialId: 'm1', unitPrice: 1 })]
    const outcome = applyNetPricesToItems(items, index, {
      mode: 'SUBTRACT',
      amount: 40,
    })
    expect(outcome.nextItems[0].unitPrice).toBe(3360)
  })
})

describe('hasItemIdentity', () => {
  it('按物料 id 或品牌/材质识别商品身份', () => {
    expect(hasItemIdentity(item({ materialId: 'm1' }))).toBe(true)
    expect(hasItemIdentity(item({ material: 'HRB400E' }))).toBe(true)
    expect(hasItemIdentity(item({ brand: '中天' }))).toBe(true)
    expect(hasItemIdentity(item({}))).toBe(false)
    expect(hasItemIdentity(item({ material: '  ' }))).toBe(false)
  })
})
