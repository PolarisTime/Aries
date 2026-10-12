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
 * 这里锁定"两处不会再各写一套"的关键行为: 紧凑吨位、品牌去重、最长文案。
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

  it('品牌去重并用顿号拼接, 空品牌返回空串', () => {
    expect(issuedBrandText(poRecord({ brand: '中天' }))).toBe('中天')
    expect(issuedBrandText(poRecord({ brand: ' 中天 ' }))).toBe('中天')
    expect(issuedBrandText(poRecord({ brand: '' }))).toBe('')
    expect(issuedBrandText(poRecord({ brand: '中天、中天' }))).toBe(
      '中天、中天',
    )
  })

  it('比值段用紧凑吨位渲染「已开 实际/订货」', () => {
    const parts = tonProgressTextParts(
      i18next.t,
      poRecord({ issuedWeight: 30, orderedWeight: 40 }),
    )
    expect(parts.ratio).toBe('已开 30/40')
    expect(parts.brand).toBe('中天')
  })

  it('三位小数吨位不被截断成整数', () => {
    const parts = tonProgressTextParts(
      i18next.t,
      poRecord({ issuedWeight: 5.5, orderedWeight: 32.768 }),
    )
    expect(parts.ratio).toBe('已开 5.5/32.768')
  })

  it('最长文案取自全部明细行', () => {
    const records = [
      poRecord({ purchaseOrderItemId: '1', brand: '中天' }),
      poRecord({
        purchaseOrderItemId: '2',
        brand: '中天钢铁',
        orderedWeight: 128,
        issuedWeight: 12.5,
      }),
    ]
    const widthOf = (text: string) => text.length
    const max = maxTonProgressTextWidth(i18next.t, records, (parts) =>
      widthOf(parts.ratio + parts.brand),
    )
    expect(max).toBe('已开 12.5/128'.length + '中天钢铁'.length)
    // 空列表不产生宽度
    expect(maxTonProgressTextWidth(i18next.t, [], () => 0)).toBe(0)
  })
})
