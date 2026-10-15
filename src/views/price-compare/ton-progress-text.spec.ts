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
  remainingTonDisplay,
  remainingTonText,
  remainingTonTotal,
  selfAllocatedTonOf,
  tonProgressDetailRows,
  tonProgressDetailText,
  tonProgressOverIssuedText,
  tonProgressOverReportedText,
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

  it('已占用 = 其他单据占用 + 本单分配(方案 A; 报单请求量不进已占用)', () => {
    // 单条关联的历史形态: 分配 = 报单量 ⇒ 已占用与旧口径逐字相同
    expect(
      tonProgressTextParts(poRecord({ issuedWeight: 0 }), 12).primary,
    ).toBe('12')
    // 其他占用 30 + 本单分配 40 ⇒ 已占用 70
    expect(
      tonProgressTextParts(
        poRecord({ orderedWeight: 40, issuedWeight: 30 }),
        40,
      ).primary,
    ).toBe('70')
    // 本单报单请求 130, 但只分配了 108.544 ⇒ 已占用 = 其他 0 + 108.544
    expect(
      tonProgressTextParts(poRecord({ orderedWeight: 108.544 }), 108.544)
        .primary,
    ).toBe('108.544')
    expect(tonProgressTextParts(poRecord({ issuedWeight: 0 }), 12).brand).toBe(
      '中天',
    )
  })

  it('跨单对照(库里真实两行): 其他占用只算别人, 自己那份不重复计', () => {
    // 订货明细行 363391977867182080: 额度 32.768; A 单报 12/分配 12, B 单报 5/分配 5
    // A 单视角: 已占用 = 其他(B)5 + 本单分配 12 = 17; 剩余可开 = 32.768 − 17 = 15.768
    expect(issuedTonTotal(5, 12)).toBe(17)
    expect(remainingTonDisplay(32.768, 5, 12)).toEqual({
      text: '15.768',
      overTon: 0,
    })
    // B 单视角: 已占用 = 其他(A)12 + 本单分配 5 = 17; 剩余同样 15.768(跨单自洽)
    expect(issuedTonTotal(12, 5)).toBe(17)
    expect(remainingTonDisplay(32.768, 12, 5).text).toBe('15.768')
    // 不能把"自己那一份"重复计入: 其他占用 12 只算一次(A 单不会看到 12 + 12)
    expect(issuedTonTotal(12, 5)).not.toBe(24)
  })

  it('报单超出额度不影响剩余可开(方案 A 的关键回归钉)', () => {
    // 报单请求 130 > 额度 108.544, 但本单只分配 108.544(服务端保证 Σ分配 ≤ 报单)
    expect(issuedTonTotal(0, 108.544)).toBe(108.544)
    expect(remainingTonDisplay(108.544, 0, 108.544)).toEqual({
      text: '0',
      overTon: 0,
    })
    // 旧口径(把报单 130 算进已开)会得到 −21.456: 这条断言就是"改回去必须变红"
    expect(remainingTonTotal(108.544, 0, 130)).toBeCloseTo(-21.456, 3)
    // 请求超出另给提示, 数值 = 报单 − 额度
    expect(
      tonProgressOverReportedText(
        { reportedTon: 130, orderedTon: 108.544 },
        (key, options) =>
          i18next.t(key, options as Record<string, unknown> | undefined),
      ),
    ).toContain('超出 21.456 吨')
  })

  it('本单分配缺失时按"等于本行报单量"兜底(历史单值形态不吃掉数字)', () => {
    // allocatedTon 缺失 → 用本行报单量
    expect(selfAllocatedTonOf(undefined, 12)).toBe(12)
    expect(selfAllocatedTonOf(null, 12)).toBe(12)
    expect(selfAllocatedTonOf(Number.NaN, 12)).toBe(12)
    // 有分配量时以分配量为准(方案 A)
    expect(selfAllocatedTonOf(108.544, 130)).toBe(108.544)
    expect(selfAllocatedTonOf(0, 130)).toBe(0)
  })

  it('剩余可开 = 关联额度 − 已占用(额度是基数)', () => {
    // 额度 40、其他占用 0、本单分配 12 ⇒ 剩余 28(单条历史值逐字不变)
    expect(
      tonRemainingText(poRecord({ orderedWeight: 40, issuedWeight: 0 }), 12),
    ).toBe('28')
    // 报单请求 130 > 额度 108.544, 本单只分配 108.544 ⇒ 剩余 0(不再是 −21.456)
    expect(remainingTonTotal(108.544, 0, 108.544)).toBe(0)
    expect(remainingTonDisplay(108.544, 0, 108.544)).toEqual({
      text: '0',
      overTon: 0,
    })
  })

  it('历史脏数据仍可能为负: 「剩余可开」显示 0 并单独给出超出量', () => {
    // 已占用 30 + 10 > 额度 10 ⇒ 超出 30(下限 0)
    const over = remainingTonDisplay(10, 30, 10)
    expect(over.text).toBe('0')
    expect(over.overTon).toBe(30)
    expect(
      tonRemainingText(poRecord({ orderedWeight: 10, issuedWeight: 0 }), 10),
    ).toBe('0')
    // 未超出时量为 0(渲染层据此不显示超开徽标)
    expect(remainingTonDisplay(40, 0, 12)).toEqual({ text: '28', overTon: 0 })
  })

  it('超占用说明用"已占用 / 关联额度 / 差额"三个数(不再是报单请求)', () => {
    const text = tonProgressOverIssuedText(
      { orderedTon: 100, issuedTon: 108.544 },
      (key, options) =>
        i18next.t(key, options as Record<string, unknown> | undefined),
    )
    expect(text).toBe(
      '已占用 108.544 吨 > 关联订单额度 100.000 吨 ⇒ 超出 8.544 吨',
    )
    expect(
      tonProgressOverIssuedText(
        { orderedTon: 40, issuedTon: 12 },
        (key, options) =>
          i18next.t(key, options as Record<string, unknown> | undefined),
      ),
    ).toBeNull()
  })

  it('超报单请求另给提示: 报单请求 > 关联额度 ⇒ 超出 X 吨', () => {
    const text = tonProgressOverReportedText(
      { reportedTon: 130, orderedTon: 108.544 },
      (key, options) =>
        i18next.t(key, options as Record<string, unknown> | undefined),
    )
    expect(text).toBe(
      '报单请求 130.000 吨 > 关联订单额度 108.544 吨 ⇒ 超出 21.456 吨',
    )
    // 请求不超额度时不给这句
    expect(
      tonProgressOverReportedText(
        { reportedTon: 12, orderedTon: 40 },
        (key, options) =>
          i18next.t(key, options as Record<string, unknown> | undefined),
      ),
    ).toBeNull()
    // 与"剩余可开"互不影响: 请求超出 21.456, 但剩余仍是 0(分配吃满额度)
    expect(remainingTonDisplay(108.544, 0, 108.544).text).toBe('0')
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
    // 剩余 = 订货 − 已开(数学量可为负)
    expect(remainingTonTotal(40, 30, 40)).toBe(-30)
    expect(compactTonText(Math.abs(remainingTonTotal(15.992, 0, 20)))).toBe(
      '4.008',
    )
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
    // 展示口径同源: 显示 0, 超开 30
    expect(
      tonRemainingText(poRecord({ orderedWeight: 40, issuedWeight: 30 }), 40),
    ).toBe('0')
    expect(remainingTonDisplay(40, 30, 40).overTon).toBe(30)
  })

  it('剩余未开吨位按关联行合计给文案(列上渲染与定宽共用)', () => {
    // 合计 25.992(两条: 7.996 + 18) − 已开 20 = 5.992 仍有余额
    expect(remainingTonText(25.992, 0, 20)).toBe('5.992')
    // 只算第一条会得到 7.996 − 20 = −12.004 ⇒ 展示成 0 + 超开 12.004, 两者必须可区分
    const single = tonRemainingText(
      poRecord({ orderedWeight: 7.996, issuedWeight: 0 }),
      20,
    )
    expect(single).toBe('0')
    expect(remainingTonDisplay(7.996, 0, 20).overTon).toBeCloseTo(12.004, 6)
    expect(remainingTonText(25.992, 0, 20)).not.toBe(single)
    // 单条关联时合计 = 该条, 非超开的历史值逐字不变
    expect(remainingTonText(40, 30, 40)).toBe(
      tonRemainingText(poRecord({ orderedWeight: 40, issuedWeight: 30 }), 40),
    )
    expect(remainingTonText(40, 0, 12)).toBe('28')
  })

  it('超开行把「超开 X 吨」算进列宽(否则徽标被省略号收尾)', () => {
    const records = [
      poRecord({
        purchaseOrderItemId: '401',
        orderedWeight: 19.98,
        issuedWeight: 0,
      }),
    ]
    const local = new Map([['401', 30]])
    const base = maxRemainingTonTextWidth(records, local)
    const withOver = maxRemainingTonTextWidth(
      records,
      local,
      [],
      (overTon) => `超开 ${compactTonText(overTon)} 吨`,
    )
    expect(withOver).toBeGreaterThan(base)
    // 未超开时没有徽标, 不该白留宽度
    const okRecords = [
      poRecord({
        purchaseOrderItemId: '402',
        orderedWeight: 40,
        issuedWeight: 0,
      }),
    ]
    const okLocal = new Map([['402', 12]])
    expect(
      maxRemainingTonTextWidth(
        okRecords,
        okLocal,
        [],
        (overTon) => `超开 ${compactTonText(overTon)} 吨`,
      ),
    ).toBe(maxRemainingTonTextWidth(okRecords, okLocal))
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
      selfAllocatedTon: 20,
      otherIssuedTon: 0,
      issuedTon: 20,
      remainingTon: -4.008,
      orderedTon: 15.992,
      brand: '中天',
      overIssued: true,
    }
    const rows = tonProgressDetailRows(detail)
    // 方案 A 的六个数字 + 品牌: 报单请求 / 本单分配 / 其他占用 / 已占用 / 剩余可开 / 额度
    expect(rows.map((row) => row.labelKey)).toEqual([
      'priceCompare.sheet.purchaseOrderSheetReported',
      'priceCompare.sheet.purchaseOrderSelfAllocated',
      'priceCompare.sheet.purchaseOrderIssuedActual',
      'priceCompare.sheet.columns.issuedTon',
      'priceCompare.sheet.columns.unopenedTon',
      'priceCompare.sheet.columns.purchaseOrderOrdered',
      'priceCompare.sheet.columns.brand',
    ])
    expect(rows.map((row) => row.value)).toEqual([
      '20.000',
      '20.000',
      '0.000',
      '20.000',
      // 剩余可开下限 0(数学量 −4.008 由超占用专句解释)
      '0.000',
      '15.992',
      '中天',
    ])
    // 只有"已开"那一行可能标红
    expect(rows.filter((row) => row.over).map((row) => row.labelKey)).toEqual([
      'priceCompare.sheet.columns.issuedTon',
    ])

    // 超占用说明取同一个出口(不在这里另拼文案)
    const overIssuedText =
      tonProgressOverIssuedText(detail, (key, options) =>
        i18next.t(key, options as Record<string, unknown> | undefined),
      ) ?? ''
    expect(overIssuedText).toBe(
      '已占用 20.000 吨 > 关联订单额度 15.992 吨 ⇒ 超出 4.008 吨',
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
    expect(plain).toHaveLength(6)
    expect(
      tonProgressDetailText({ ...detail, brand: undefined }, (key) =>
        i18next.t(key),
      ),
    ).toBe(
      plain.map((row) => `${i18next.t(row.labelKey)} ${row.value}`).join(' / '),
    )
  })
})
