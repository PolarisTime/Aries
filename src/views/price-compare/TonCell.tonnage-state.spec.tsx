// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, Fragment } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import {
  IssuedTonCell,
  TON_BUBBLE_CLASS,
  TonUnopenedCell,
  tonnageOptionsPhase,
  unallocatedTonOf,
} from './TonCell'
import type { PriceRow } from './types'

/**
 * 吨位关联的三态与欠额展示(回归: 选项未就绪时把"查不到明细行"误报成「已删除」)。
 *
 * <p>首屏/查询失败时 `options` 为空, 旧实现对所有已关联行一律显示「已删除」。现在只有
 * 选项真正就绪(`ready`)才允许下这个结论, 加载中与加载失败显示占位「—」并在气泡里说明
 * 是哪种状态。</p>
 */

const linkedRecord: PurchaseOrderTonnageRecord = {
  purchaseOrderId: '88',
  purchaseOrderItemId: '301',
  orderNo: 'PO-88',
  supplierName: '沙钢',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: '12',
  length: '9米',
  brand: '中天',
  orderedWeight: 60,
  issuedWeight: 20,
  remainingWeight: 40,
  status: '正常',
}

const secondRecord: PurchaseOrderTonnageRecord = {
  ...linkedRecord,
  purchaseOrderId: '99',
  purchaseOrderItemId: '302',
  orderNo: 'PO-99',
  orderedWeight: 70,
  issuedWeight: 0,
  remainingWeight: 70,
}

const baseRow: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 5,
}

/** 已关联 2 张明细行、报单 200 吨、分配 60 + 70 = 130 ⇒ 欠额 70。 */
const shortfallRow: PriceRow = {
  ...baseRow,
  ton: 200,
  purchaseOrderItemId: '301',
  purchaseOrderNo: 'PO-88',
  purchaseOrderLinks: [
    {
      purchaseOrderId: '88',
      purchaseOrderNo: 'PO-88',
      purchaseOrderItemId: '301',
      allocatedTon: 60,
    },
    {
      purchaseOrderId: '99',
      purchaseOrderNo: 'PO-99',
      purchaseOrderItemId: '302',
      allocatedTon: 70,
    },
  ],
}

