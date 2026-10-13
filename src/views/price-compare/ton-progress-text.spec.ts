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

  it('未开吨位 = 订货吨位 − 已开吨位(订货量必须算进来)', () => {
    expect(
      tonProgressTextParts(poRecord({ orderedWeight: 40, issuedWeight: 30 }))
        .primary,
    ).toBe('10')
    expect(
      tonProgressTextParts(poRecord({ orderedWeight: 10.19, issuedWeight: 0 }))
        .primary,
    ).toBe('10.19')
    expect(
      tonProgressTextParts(poRecord({ orderedWeight: 12, issuedWeight: 0 }))
        .brand,
    ).toBe('中天')
  })

  it('回归: 报 12 吨而订单订货量 10.19 吨时, 未开吨位仍是 10.19(不再替用户下结论)', () => {
    // 报单吨位由相邻列单独给出, 这里只负责"订单还没开多少"
    const parts = tonProgressTextParts(
      poRecord({ orderedWeight: 10.19, issuedWeight: 0 }),
    )
    expect(parts.primary).toBe('10.19')
    expect(parts.primary).not.toContain('超')
  })

  it('已开超过订货量时给负值(由单元格标红说明)', () => {
    expect(
      tonProgressTextParts(poRecord({ orderedWeight: 10, issuedWeight: 30 }))
        .primary,
    ).toBe('-20')
  })

  it('三位小数吨位不被截断成整数', () => {
    expect(
      tonProgressTextParts(poRecord({ orderedWeight: 32.768, issuedWeight: 0 }))
        .primary,
    ).toBe('32.768')
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 33, issuedWeight: 32.768 }),
      ).primary,
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
    // 未开 115.5 + 中天钢铁
    expect(maxTonProgressTextWidth(records, widthOf)).toBe(
      '115.5中天钢铁'.length,
    )
    // 千分位吨位(如 8,884.5)也要被覆盖
    expect(
      maxTonProgressTextWidth(
        [poRecord({ orderedWeight: 8884.5, issuedWeight: 0 })],
        widthOf,
      ),
    ).toBe('8,884.5中天'.length)
    // 空列表不产生宽度
    expect(maxTonProgressTextWidth([], () => 0)).toBe(0)
  })
})
