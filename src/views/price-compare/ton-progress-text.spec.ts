import i18next from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  compactTonText,
  issuedBrandText,
  maxTonProgressTextWidth,
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
 * <p>口径(业务确认): **剩余 = 本单据该订单明细行报单吨位 − 已开吨位**。可见文案就是
 * 「剩余 12 · 中天」这样一句话; 只有"已开超过本单报单量"才转成「已开超 x」(真正的异常)。
 * 采购订单的订货量不参与判定 —— 历史缺陷正是拿订货量当上限, 于是"报 12 吨、订单 10.19 吨"
 * 被判成超额, 用户反馈逻辑不对。</p>
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

  it('剩余 = 本单据报单吨位 − 已开吨位(与采购订单订货量无关)', () => {
    // 本单报 40 吨, 其他单据已开 30 ⇒ 剩余 10
    const parts = tonProgressTextParts(
      i18next.t,
      poRecord({ orderedWeight: 40, issuedWeight: 30 }),
      40,
    )
    expect(parts.primary).toBe('剩余 10')
    expect(parts.brand).toBe('中天')
  })

  it('回归: 报 12 吨、订单只有 10.19 吨不再被判超额', () => {
    // 用户反馈的场景: 报单先于采购, 订货量只是参考
    const record = poRecord({ orderedWeight: 10.19, issuedWeight: 0 })
    expect(tonProgressTextParts(i18next.t, record, 12).primary).toBe('剩余 12')
    // 订货量大、已开少也只看本单报单量
    expect(
      tonProgressTextParts(
        i18next.t,
        poRecord({ orderedWeight: 500, issuedWeight: 0 }),
        12,
      ).primary,
    ).toBe('剩余 12')
  })

  it('已开超过本单报单量: 「已开超 6.5」', () => {
    const record = poRecord({ orderedWeight: 100, issuedWeight: 12.5 })
    expect(tonProgressTextParts(i18next.t, record, 6).primary).toBe(
      '已开超 6.5',
    )
  })

  it('本单据尚未报量时只说明已开多少: 「已开 3」', () => {
    const record = poRecord({ orderedWeight: 100, issuedWeight: 3 })
    expect(tonProgressTextParts(i18next.t, record, 0).primary).toBe('已开 3')
    // 吨位为空的未报量行(报单为 0)
    expect(tonProgressTextParts(i18next.t, record, Number.NaN).primary).toBe(
      '已开 3',
    )
  })

  it('三位小数吨位不被截断成整数', () => {
    const record = poRecord({ orderedWeight: 100, issuedWeight: 0 })
    expect(tonProgressTextParts(i18next.t, record, 32.768).primary).toBe(
      '剩余 32.768',
    )
    expect(
      tonProgressTextParts(
        i18next.t,
        poRecord({ orderedWeight: 100, issuedWeight: 32.768 }),
        33,
      ).primary,
    ).toBe('剩余 0.232')
  })

  it('报单量与已开量相等时剩余为 0, 不算已开超(边界)', () => {
    const record = poRecord({ orderedWeight: 100, issuedWeight: 10.19 })
    expect(tonProgressTextParts(i18next.t, record, 10.19).primary).toBe(
      '剩余 0',
    )
  })

  it('取全部明细行中最宽的一条文案(报单量与未报量两种状态都算)', () => {
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
    // 本单据没给明细 2 填吨位: 它是「已开 12.5」+「中天钢铁」
    expect(
      maxTonProgressTextWidth(i18next.t, records, new Map(), widthOf),
    ).toBe('已开 12.5中天钢铁'.length)
    // 本单据给明细 2 填 9000 吨: 剩余 8,987.5(带千分位)更长, 也要覆盖
    expect(
      maxTonProgressTextWidth(
        i18next.t,
        records,
        new Map([['2', 9000]]),
        widthOf,
      ),
    ).toBe('剩余 8,987.5中天钢铁'.length)
    // 千分位分隔符确实进了文案(宽度估算按 0.3em 计入, 不会算窄)
    expect('剩余 8,987.5中天钢铁'.length).toBeGreaterThan(
      '已开 12.5中天钢铁'.length,
    )
    // 空列表不产生宽度
    expect(maxTonProgressTextWidth(i18next.t, [], new Map(), () => 0)).toBe(0)
  })
})