describe('吨位关联的三态与欠额展示', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    document.querySelectorAll('.ant-tooltip, .ant-popover').forEach((node) => {
      node.remove()
    })
    vi.clearAllMocks()
  })

  const render = (
    row: PriceRow,
    options: PurchaseOrderTonnageRecord[],
    state: { loading: boolean; isError?: boolean; localTonForItem?: number } = {
      loading: false,
    },
  ) => {
    act(() => {
      root.render(
        createElement(
          Fragment,
          null,
          createElement(IssuedTonCell, {
            row,
            options,
            linked: undefined,
            localTonForItem: state.localTonForItem ?? row.ton ?? 0,
            loading: state.loading,
            isError: state.isError,
          }),
          createElement(TonUnopenedCell, {
            row,
            options,
            linked: undefined,
            localTonForItem: state.localTonForItem ?? row.ton ?? 0,
            loading: state.loading,
            isError: state.isError,
            purchaseOrderLinkAllowed: true,
            purchaseOrderLinkBlockedReason: undefined,
            onOpenPicker: vi.fn(),
          }),
        ),
      )
    })
  }

  it('超开时「剩余未开」显示 0 + 超开短文案, 不再显示负的剩余', async () => {
    // 关联订单额度 19.98、本单据报单 30、其他占用 0 ⇒ 数学上超开 10.02
    const overRow: PriceRow = {
      ...baseRow,
      ton: 30,
      purchaseOrderItemId: '301',
      purchaseOrderNo: 'PO-88',
    }
    const overRecord: PurchaseOrderTonnageRecord = {
      ...linkedRecord,
      orderedWeight: 19.98,
      issuedWeight: 0,
      remainingWeight: 19.98,
    }
    render(overRow, [overRecord], { loading: false, localTonForItem: 30 })

    // 用户实测反馈: 「剩余 −10.02」无法理解 —— 列上必须下限 0
    expect(container.textContent).not.toContain('-10.02')
    expect(
      container.querySelector('.price-compare-ton-remaining')?.textContent,
    ).toBe('0超开 10.02 吨')

    // 悬浮说明把三个数一次摆清: 报单请求 / 关联订单额度 / 差额
    const bubble = await bubbleTextOf(
      container.querySelector<HTMLElement>('.price-compare-ton-remaining') ??
        container,
    )
    // 本单分配(兜底为报单量 30) > 额度 19.98 ⇒ 既超占用也超报单请求, 两句都给
    expect(bubble).toContain(
      '已占用 30.000 吨 > 关联订单额度 19.980 吨 ⇒ 超出 10.020 吨',
    )
    expect(bubble).toContain(
      '报单请求 30.000 吨 > 关联订单额度 19.980 吨 ⇒ 超出 10.020 吨',
    )
  })

  it('未超开时「剩余未开」仍按原值显示, 没有超开文案', () => {
    // 订货 60、报单 5、其他 20 ⇒ 剩余 35
    render(
      { ...baseRow, purchaseOrderItemId: '301', purchaseOrderNo: 'PO-88' },
      [linkedRecord],
      { loading: false, localTonForItem: 5 },
    )
    const cell = container.querySelector('.price-compare-ton-remaining')
    expect(cell?.textContent).toBe('35')
    expect(container.textContent).not.toContain('超开')
  })

  /** 悬浮/聚焦短状态标签, 读出气泡文案。 */
  const bubbleTextOf = async (node: HTMLElement) => {
    await act(async () => {
      node.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    return (
      document.querySelector<HTMLElement>(`.ant-tooltip.${TON_BUBBLE_CLASS}`)
        ?.textContent ?? ''
    )
  }

  const stateLabels = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>('.price-compare-ton-state'),
    )

  it('选项查询失败(ready 之外的 error 态)不能断言关联已删除', () => {
    // 行已关联 404, 但选项为空且查询失败 ⇒ 只能说"未知", 不能说「已删除」
    render(
      { ...baseRow, purchaseOrderItemId: '404', purchaseOrderNo: 'PO-404' },
      [],
      {
        loading: false,
        isError: true,
      },
    )
    const labels = stateLabels()
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) expect(label.textContent).toBe('—')
    expect(container.textContent).not.toContain(
      i18n.t('priceCompare.sheet.purchaseOrderMissingShort'),
    )
  })

  it('加载中同样只能给占位, 且气泡说明是"正在加载"而不是"已删除"', async () => {
    render({ ...baseRow, purchaseOrderItemId: '404' }, [], { loading: true })
    const label = stateLabels()[0]
    expect(label.textContent).toBe('—')
    const bubble = await bubbleTextOf(label)
    expect(bubble).toContain(i18n.t('common.loadingIndicatorAnnouncing'))
    expect(bubble).not.toContain(
      i18n.t('priceCompare.sheet.purchaseOrderMissingHint'),
    )
  })

  it('加载失败的气泡说明是加载失败本身', async () => {
    render({ ...baseRow, purchaseOrderItemId: '404' }, [], {
      loading: false,
      isError: true,
    })
    const bubble = await bubbleTextOf(stateLabels()[0])
    expect(bubble).toContain(
      i18n.t('priceCompare.sheet.purchaseOrderLoadFailed'),
    )
  })

  it('选项已就绪却仍找不到明细行时才显示「已删除」', () => {
    render({ ...baseRow, purchaseOrderItemId: '404' }, [], { loading: false })
    const labels = stateLabels()
    expect(labels.length).toBeGreaterThan(0)
    for (const label of labels) {
      expect(label.textContent).toBe(
        i18n.t('priceCompare.sheet.purchaseOrderMissingShort'),
      )
    }
  })

  it('未关联的行与选项是否就绪无关, 任何时候都说「未关联」', () => {
    render({ ...baseRow }, [], { loading: true })
    for (const label of stateLabels()) {
      expect(label.textContent).toBe(
        i18n.t('priceCompare.sheet.purchaseOrderNotLinkedShort'),
      )
    }
  })

  it('三态判定与缺失徽标: 选项未就绪时不追加「已删除」徽标', () => {
    expect(tonnageOptionsPhase({ loading: true })).toBe('loading')
    expect(tonnageOptionsPhase({ loading: false, isError: true })).toBe('error')
    expect(tonnageOptionsPhase({ loading: false })).toBe('ready')

    // 关联两条, 其中 404 不在选项里 ⇒ ready 时补「已删除」徽标
    const partiallyMissing: PriceRow = {
      ...baseRow,
      purchaseOrderItemId: '301',
      purchaseOrderLinks: [
        {
          purchaseOrderId: '88',
          purchaseOrderNo: 'PO-88',
          purchaseOrderItemId: '301',
          allocatedTon: 5,
        },
        {
          purchaseOrderId: '99',
          purchaseOrderNo: 'PO-99',
          purchaseOrderItemId: '404',
          allocatedTon: 0,
        },
      ],
    }
    render(partiallyMissing, [linkedRecord], { loading: false })
    expect(container.textContent, '选项已就绪时才允许提示缺了哪一条').toContain(
      i18n.t('priceCompare.sheet.purchaseOrderMissingShort'),
    )

    act(() => root.unmount())
    root = createRoot(container)
    // 同一条行在"加载中"时不得出现该徽标(此时缺的那条只是还没加载到)
    render(partiallyMissing, [linkedRecord], { loading: true })
    expect(container.textContent).not.toContain(
      i18n.t('priceCompare.sheet.purchaseOrderMissingShort'),
    )
  })

  it('欠额 = 报单吨位 − Σ分配量(不是 Σ订货量 − Σ分配量)', () => {
    expect(unallocatedTonOf(shortfallRow)).toBe(70)
    // 误用 Σ订货量 − Σ分配量 时这里会得 0(订货合计 60+70 == 分配合计 130)
    expect(
      shortfallRow.purchaseOrderLinks?.reduce(
        (sum, link) => sum + link.allocatedTon,
        0,
      ),
    ).toBe(130)
    // 历史单值行没有 links ⇒ 视为已全额分配, 缺口 0
    expect(
      unallocatedTonOf({
        ...baseRow,
        ton: 200,
        purchaseOrderItemId: '301',
      }),
    ).toBe(0)
  })

  it('多行关联欠额时 ⓘ 弹层给出「还有 X 吨未落到订单上」', async () => {
    render(shortfallRow, [linkedRecord, secondRecord], {
      loading: false,
      localTonForItem: 200,
    })
    const info = container.querySelector<HTMLElement>('.price-compare-ton-info')
    expect(info).not.toBeNull()
    await act(async () => {
      info?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const popover = document.querySelector<HTMLElement>(
      `.ant-popover.${TON_BUBBLE_CLASS}`,
    )
    expect(popover).not.toBeNull()
    expect(popover?.textContent).toContain(
      i18n.t('priceCompare.sheet.purchaseOrderUnallocatedTon', { ton: '70' }),
    )
  })

  it('分配量吃满报单吨位(或历史单值行)时没有欠额提示', async () => {
    render(
      {
        ...shortfallRow,
        ton: 130,
      },
      [linkedRecord, secondRecord],
      { loading: false, localTonForItem: 130 },
    )
    const info = container.querySelector<HTMLElement>('.price-compare-ton-info')
    await act(async () => {
      info?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(
      document.querySelector<HTMLElement>(`.ant-popover.${TON_BUBBLE_CLASS}`)
        ?.textContent,
    ).not.toContain(
      i18n.t('priceCompare.sheet.purchaseOrderUnallocatedTon', { ton: '70' }),
    )
  })

  /**
   * 「剩余未开吨位」列的渲染口径(回归: 多行关联时只算第一条, 与同格弹层的合计值打架)。
   *
   * <p>实测: ton=20 + 两张订货各 7.996 ⇒ 单条口径 −12.004(7.996 − 20), 合计口径
   * −4.008(15.992 − 20), 同一格两个数字。列上必须给合计值, 且与标红判定、ⓘ 弹层一致。</p>
   */
  it('多行关联时「剩余未开吨位」列按关联行合计渲染(不是只算第一条)', () => {
    const recordA: PurchaseOrderTonnageRecord = {
      ...linkedRecord,
      orderedWeight: 7.996,
      issuedWeight: 0,
    }
    const recordB: PurchaseOrderTonnageRecord = {
      ...secondRecord,
      orderedWeight: 7.996,
      issuedWeight: 0,
    }
    render(
      {
        ...baseRow,
        ton: 20,
        purchaseOrderItemId: '301',
        purchaseOrderNo: 'PO-88',
        purchaseOrderLinks: [
          {
            purchaseOrderId: '88',
            purchaseOrderNo: 'PO-88',
            purchaseOrderItemId: '301',
            allocatedTon: 7.996,
          },
          {
            purchaseOrderId: '99',
            purchaseOrderNo: 'PO-99',
            purchaseOrderItemId: '302',
            // 第二条只分配一部分: 这样"合计口径"与"只算第一条"必然给出不同的数
            allocatedTon: 3,
          },
        ],
      },
      [recordA, recordB],
      { loading: false, localTonForItem: 20 },
    )
    const cell = container.querySelector<HTMLElement>(
      '.price-compare-ton-remaining',
    )
    /*
     * 方案 A 合计口径: 额度 7.996 + 7.996 = 15.992, 已占用 = 本单分配(7.996 + 3) + 其他 0
     * = 10.996 ⇒ 剩余 4.996。只算第一条会得到 7.996 − 7.996 = 0 —— 两者必须可区分。
     */
    expect(cell?.textContent).toBe('4.996')
    expect(cell?.textContent).not.toBe('0')
    // 未超占用: 不标红、无超开徽标
    expect(container.querySelector('.price-compare-ton-over-flag')).toBeNull()
    expect(
      container.querySelector('.price-compare-ton-figure')?.className,
    ).not.toContain('price-compare-ton-hint--over')
  })

  it('单条关联的「剩余未开吨位」逐字不变(合计 = 该条)', () => {
    render(
      {
        ...baseRow,
        ton: 40,
        purchaseOrderItemId: '301',
        purchaseOrderNo: 'PO-88',
      },
      [{ ...linkedRecord, orderedWeight: 40, issuedWeight: 30 }],
      { loading: false, localTonForItem: 40 },
    )
    // 超开: 列上 0 + 超开 30, 不再显示 −30
    expect(
      container.querySelector<HTMLElement>('.price-compare-ton-remaining')
        ?.textContent,
    ).toBe('0超开 30 吨')
  })
})
