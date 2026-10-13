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
describe('吨位进度列文案(未开吨位)', () => {
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

  it('未开吨位 = 锁定后的报单吨位 − 已开吨位', () => {
    // 报 12 吨、已开 0 ⇒ 未开 12(用户截图那一行)
    expect(
      tonProgressTextParts(poRecord({ issuedWeight: 0 }), 12).primary,
    ).toBe('12')
    // 报 40 吨、已开 30 ⇒ 未开 10
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 40, issuedWeight: 30 }),
        40,
      ).primary,
    ).toBe('10')
    expect(tonProgressTextParts(poRecord({ issuedWeight: 0 }), 12).brand).toBe(
      '中天',
    )
  })

  it('订货量不参与这个减法(只作参考与选择依据)', () => {
    // 订货 10.19 但报 30: 未开仍是 30 − 0 = 30
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 10.19, issuedWeight: 0 }),
        30,
      ).primary,
    ).toBe('30')
  })

  it('已开超过本单据报的量时给负值(由单元格标红说明)', () => {
    expect(
      tonProgressTextParts(poRecord({ issuedWeight: 30 }), 10).primary,
    ).toBe('-20')
  })

  it('三位小数吨位不被截断成整数', () => {
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 32.768, issuedWeight: 0 }),
        32.768,
      ).primary,
    ).toBe('32.768')
    expect(
      tonProgressTextParts(poRecord({ issuedWeight: 32.768 }), 33).primary,
    ).toBe('0.232')
  })

  it('取全部明细行中最宽的一条文案(含品牌)', () => {
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
    // 本单据给明细 2 报 115.5 吨: 未开 115.5 − 12.5 = 103
    expect(
      maxTonProgressTextWidth(records, new Map([['2', 115.5]]), widthOf),
    ).toBe('103中天钢铁'.length)
    // 千分位吨位(如 8,884.5)也要被覆盖
    expect(
      maxTonProgressTextWidth(
        [poRecord({ orderedWeight: 8884.5, issuedWeight: 0 })],
        new Map([['301', 8884.5]]),
        widthOf,
      ),
    ).toBe('8,884.5中天'.length)
    // 空列表不产生宽度
    expect(maxTonProgressTextWidth([], new Map(), () => 0)).toBe(0)
  })
})
