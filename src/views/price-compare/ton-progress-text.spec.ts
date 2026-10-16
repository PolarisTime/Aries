import i18next from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  actualShippedTonOf,
  compactTonText,
  issuedBrandText,
  maxRemainingTonTextWidth,
  maxTonProgressTextWidth,
  remainingTonDisplay,
  remainingTonText,
  remainingUnshippedTon,
  shippedTonTotal,
  tonProgressDetailRows,
  tonProgressDetailText,
  tonProgressOverShippedText,
  tonProgressTextParts,
  tonRemainingText,
} from './ton-progress-text'

/** 明细行夹具: 报单占用(issuedWeight)与真实已开货(actualWeightTon)默认都给值, 便于区分两者。 */
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
    actualWeightTon: null,
    issuedDone: false,
    status: '正常',
    ...overrides,
  }
}

/**
 * 吨位三列口径: 渲染与列宽定宽共用同一份(见 ton-progress-text.ts)。
 *
 * <p>方案 B(业务确认, 2026-10-16): **已开货 = 关联明细行的真实已开货(入库回写)**;
 * **剩余未开 = 本单据报单吨位 − 已开货**。已开货是订单行级、报单是单据级, 因此剩余为负
 * 是正常业务态(订单行被共享/本单只报一部分), 按业务要求原样显示并标红, 不夹到 0。</p>
 *
 * <p>这套用例同时钉住"不要把报单占用(issuedWeight)当成已开货": 两者在夹具里给不同值。</p>
 */
