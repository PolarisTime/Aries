import { describe, expect, it } from 'vitest'
import type { MaterialPriceMatch } from '@/api/market/steel-quotes'
import type { ModuleLineItem } from '@/types/module-page'
import { substituteMaterialOf } from '@/utils/material-grade'
import {
  applyNetPriceFloat,
  applyNetPricesToItems,
  buildNetPriceIndex,
  evaluateNetPriceMatch,
  hasItemIdentity,
  normalizeDateValue,
  resolveNetPriceHit,
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

describe('buildNetPriceIndex / resolveNetPriceHit', () => {
  it('优先按 materialId 命中', () => {
    const index = buildNetPriceIndex([
      row({ materialId: 'm1', price: '3400.00', brand: '中天' }),
    ])
    expect(resolveNetPriceHit(item({ materialId: 'm1' }), index)?.price).toBe(
      3400,
    )
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
      resolveNetPriceHit(
        item({
          brand: '中天',
          category: '螺纹钢',
          material: 'HRB400E',
          spec: '12',
          length: '9米',
        }),
        index,
      )?.price,
    ).toBe(3350)
  })

  it('无网价（price 为空）不进入索引, 返回 undefined', () => {
    const index = buildNetPriceIndex([
      row({ materialId: 'm1', price: null, status: '无网价' }),
    ])
    expect(
      resolveNetPriceHit(item({ materialId: 'm1' }), index)?.price,
    ).toBeUndefined()
  })

  it('非有限价格被忽略', () => {
    const index = buildNetPriceIndex([row({ materialId: 'm1', price: 'NaN' })])
    expect(
      resolveNetPriceHit(item({ materialId: 'm1' }), index)?.price,
    ).toBeUndefined()
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

/**
 * 抗震牌号替代取价(业务: 项目报 HRB400, 但现货只有 HRB400E, 实际按 400E 网价结算)。
 *
 * <p>库里实测: 报单行 HRB400 有 124 条, 而商品资料里 HRB400E 239 个、HRB400 仅 63 个 ——
 * 报 400 的行取不到价是常态。替代必须"能取到价"且"一路可见", 不能静默换口径。</p>
 */
describe('抗震牌号替代取价', () => {
  const base = {
    brand: '中天',
    category: '螺纹钢',
    spec: '16',
    length: '9米',
  }

  it('普通牌号补 E: HRB400 → HRB400E, 其他情况不替代', () => {
    expect(substituteMaterialOf('HRB400')).toBe('HRB400E')
    expect(substituteMaterialOf('hrb400')).toBe('HRB400E')
    expect(substituteMaterialOf(' HRB400 ')).toBe('HRB400E')
    expect(substituteMaterialOf('HRB335')).toBe('HRB335E')
    // 已是抗震牌号不再补 E(否则 400E → 400EE)
    expect(substituteMaterialOf('HRB400E')).toBeNull()
    // 跨强度替换不归取价管(那是改设计强度), 一律不替代
    expect(substituteMaterialOf('HPB300')).toBeNull()
    expect(substituteMaterialOf('')).toBeNull()
    expect(substituteMaterialOf(null)).toBeNull()
  })

  it('本行材质无网价时用同强度抗震牌号的价, 并标记 substituted', () => {
    const index = buildNetPriceIndex([
      row({ ...base, material: 'HRB400E', price: '3420' }),
    ])
    const hit = resolveNetPriceHit(item({ ...base, material: 'HRB400' }), index)
    expect(hit?.price).toBe(3420)
    expect(hit?.substituted).toBe(true)
    expect(hit?.matchedMaterial).toBe('HRB400E')
    // 反例钉: 不能把别人的 400 价当成命中(这里 400 根本没数据)
    expect(hit?.price).not.toBe(3400)
  })

  it('本行材质自己有网价时优先用自己, 不做替代', () => {
    const index = buildNetPriceIndex([
      row({ ...base, material: 'HRB400', price: '3400' }),
      row({ ...base, material: 'HRB400E', price: '3420' }),
    ])
    const hit = resolveNetPriceHit(item({ ...base, material: 'HRB400' }), index)
    // 400 有价就用 400 的 3400, 不该跳到 400E 的 3420
    expect(hit?.price).toBe(3400)
    expect(hit?.substituted).toBeUndefined()
  })

  it('两者都没有网价时返回 undefined(交给"无网价, 请手工填写")', () => {
    const index = buildNetPriceIndex([])
    expect(
      resolveNetPriceHit(item({ ...base, material: 'HRB400' }), index),
    ).toBeUndefined()
  })

  it('整单取价把替代行单独记进 substitutedIds, 且单价用 400E 的价', () => {
    const index = buildNetPriceIndex([
      row({ ...base, material: 'HRB400E', price: '3420' }),
    ])
    const outcome = applyNetPricesToItems(
      [
        item({ id: 'a', ...base, material: 'HRB400' }),
        item({ id: 'b', ...base, material: 'HRB400E' }),
      ],
      index,
    )
    // 两行都取到价: 400 行靠替代, 400E 行靠自身
    expect(outcome.filled).toBe(2)
    expect(outcome.noPrice).toHaveLength(0)
    // 只有 400 那行被标记为替代
    expect(outcome.substitutedIds).toEqual({ a: 'HRB400E' })
    expect(outcome.nextItems[0].unitPrice).toBe(3420)
    expect(outcome.nextItems[1].unitPrice).toBe(3420)
  })

  it('核查结果带上 substitutedMaterial, 行内标识才能说明按哪个牌号取的价', () => {
    const index = buildNetPriceIndex([
      row({ ...base, material: 'HRB400E', price: '3420' }),
    ])
    const entry = evaluateNetPriceMatch(
      item({ ...base, material: 'HRB400', unitPrice: 3420 }),
      index,
    )
    expect(entry.state).toBe('MATCHED')
    expect(entry.substitutedMaterial).toBe('HRB400E')

    const ownIndex = buildNetPriceIndex([
      row({ ...base, material: 'HRB400', price: '3400' }),
    ])
    const ownEntry = evaluateNetPriceMatch(
      item({ ...base, material: 'HRB400', unitPrice: 3400 }),
      ownIndex,
    )
    // 自己有价时不该被标成替代
    expect(ownEntry.substitutedMaterial).toBeUndefined()
  })
})
