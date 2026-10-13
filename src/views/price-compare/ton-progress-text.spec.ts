import i18next from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  compactTonText,
  issuedBrandText,
  maxTonProgressTextWidth,
  remainingWeightOf,
  tonProgressTextParts,
} from './ton-progress-text'

function poRecord(
  overrides: Partial<PurchaseOrderTonnageRecord> = {},
): PurchaseOrderTonnageRecord {
  return {
    purchaseOrderId: '1',
    purchaseOrderItemId: '301',
    orderNo: 'PO-1',
    supplierName: '沙钢',
    category: '螺纹钢',
    material: 'HRB400E',
    spec: '12',
    length: '9米',
    brand: '中天',
    orderedWeight: 12,
    issuedWeight: 0,
    remainingWeight: 12,
    status: '正常',
    ...overrides,
  }
}

/**
 * 进度小字文案口径: 渲染与列宽定宽共用同一份(见 ton-progress-text.ts)。
 *
 * <p>可见文案是「剩余 10.19 · 中天」这种一句话 —— 直接回答"还能开多少"; 超额时换成
 * 「超额 1.81」直接回答"超了多少"。不再用「已开 0/10.19」这种要用户自己心算的斜杠比值。</p>
 */
describe('吨位进度小字文案', () => {
  beforeEach(async () => {
    await i18next.changeLanguage('zh-CN')
  })

  it('紧凑吨位去掉无意义尾零, 保留有效小数', () => {
    expect(compactTonText(26)).toBe('26')
    expect(compactTonText(32.768)).toBe('32.768')
    expect(compactTonText(12.5)).toBe('12.5')
    expect(compactTonText(0)).toBe('0')
  })

  it('品牌去重并保留原文, 空品牌返回空串', () => {
    expect(issuedBrandText(poRecord({ brand: '中天' }))).toBe('中天')
    expect(issuedBrandText(poRecord({ brand: ' 中天 ' }))).toBe('中天')
    expect(issuedBrandText(poRecord({ brand: '' }))).toBe('')
    expect(issuedBrandText(poRecord({ brand: '中天、中天' }))).toBe(
      '中天、中天',
    )
  })

  it('剩余可开吨 = 订货 − 已开(实际), 不含本单据未保存吨位', () => {
    expect(
      remainingWeightOf(poRecord({ orderedWeight: 40, issuedWeight: 30 })),
    ).toBe(10)
    expect(
      remainingWeightOf(poRecord({ orderedWeight: 10.19, issuedWeight: 0 })),
    ).toBeCloseTo(10.19, 5)
  })

  it('未超额时显示剩余可开吨: 「剩余 10.19」', () => {
    const record = poRecord({ orderedWeight: 10.19, issuedWeight: 0 })
    // 本行填 8 吨: 8 ≤ 10.19, 不超额
    const parts = tonProgressTextParts(i18next.t, record, 8)
    expect(parts.primary).toBe('剩余 10.19')
    expect(parts.brand).toBe('中天')
  })

  it('超额时直接给超出量: 「超额 1.81」', () => {
    const record = poRecord({ orderedWeight: 10.19, issuedWeight: 0 })
    // 本行填 12 吨: 0 + 12 > 10.19, 超 1.81
    const parts = tonProgressTextParts(i18next.t, record, 12)
    expect(parts.primary).toBe('超额 1.81')
  })

  it('三位小数吨位不被截断成整数', () => {
    const record = poRecord({ orderedWeight: 32.768, issuedWeight: 0 })
    expect(tonProgressTextParts(i18next.t, record, 6).primary).toBe(
      '剩余 32.768',
    )
    expect(tonProgressTextParts(i18next.t, record, 33).primary).toBe(
      '超额 0.232',
    )
  })

  it('恰好等于订货吨位不算超额(边界)', () => {
    const record = poRecord({ orderedWeight: 10.19, issuedWeight: 0 })
    expect(tonProgressTextParts(i18next.t, record, 10.19).primary).toBe(
      '剩余 10.19',
    )
  })

  it('取全部明细行中最宽的一条文案(未超额与超额两种都算)', () => {
    const records = [
      poRecord({ purchaseOrderItemId: '1', brand: '中天' }),
      poRecord({
        purchaseOrderItemId: '2',
        brand: '中天钢铁',
        orderedWeight: 128,
        issuedWeight: 12.5,
      }),
    ]
    const widthOf = (parts: { primary: string; brand: string }) =>
      (parts.primary + parts.brand).length
    // 没有未保存吨位: 明细 2 是「剩余 115.5」+「中天钢铁」= 12 个字符
    expect(
      maxTonProgressTextWidth(i18next.t, records, new Map(), widthOf),
    ).toBe('剩余 115.5中天钢铁'.length)
    expect('剩余 115.5中天钢铁'.length).toBe(12)
    // 本单据给明细 2 填 9000 吨: 超额文案比未超额更长, 且四位吨位带千分位, 也要覆盖
    expect(
      maxTonProgressTextWidth(
        i18next.t,
        records,
        new Map([['2', 9000]]),
        widthOf,
      ),
    ).toBe('超额 8,884.5中天钢铁'.length)
    // 千分位分隔符确实进了文案(宽度估算按 0.3em 计入, 不会算窄)
    expect('超额 8,884.5中天钢铁'.length).toBeGreaterThan(
      '剩余 115.5中天钢铁'.length,
    )
    // 空列表不产生宽度
    expect(maxTonProgressTextWidth(i18next.t, [], new Map(), () => 0)).toBe(0)
  })
})