describe('吨位三列文案(报单 / 已开货 / 剩余未开)', () => {
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
  })

  it('已开货只取真实入库量, 不取报单占用(issuedWeight)', () => {
    // 真实已开货 32.768; 报单占用(别家报价单)5 吨绝不能出现在已开货列
    const record = poRecord({ actualWeightTon: 32.768, issuedWeight: 5 })
    expect(tonProgressTextParts(record).primary).toBe('32.768')
    expect(tonProgressTextParts(record).primary).not.toBe('5')
    expect(actualShippedTonOf(record.actualWeightTon)).toBe(32.768)
  })

  it('尚未有到货记录时已开货按 0(不回退到订货量或报单占用)', () => {
    // null / undefined / 非有限值都按 0, 且不得回退到 orderedWeight(12) 或 issuedWeight(5)
    expect(actualShippedTonOf(null)).toBe(0)
    expect(actualShippedTonOf(undefined)).toBe(0)
    expect(actualShippedTonOf(Number.NaN)).toBe(0)
    expect(
      tonProgressTextParts(poRecord({ actualWeightTon: null, issuedWeight: 5 }))
        .primary,
    ).toBe('0')
  })

  it('已开货合计 = 各关联明细行真实已开货之和', () => {
    expect(shippedTonTotal([32.768, 0])).toBe(32.768)
    expect(shippedTonTotal([12, 5.5])).toBe(17.5)
    // 非有限值按 0, 不把 NaN 带进列文案
    expect(shippedTonTotal([Number.NaN, 12])).toBe(12)
    expect(shippedTonTotal([])).toBe(0)
  })

  it('剩余未开 = 报单吨位 − 已开货(基数必须是本单报单量)', () => {
    // 报单 40 / 已开货 12 ⇒ 剩余 28
    expect(remainingUnshippedTon(40, 12)).toBe(28)
    expect(remainingTonText(40, 12)).toBe('28')
    expect(remainingTonDisplay(40, 12)).toEqual({ text: '28', overTon: 0 })
    // 报单没填(0)时剩余是 −已开货, 由调用方以短状态兜底, 不在这里特判
    expect(remainingUnshippedTon(0, 0)).toBe(0)
  })

  it('已开货超过本单报单吨位时剩余为负并标红(不夹到 0)', () => {
    /*
     * 真实数据形态: 订单行 344131687053008896 已开货 32.768, 本单报单只有 17。
     * 已开货是订单行级事实(该行全部到货), 报单是单据级需求, 订单行被多张单据共享时必然出现。
     * 业务明确要求原样显示负值并标红, 因此这里断言 text 是负数字符串而不是 '0'。
     */
    const display = remainingTonDisplay(17, 32.768)
    expect(display.text).toBe('-15.768')
    expect(display.overTon).toBeCloseTo(15.768, 6)
    // 反例钉: 夹到 0 的实现会得到 '0', 这条断言就是"改回去必须变红"
    expect(display.text).not.toBe('0')

    // 单条明细行的入口同源
    expect(tonRemainingText(poRecord({ actualWeightTon: 32.768 }), 17)).toBe(
      '-15.768',
    )
  })

  it('剩余未开为 0(恰好开完)时不标红', () => {
    expect(remainingTonDisplay(32.768, 32.768)).toEqual({
      text: '0',
      overTon: 0,
    })
    expect(tonRemainingText(poRecord({ actualWeightTon: 12 }), 12)).toBe('0')
  })

  it('已开超说明用"已开货 / 本单报单 / 差额"三个数(与剩余列同源)', () => {
    const text = tonProgressOverShippedText(
      { reportedTon: 17, shippedTon: 32.768 },
      (key, options) => i18next.t(key, options),
    )
    expect(text).toContain('17.000')
    expect(text).toContain('32.768')
    expect(text).toContain('15.768')
    // 未超出时不给这句
    expect(
      tonProgressOverShippedText(
        { reportedTon: 40, shippedTon: 12 },
        (key, options) => i18next.t(key, options),
      ),
    ).toBeNull()
  })

  it('三位小数吨位不被截断成整数', () => {
    expect(
      tonProgressTextParts(poRecord({ actualWeightTon: 32.768 })).primary,
    ).toBe('32.768')
    expect(remainingTonText(100, 65.768)).toBe('34.232')
  })

  it('取全部明细行中最宽的一条文案(含品牌)', () => {
    const records = [
      poRecord({ purchaseOrderItemId: '1', brand: '中天' }),
      poRecord({
        purchaseOrderItemId: '2',
        brand: '中天钢铁',
        orderedWeight: 128,
        actualWeightTon: 128,
      }),
    ]
    const widthOf = (parts: { primary: string; brand: string }) =>
      (parts.primary + parts.brand).length
    // 明细 2 的本单报单 115.5 > 0 才参与; 已开货 128 最宽
    expect(
      maxTonProgressTextWidth(records, new Map([['2', 115.5]]), widthOf),
    ).toBe('128中天钢铁'.length)
    // 报单为 0 的行显示短状态标签, 不参与宽度比较
    expect(maxTonProgressTextWidth(records, new Map([['2', 0]]), widthOf)).toBe(
      0,
    )
    expect(maxTonProgressTextWidth([], new Map(), () => 0)).toBe(0)
  })

  it('剩余未开列按最长的一条剩余吨位定宽(含负值)', () => {
    const records = [
      poRecord({ purchaseOrderItemId: '1', actualWeightTon: null }),
      poRecord({ purchaseOrderItemId: '2', orderedWeight: 8884.5 }),
    ]
    const wide = maxRemainingTonTextWidth(records, new Map([['1', 12]]))
    const narrow = maxRemainingTonTextWidth(
      [poRecord({ purchaseOrderItemId: '1' })],
      new Map([['1', 1]]),
    )
    // 取最长的一条: 12 比 1 宽
    expect(wide).toBeGreaterThan(narrow)
    // 已开超(负值)也要有宽度, 否则负号被省略号吃掉
    expect(
      maxRemainingTonTextWidth(
        [poRecord({ actualWeightTon: 32.768 })],
        new Map([['301', 17]]),
      ),
    ).toBeGreaterThan(0)
    expect(maxRemainingTonTextWidth([], new Map())).toBe(0)
  })

  it('已开超行把「已开超 X 吨」算进列宽(否则徽标被省略号收尾)', () => {
    const records = [poRecord({ actualWeightTon: 30 })]
    const local = new Map([['301', 19.98]])
    const base = maxRemainingTonTextWidth(records, local)
    const withOver = maxRemainingTonTextWidth(
      records,
      local,
      [],
      (overTon) => `已开超 ${compactTonText(overTon)} 吨`,
    )
    expect(withOver).toBeGreaterThan(base)
    // 未已开超时没有徽标, 不该白留宽度
    const okRecords = [poRecord({ actualWeightTon: 12 })]
    const okLocal = new Map([['301', 40]])
    expect(
      maxRemainingTonTextWidth(
        okRecords,
        okLocal,
        [],
        (overTon) => `已开超 ${compactTonText(overTon)} 吨`,
      ),
    ).toBe(maxRemainingTonTextWidth(okRecords, okLocal))
  })

  it('多行关联的合计文案可参与「剩余未开」定宽', () => {
    const records = [poRecord({ orderedWeight: 7.996, actualWeightTon: 0 })]
    const local = new Map([['301', 20]])
    const single = maxRemainingTonTextWidth(records, local)
    expect(maxRemainingTonTextWidth(records, local, [])).toBe(single)
    // 合计文案更宽时必须撑开列宽, 否则会被省略号收尾
    expect(
      maxRemainingTonTextWidth(records, local, ['-4.008', '17,769.5']),
    ).toBeGreaterThan(single)
  })

  it('弹层明细行与读屏整句共用同一份取值与行序', () => {
    const detail = {
      reportedTon: 17,
      shippedTon: 32.768,
      remainingTon: -15.768,
      orderedTon: 32.768,
      brand: '中天',
      overShipped: true,
    }
    const rows = tonProgressDetailRows(detail)
    // 四个数字 + 品牌: 报单请求 / 已开货 / 剩余未开 / 订货额度(参考)
    expect(rows.map((row) => row.labelKey)).toEqual([
      'priceCompare.sheet.purchaseOrderSheetReported',
      'priceCompare.sheet.columns.issuedTon',
      'priceCompare.sheet.columns.unopenedTon',
      'priceCompare.sheet.columns.purchaseOrderOrdered',
      'priceCompare.sheet.columns.brand',
    ])
    expect(rows.map((row) => row.value)).toEqual([
      '17.000',
      '32.768',
      // 已开超: 原样显示负值, 不再夹到 0
      '-15.768',
      '32.768',
      '中天',
    ])
    // 已开货与剩余未开两行都标红(同一份 overShipped 判定)
    expect(rows.filter((row) => row.over).map((row) => row.labelKey)).toEqual([
      'priceCompare.sheet.columns.issuedTon',
      'priceCompare.sheet.columns.unopenedTon',
    ])

    // 已开超说明取同一个出口(不在这里另拼文案)
    const overShippedText =
      tonProgressOverShippedText(detail, (key, options) =>
        i18next.t(key, options),
      ) ?? ''
    expect(overShippedText).toContain('15.768')
    const aria = tonProgressDetailText(
      detail,
      (key) => i18next.t(key),
      overShippedText,
    )
    // 读屏文案必须逐段等于弹层的行(顺序与取值都一样), 已开超说明追加在末尾
    expect(aria).toBe(
      `${rows
        .map((row) => `${i18next.t(row.labelKey)} ${row.value}`)
        .join(' / ')} / ${overShippedText}`,
    )

    // 没有品牌时不追加品牌行; 未已开超时没有标红行
    const plain = tonProgressDetailRows({
      ...detail,
      brand: undefined,
      overShipped: false,
    })
    expect(plain).toHaveLength(4)
    expect(plain.every((row) => !row.over)).toBe(true)
    expect(
      tonProgressDetailText({ ...detail, brand: undefined }, (key) =>
        i18next.t(key),
      ),
    ).toBe(
      plain.map((row) => `${i18next.t(row.labelKey)} ${row.value}`).join(' / '),
    )
  })
})
