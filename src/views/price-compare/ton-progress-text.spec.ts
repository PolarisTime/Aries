import i18next from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  compactTonText,
  issuedBrandText,
  maxRemainingTonTextWidth,
  maxTonProgressTextWidth,
  tonProgressTextParts,
  tonRemainingText,
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
 * 吨位两类文案口径: 渲染与列宽定宽共用同一份(见 ton-progress-text.ts)。
 *
 * <p>口径(业务确认, 2026-10-14 修正): **已开吨位 = 本单据该明细行报单吨位 + 其他已保存报单
 * 占用**; **剩余未开吨位 = 订货吨位 − 已开吨位**。前者回答"这条明细行开出了多少", 后者回答
 * "这条明细行还能开多少", 只有后者为负(已开超过订货量)才是需要干预的超开。</p>
 */
describe('吨位进度列文案(已开 / 剩余未开)', () => {
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

  it('已开吨位 = 本单据报单吨位 + 其他已保存报单占用', () => {
    // 报 12 吨、其他报单 0 ⇒ 已开 12(用户截图那一行)
    expect(
      tonProgressTextParts(poRecord({ issuedWeight: 0 }), 12).primary,
    ).toBe('12')
    // 报 40 吨、其他报单 30 ⇒ 已开 70
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 40, issuedWeight: 30 }),
        40,
      ).primary,
    ).toBe('70')
    expect(tonProgressTextParts(poRecord({ issuedWeight: 0 }), 12).brand).toBe(
      '中天',
    )
  })

  it('剩余未开吨位 = 订货吨位 − 已开吨位(订货量是基数)', () => {
    // 订货 10.19、报 30、其他 0 ⇒ 剩余 10.19 − 30 = −19.81(超开)
    expect(
      tonRemainingText(poRecord({ orderedWeight: 10.19, issuedWeight: 0 }), 30),
    ).toBe('-19.81')
    // 订货 40、报 12、其他 0 ⇒ 剩余 28
    expect(
      tonRemainingText(poRecord({ orderedWeight: 40, issuedWeight: 0 }), 12),
    ).toBe('28')
  })

  it('已开合计超过订货量时剩余为负(由单元格标红说明)', () => {
    expect(
      tonRemainingText(poRecord({ orderedWeight: 10, issuedWeight: 30 }), 10),
    ).toBe('-30')
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
    ).toBe('65.768')
    // 剩余同理: 订货 100 − 65.768 = 34.232
    expect(
      tonRemainingText(
        poRecord({ orderedWeight: 100, issuedWeight: 32.768 }),
        33,
      ),
    ).toBe('34.232')
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
    // 本单据给明细 2 报 115.5 吨: 已开 = 115.5 + 12.5 = 128
    expect(
      maxTonProgressTextWidth(records, new Map([['2', 115.5]]), widthOf),
    ).toBe('128中天钢铁'.length)
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

  it('剩余未开列按最长的一条剩余吨位定宽', () => {
    const records = [
      poRecord({ purchaseOrderItemId: '1', orderedWeight: 40 }),
      poRecord({ purchaseOrderItemId: '2', orderedWeight: 8884.5 }),
    ]
    const wide = maxRemainingTonTextWidth(records, new Map([['1', 12]]))
    const narrow = maxRemainingTonTextWidth(
      [poRecord({ purchaseOrderItemId: '1', orderedWeight: 40 })],
      new Map([['1', 0]]),
    )
    // 取最长的一条: 8,884.5 比 40 宽
    expect(wide).toBeGreaterThan(narrow)
    // 负值(超开)同样要有宽度
    expect(
      maxRemainingTonTextWidth(
        [poRecord({ orderedWeight: 10, issuedWeight: 30 })],
        new Map([['301', 10]]),
      ),
    ).toBeGreaterThan(0)
    expect(maxRemainingTonTextWidth([], new Map())).toBe(0)
  })
})
