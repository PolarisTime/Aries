import i18next from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  compactTonText,
  issuedBrandText,
  issuedTonTotal,
  maxRemainingTonTextWidth,
  maxTonProgressTextWidth,
  remainingTonText,
  remainingTonTotal,
  tonProgressDetailRows,
  tonProgressDetailText,
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

  /**
   * 口径单一来源: 加法/减法只在这里实现一次, 弹层逐行与读屏整句同源。
   * 这几条用例钉住"同一行不会出现两个数字"——各自内联算式时最容易在这里漂移。
   */
  it('已开/剩余的加数与减数只有一处实现', () => {
    // 已开 = 其他报单占用 + 本单报单
    expect(issuedTonTotal(30, 40)).toBe(70)
    // 剩余 = 订货 − 已开(可为负)
    expect(remainingTonTotal(40, 30, 40)).toBe(-30)
    expect(compactTonText(remainingTonTotal(15.992, 0, 20))).toBe('-4.008')
    // 非有限值按 0 处理, 不把 NaN 带进列文案
    expect(issuedTonTotal(Number.NaN, 12)).toBe(12)
    expect(remainingTonTotal(40, Number.NaN, Number.NaN)).toBe(40)
    // 与列文案口径一致: 已开 70 / 剩余 −30
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 40, issuedWeight: 30 }),
        40,
      ).primary,
    ).toBe('70')
    expect(
      tonRemainingText(poRecord({ orderedWeight: 40, issuedWeight: 30 }), 40),
    ).toBe('-30')
  })

  it('剩余未开吨位按关联行合计给文案(列上渲染与定宽共用)', () => {
    // 列上: 合计 = 订货合计 − 已开合计
    expect(remainingTonText(15.992, 0, 20)).toBe('-4.008')
    // 只算第一条会得到 −12.004(7.996 − 20): 两者必须可区分
    expect(remainingTonText(15.992, 0, 20)).not.toBe(
      tonRemainingText(poRecord({ orderedWeight: 7.996, issuedWeight: 0 }), 20),
    )
    // 单条关联时合计 = 该条, 历史值逐字不变
    expect(remainingTonText(40, 30, 40)).toBe(
      tonRemainingText(poRecord({ orderedWeight: 40, issuedWeight: 30 }), 40),
    )
  })

  it('多行关联的合计文案可参与「剩余未开吨位」定宽', () => {
    const records = [
      poRecord({
        purchaseOrderItemId: '301',
        orderedWeight: 7.996,
        issuedWeight: 0,
      }),
    ]
    const local = new Map([['301', 20]])
    const single = maxRemainingTonTextWidth(records, local)
    // 不传候选时行为与以前一致(向后兼容: 旧调用点不受影响)
    expect(maxRemainingTonTextWidth(records, local, [])).toBe(single)
    // 合计文案更宽时必须撑开列宽, 否则会被省略号收尾
    expect(
      maxRemainingTonTextWidth(records, local, ['-4.008', '17,769.5']),
    ).toBeGreaterThan(single)
  })

  it('弹层明细行与读屏整句共用同一份取值与行序', () => {
    const detail = {
      reportedTon: 20,
      otherIssuedTon: 0,
      issuedTon: 20,
      remainingTon: -4.008,
      orderedTon: 15.992,
      brand: '中天',
      overIssued: true,
    }
    const rows = tonProgressDetailRows(detail)
    expect(rows.map((row) => row.labelKey)).toEqual([
      'priceCompare.sheet.purchaseOrderSheetReported',
      'priceCompare.sheet.purchaseOrderIssuedActual',
      'priceCompare.sheet.columns.issuedTon',
      'priceCompare.sheet.columns.unopenedTon',
      'priceCompare.sheet.columns.purchaseOrderOrdered',
      'priceCompare.sheet.columns.brand',
    ])
    expect(rows.map((row) => row.value)).toEqual([
      '20.000',
      '0.000',
      '20.000',
      '-4.008',
      '15.992',
      '中天',
    ])
    // 只有"已开"那一行可能标红
    expect(rows.filter((row) => row.over).map((row) => row.labelKey)).toEqual([
      'priceCompare.sheet.columns.issuedTon',
    ])

    const overIssuedText = i18next.t(
      'priceCompare.sheet.purchaseOrderOverIssuedLong',
      { issued: '20.000', ordered: '15.992' },
    )
    const aria = tonProgressDetailText(
      detail,
      (key) => i18next.t(key),
      overIssuedText,
    )
    // 读屏文案必须逐段等于弹层的行(顺序与取值都一样), 超开说明追加在末尾
    expect(aria).toBe(
      `${rows
        .map((row) => `${i18next.t(row.labelKey)} ${row.value}`)
        .join(' / ')} / ${overIssuedText}`,
    )

    // 没有品牌时不追加品牌行; 未超开时没有超开说明
    const plain = tonProgressDetailRows({
      ...detail,
      brand: undefined,
      overIssued: false,
    })
    expect(plain).toHaveLength(5)
    expect(
      tonProgressDetailText({ ...detail, brand: undefined }, (key) =>
        i18next.t(key),
      ),
    ).toBe(
      plain.map((row) => `${i18next.t(row.labelKey)} ${row.value}`).join(' / '),
    )
  })
})
