// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, Fragment } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import type { TonOrderCellProps } from './TonCell'
import {
  IssuedTonCell,
  TON_BUBBLE_CLASS,
  TonCell,
  TonUnopenedCell,
} from './TonCell'
import type { PriceRow } from './types'

/**
 * 采购订单明细行夹具(方案 B 口径)。
 *
 * <p>`issuedWeight`(别家报价单的报单占用, 选单额度口径)与 `actualWeightTon`(真实已开货,
 * 入库审核回写)在这里**刻意取不同值**(30 vs 12): 三个吨位列只认后者。谁把已开货接回
 * `issuedWeight`, 断言里的 `12` / `28` 就必然变成 `30` / `70` 之类的旧值而变红; 谁把剩余
 * 夹到 0, 负值用例里的 `-15.768` 就会变成 `0`。这两个字段取值不同是本文件区分新旧口径的关键。</p>
 */
const poRecord: PurchaseOrderTonnageRecord = {
  purchaseOrderId: '88',
  purchaseOrderItemId: '301',
  orderNo: 'PO-88',
  supplierName: '沙钢',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: '12',
  length: '9米',
  brand: '中天',
  orderedWeight: 40,
  issuedWeight: 30,
  remainingWeight: 10,
  actualWeightTon: 12,
  issuedDone: false,
  status: '正常',
}

/**
 * 造一条真实已开货为 `ton` 的明细行。
 *
 * <p>只需要在用例里突出"已开货是多少"时用它, 其余字段(含 `issuedWeight: 30`)保持夹具默认值,
 * 免得每个用例重复一遍 40/30/10 这套数字。</p>
 */
function lineWithShipped(
  actualWeightTon: number | null,
  overrides: Partial<PurchaseOrderTonnageRecord> = {},
): PurchaseOrderTonnageRecord {
  return { ...poRecord, actualWeightTon, ...overrides }
}

/** 第二条关联明细行: 订货 70 / 别家占用 20 / 真实已开货 5.5(与首条的 40/30/12 都可区分)。 */
const secondRecord: PurchaseOrderTonnageRecord = {
  ...poRecord,
  purchaseOrderId: '99',
  purchaseOrderItemId: '302',
  orderNo: 'PO-99',
  spec: '14',
  brand: '永钢',
  orderedWeight: 70,
  issuedWeight: 20,
  remainingWeight: 50,
  actualWeightTon: 5.5,
}

const baseRow: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 5,
}

/**
 * 一行关联两条明细行(301 + 302)的行: 所有按关联行合计的口径(剩余未开、ⓘ 弹层合计)
 * 都必须把两条一起算, 只算第一条会让列上与弹层出现两个数(实测踩过)。</p>
 */
const twoLineRow: PriceRow = {
  ...baseRow,
  purchaseOrderItemId: '301',
  purchaseOrderNo: 'PO-88',
  purchaseOrderLinks: [
    {
      purchaseOrderId: '88',
      purchaseOrderNo: 'PO-88',
      purchaseOrderItemId: '301',
      allocatedTon: 12,
    },
    {
      purchaseOrderId: '99',
      purchaseOrderNo: 'PO-99',
      purchaseOrderItemId: '302',
      allocatedTon: 8,
    },
  ],
}

/**
 * 元素里**可见**的数字层文本。
 *
 * <p>`textContent` 会把数字层内 `.aries-sr-only` 的完整口径串（含「本单该明细行报单 40.000」）
 * 一起算进来，用它断言时可见数字即使接错字段也照样变绿 —— 必须先把读屏层摘掉。</p>
 */
function visibleTextOf(node: Element | null): string {
  const clone = node?.cloneNode(true) as HTMLElement | undefined
  clone?.querySelector('.aries-sr-only')?.remove()
  return clone?.textContent ?? ''
}

describe('TonCell 吨位 + 采购订单关联', () => {
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
    // antd 的浮层挂在 body 上: 不清理会让下一条用例命中上一条残留的气泡文案
    document.querySelectorAll('.ant-tooltip, .ant-popover').forEach((node) => {
      node.remove()
    })
    vi.clearAllMocks()
  })

  /**
   * 吨位三列作为一个整体渲染(表格里它们就是相邻三列): 「报单吨位」输入 +
   * 「剩余未开」(IssuedTonCell, 列宽/位置在前) + 「已开货」(TonUnopenedCell, 含品牌与明细入口),
   * 便于按列断言。
   *
   * <p>口径(方案 B): 「已开货」= 关联明细行的真实已开货(`actualWeightTon`);
   * 「剩余未开」= 本单据报单吨位合计 − 已开货合计, 可为负。</p>
   */
  const render = (
    overrides: Partial<Parameters<typeof TonCell>[0]> &
      Partial<TonOrderCellProps> = {},
  ) => {
    const merged = {
      row: baseRow,
      rowId: 'r1',
      options: [poRecord] as PurchaseOrderTonnageRecord[],
      linked: undefined as PurchaseOrderTonnageRecord | undefined,
      localTonForItem: 40,
      disabled: false,
      rowLockDisabled: false,
      lockReason: undefined as string | undefined,
      lockedClassName: undefined as string | undefined,
      purchaseOrderLinkAllowed: true,
      purchaseOrderLinkBlockedReason: undefined as string | undefined,
      loading: false,
      isError: undefined as boolean | undefined,
      onTonChange: vi.fn(),
      onOpenPicker: vi.fn(),
      onMoveFocus: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(
        createElement(
          Fragment,
          null,
          createElement(TonCell, {
            row: merged.row,
            rowId: merged.rowId,
            disabled: merged.disabled,
            rowLockDisabled: merged.rowLockDisabled,
            lockReason: merged.lockReason,
            lockedClassName: merged.lockedClassName,
            onTonChange: merged.onTonChange,
            onMoveFocus: merged.onMoveFocus,
          }),
          createElement(IssuedTonCell, {
            row: merged.row,
            options: merged.options,
            linked: merged.linked,
            localTonForItem: merged.localTonForItem,
            loading: merged.loading,
            isError: merged.isError,
          }),
          createElement(TonUnopenedCell, {
            row: merged.row,
            options: merged.options,
            linked: merged.linked,
            localTonForItem: merged.localTonForItem,
            loading: merged.loading,
            isError: merged.isError,
            purchaseOrderLinkAllowed: merged.purchaseOrderLinkAllowed,
            purchaseOrderLinkBlockedReason:
              merged.purchaseOrderLinkBlockedReason,
            onOpenPicker: merged.onOpenPicker,
          }),
        ),
      )
    })
    return merged
  }

  /** 三列从左到右: [0] 报单吨位输入, [1] 剩余未开, [2] 已开货(含品牌与明细入口)。 */
  const cells = () => container.querySelectorAll('.price-compare-ton-cell')
  const remainingCell = () => cells()[1]
  const issuedCell = () => cells()[2]
  /** 「剩余未开」列上可见的数值(不含「已开超 X 吨」短语)。 */
  const remainingFigure = () =>
    container.querySelector('.price-compare-ton-figure')?.textContent ?? ''
  const overFlagText = () =>
    container.querySelector('.price-compare-ton-over-flag')?.textContent ?? ''
  /** 「已开货」列的数字层可见文本(去掉读屏层, 否则读屏串会掩盖数字对不对)。 */
  const issuedVisible = () =>
    visibleTextOf(
      issuedCell()?.querySelector('.price-compare-ton-issued') ?? null,
    )

  /** 打开 ⓘ 弹层(与既有用例同一路径: hover 明细图标)。 */
  const openPopover = async () => {
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    return document.querySelector('.price-compare-ton-popover')
  }

  /** hover 某个元素, 读出它触发的气泡文案(短状态标签的 Tooltip 走这条路)。 */
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

  /** 弹层里某一行标签对应的数值(逐条明细行会重复出现同名标签, 必须按标签取值)。 */
  const popoverValuesOf = (popover: Element | null, label: string) =>
    Array.from(
      popover?.querySelectorAll('.price-compare-ton-popover-row') ?? [],
    )
      .filter((row) => row.firstElementChild?.textContent === label)
      .map((row) => row.lastElementChild?.textContent ?? '')

  it('渲染吨位输入与明细图标', () => {
    render()
    expect(container.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(container.querySelector('.price-compare-ton-info')).toBeTruthy()
  })

  it('未关联时两列给出"未关联"短状态, 不显示 0 误导', () => {
    render()
    expect(container.textContent).not.toContain('已开')
    // 已开货/剩余未开两列都说清原因(而不是 0.000 或莫名其妙的「—」)
    const states = container.querySelectorAll('.price-compare-ton-state')
    expect(states).toHaveLength(2)
    for (const state of states) expect(state.textContent).toBe('未关联')
    // 悬浮提示说明怎么才有的数(antd Tooltip 走浮层, 断言文案键本身)
    expect(i18n.t('priceCompare.sheet.purchaseOrderNotLinkedHint')).toContain(
      '未关联采购订单',
    )
    expect(container.querySelector('.price-compare-ton-issued')).toBeNull()
    expect(container.querySelector('.price-compare-ton-figure')).toBeNull()
    expect(container.querySelector('input[data-ton="r1"]')).toBeTruthy()
    // 剩余未开列的短状态仍落在进度层内(与有值时的左起点一致, 竖列不跳)
    expect(
      container
        .querySelector('.price-compare-ton-progress')
        ?.querySelector('.price-compare-ton-state'),
    ).toBeTruthy()
  })

  it('已开货 = 关联明细行的真实已开货(actualWeightTon), 不取别家报单占用(issuedWeight)', () => {
    // 已开货 12 / 报单 40 ⇒ 剩余 28。旧口径(本单报单 + 别家占用 = 70, 或订货 − 已开 = 0)
    // 在这里必然给出别的数字, 因此这条用例专门钉住"数据源只能是 actualWeightTon"。
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    expect(issuedVisible()).toBe('12')
    // 别家占用 30 绝不能出现在已开货列(接回 issuedWeight 时这里会是 30)
    expect(issuedVisible()).not.toBe('30')
    expect(issuedVisible()).not.toBe('70')
    // 剩余未开 = 报单 40 − 已开货 12 = 28(夹到 0 的实现会给出 0)
    expect(remainingFigure()).toBe('28')
    expect(remainingFigure()).not.toBe('0')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('读屏整句与弹层同源: 报单 / 已开货 / 剩余未开 / 订货(参考) 四个数一次说清', () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const ariaText =
      issuedCell()?.querySelector('.aries-sr-only')?.textContent ?? ''
    expect(ariaText).toContain('本单该明细行报单 40.000')
    expect(ariaText).toContain('已开货 12.000')
    expect(ariaText).toContain('剩余未开 28.000')
    expect(ariaText).toContain('订货吨位 40.000')
    expect(ariaText).toContain('品牌 中天')
    // 旧口径的字段名不得再出现在读屏文案里(它是"别家报单占用", 不是已开货)
    expect(ariaText).not.toContain('其他单据占用')
  })

  it('已开货为 null 时按 0(不回退到订货量或别家报单占用)', () => {
    // null = 还没有任何到货记录, 展示上就是"已开 0 吨"; 不得回退到 issuedWeight(30)
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(null)],
    })
    expect(issuedVisible()).toBe('0')
    const ariaText =
      issuedCell()?.querySelector('.aries-sr-only')?.textContent ?? ''
    expect(ariaText).toContain('已开货 0.000')
    // 剩余未开 = 报单 40 − 0 = 40(拿 issuedWeight 当已开货会得到 10)
    expect(remainingFigure()).toBe('40')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('多行关联时剩余未开按关联行合计(不是只算第一条, 也不是别家占用合计)', () => {
    /*
     * 报单合计 20; 关联两条的真实已开货 12 + 5.5 = 17.5 ⇒ 剩余 2.5。
     * 只算第一条会得到 8(20 − 12); 误用 issuedWeight 合计(50)会得到 −30 并被夹成 0。
     */
    render({
      row: twoLineRow,
      options: [poRecord, secondRecord],
      localTonForItem: 20,
    })
    expect(remainingFigure()).toBe('2.5')
    expect(remainingFigure()).not.toBe('8')
    expect(remainingFigure()).not.toBe('0')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('一单货覆盖两个批次时, 已开货按本单分摊量封顶, 剩余不再为负', () => {
    /*
     * 真实业务: 采购订单明细行 30 吨的货, 覆盖两个批次的报价单 ——
     * 批次 A 报 14 吨、批次 B 报 16 吨, 该订单行实收 27.972 吨。
     * 修复前两张单都拿整行 27.972 去减, 剩余分别变成 −13.972 / −11.972(误报"已开超");
     * 修复后按各自分摊量封顶: min(27.972, 14)=14、min(27.972, 16)=16, 两张单剩余都为 0。
     */
    const sharedLine = lineWithShipped(27.972, {
      purchaseOrderItemId: '301',
      orderedWeight: 30,
    })
    const batchA: PriceRow = {
      ...baseRow,
      purchaseOrderItemId: '301',
      purchaseOrderLinks: [
        {
          purchaseOrderId: '88',
          purchaseOrderItemId: '301',
          allocatedTon: 14,
        },
      ],
    }
    render({ row: batchA, options: [sharedLine], localTonForItem: 14 })
    // 本单已开货按分摊量封顶 = 14, 剩余 = 14 − 14 = 0
    expect(remainingFigure()).toBe('0')
    expect(overFlagText()).toBe('')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('订单行整行实收高于本单分摊时, ⓘ 弹层说明差额属于其它单据', async () => {
    const sharedLine = lineWithShipped(27.972, {
      purchaseOrderItemId: '301',
      orderedWeight: 30,
    })
    render({
      row: {
        ...baseRow,
        purchaseOrderItemId: '301',
        purchaseOrderLinks: [
          {
            purchaseOrderId: '88',
            purchaseOrderItemId: '301',
            allocatedTon: 14,
          },
        ],
      },
      options: [sharedLine],
      localTonForItem: 14,
    })
    const popover = await openPopover()
    // 已开货走封顶口径
    expect(popoverValuesOf(popover, '已开货')).toEqual(['14.000'])
    // 整行实收另给一行, 说明差额去了同一订单行上的其它单据
    expect(
      popoverValuesOf(popover, '订单行整行实收（含其它单据分摊）'),
    ).toEqual(['27.972'])
  })

  it('剩余为负时原样显示负值并标红(不夹到 0)', () => {
    // 真实形态: 订单行已开货 32.768, 本单只报了 17 ⇒ 剩余 −15.768。已开货是订单行级事实、
    // 报单是单据级需求, 订单行被多张单据共享时必然出现, 业务要求原样显示并标红。
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(32.768, { issuedWeight: 5 })],
      localTonForItem: 17,
    })
    expect(remainingFigure()).toBe('-15.768')
    // 反例钉: 夹到 0 的实现会得到 '0'
    expect(remainingFigure()).not.toBe('0')
    expect(overFlagText()).toBe('已开超 15.768 吨')
    expect(
      container.querySelector(
        '.price-compare-ton-figure.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
    // 已开货列(32.768 > 报单 17)同样标红
    expect(issuedVisible()).toBe('32.768')
    expect(
      container.querySelector(
        '.price-compare-ton-issued.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
  })

  it('恰好开完(剩余 0)时不标红', () => {
    // 已开货 12 == 报单 12 ⇒ 剩余 0。别家占用 30 不影响判定(用错了就会标红)
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: 12 },
      options: [lineWithShipped(12)],
      localTonForItem: 12,
    })
    expect(remainingFigure()).toBe('0')
    expect(overFlagText()).toBe('')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
    expect(issuedVisible()).toBe('12')
  })

  it('已开货超过本单报单吨位时只用文字表达, 不补图标', () => {
    // 已开货 40 / 报单 10 ⇒ 剩余 −30; 差额由「已开超 30 吨」短语说明
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(40, { orderedWeight: 12 })],
      localTonForItem: 10,
    })
    expect(container.querySelector('.price-compare-ton-over-icon')).toBeNull()
    expect(remainingFigure()).toBe('-30')
    expect(overFlagText()).toBe('已开超 30 吨')
  })

  it('已开超时「已开货」数字与品牌层一起转警告色', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(40, { orderedWeight: 12 })],
      localTonForItem: 10,
    })
    expect(
      container.querySelector(
        '.price-compare-ton-issued.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
    // 标红要覆盖整段数字: 品牌层独立成层后也要一起转警告色
    expect(
      container.querySelector(
        '.price-compare-ton-brand-group.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
  })

  it('报单吨位变化只改剩余未开, 不改已开货(已开货是订单行级事实)', () => {
    // 旧口径里已开货 = 本单报单 + 别家占用, 会随报单量一起变(70 → 130);
    // 新口径已开货只取决于 actualWeightTon, 报单量变了它必须纹丝不动。
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 40,
    })
    expect(issuedVisible()).toBe('12')
    expect(remainingFigure()).toBe('28')

    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 100,
    })
    expect(issuedVisible()).toBe('12')
    expect(remainingFigure()).toBe('88')
  })

  it('数字层与品牌层分开: 品牌层先让位, 数字不被品牌挤出省略号', () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const value = issuedCell()?.querySelector('.price-compare-ton-issued')
    const brandGroup = container.querySelector('.price-compare-ton-brand-group')
    // 数字层只承载数字: 品牌与它同层时省略号会先吃掉数字(11/12px 档线上实测)
    expect(visibleTextOf(value ?? null)).toBe('12')
    // 读屏用的完整口径仍在数字层里(品牌不会被拆掉而读不到)
    expect(value?.querySelector('.aries-sr-only')?.textContent).toContain(
      '中天',
    )
    // 品牌(含分隔符)整层搬到数字层之外, 且是数字层的兄弟节点
    expect(brandGroup?.textContent).toBe('·中天')
    expect(brandGroup?.previousElementSibling).toBe(value)
    expect(value?.contains(brandGroup ?? null)).toBe(false)
    expect(brandGroup?.classList.contains('price-compare-ton-hint--over')).toBe(
      false,
    )
    expect(brandGroup?.querySelector('.price-compare-ton-brand')).not.toBeNull()
  })

  it('品牌缺失时数字后面不出现多余分隔符', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(12, { brand: '' })],
    })
    expect(issuedVisible()).toBe('12')
    expect(container.querySelector('.price-compare-ton-brand')).toBeNull()
    expect(container.querySelector('.price-compare-ton-brand-group')).toBeNull()
    expect(
      container.querySelector('.price-compare-ton-progress')?.textContent,
    ).not.toContain('·')
  })

  it('三列各司其职: 报单格只有输入框, 数字与明细入口在相邻格', () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const inputCell = cells()[0]
    expect(inputCell).not.toBeNull()
    // 报单吨位格只剩输入框: 不再被"已开/未开"小字与明细图标挤占宽度
    expect(inputCell?.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(inputCell?.querySelector('.price-compare-ton-issued')).toBeNull()
    expect(inputCell?.querySelector('.price-compare-ton-info')).toBeNull()
    // 剩余未开列只有数字; 已开货列承载数字、品牌与明细入口
    expect(cells()).toHaveLength(3)
    expect(
      remainingCell()?.querySelector('.price-compare-ton-figure'),
    ).toBeTruthy()
    expect(
      issuedCell()?.querySelector('.price-compare-ton-issued'),
    ).toBeTruthy()
    expect(issuedCell()?.querySelector('.price-compare-ton-info')).toBeTruthy()
  })

  it('未填报单吨位时「已开货」列给「未填吨位」短状态, 不显示 0 误导', () => {
    // 已关联明细行但报单吨位还没填(0): 没有可对照的需求, 这一列给短状态而不是数字
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: undefined },
      options: [lineWithShipped(null)],
      localTonForItem: 0,
    })
    const state = issuedCell()?.querySelector('.price-compare-ton-state')
    expect(state?.textContent).toBe('未填吨位')
    expect(issuedCell()?.querySelector('.price-compare-ton-issued')).toBeNull()
    // 报单 0 / 已开货 0 ⇒ 剩余 0, 不该出现负值或标红
    expect(remainingFigure()).toBe('0')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('关联明细行不在选项里时回退到已保存记录, 已开货仍取它的 actualWeightTon', () => {
    // 订单行已从选项列表消失(仍在快照里): 口径不能因此变成 0 或退回 issuedWeight(30)
    const stale: PurchaseOrderTonnageRecord = {
      ...poRecord,
      purchaseOrderItemId: '999',
      orderNo: 'PO-999',
      actualWeightTon: 7,
    }
    render({
      row: {
        ...baseRow,
        purchaseOrderItemId: '999',
        purchaseOrderNo: 'PO-999',
      },
      options: [],
      linked: stale,
      localTonForItem: 10,
    })
    expect(issuedVisible()).toBe('7')
    expect(remainingFigure()).toBe('3')
  })

  it('悬浮明细给出报单 / 已开货 / 剩余未开 / 订货(参考) / 品牌完整口径', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(32.768, { issuedWeight: 5 })],
      localTonForItem: 17,
    })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''
    expect(text).toContain('本单该明细行报单')
    expect(text).toContain('17.000')
    // 已开货 = 该明细行真实入库 32.768(别家占用 5 不得出现)
    expect(text).toContain('已开货')
    expect(text).toContain('32.768')
    // 已开超: 剩余原样显示负值, 不再夹到 0
    expect(text).toContain('剩余未开')
    expect(text).toContain('-15.768')
    // 订货吨位只作参考值列出
    expect(text).toContain('订货吨位')
    expect(text).toContain('40.000')
    expect(text).toContain('品牌')
    expect(text).toContain('中天')
  })

  it('悬浮明细不再出现旧口径字段(其他单据占用 / 本单分配 / 剩余可开)', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''
    // 旧口径把"别家报价单的报单占用"当成已开货, 这些字段名与算式已整体删除
    for (const stale of [
      '其他单据占用',
      '本单分配（本次开出）',
      '已占用（含本单分配）',
      '剩余可开',
      '已超过订货吨位',
    ]) {
      expect(text).not.toContain(stale)
    }
  })

  it('悬浮明细字段顺序固定: 本单报单 → 已开货 → 剩余未开 → 订货吨位(参考) → 品牌', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const popover = await openPopover()
    const labels = [
      ...(popover?.querySelectorAll('.price-compare-ton-popover-row') ?? []),
    ].map((row) => (row.firstElementChild?.textContent ?? '').trim())
    expect(labels).toEqual([
      '关联采购订单',
      '供应商',
      '材质 / 规格 / 长度',
      '品牌',
      '状态',
      '本单该明细行报单',
      '已开货',
      '剩余未开',
      '订货吨位',
    ])
  })

  it('已开超时悬浮说明把三个数说明白: 已开货 / 本单报单 / 差额', async () => {
    // 订货额度 20(参考) / 报单 17 / 已开货 32.768 ⇒ 已开超 15.768。
    // 若剩余改回"订货 − 已开货"会得到 −12.768, 下面的 not 断言就是"改回去必须变红"。
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(32.768, { orderedWeight: 20 })],
      localTonForItem: 17,
    })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''
    expect(text).toContain(
      '已开货 32.768 吨 > 本单报单吨位 17.000 吨 ⇒ 超出 15.768 吨',
    )
    expect(text).toContain('剩余未开')
    expect(text).toContain('-15.768')
    expect(text).toContain('订货吨位')
    expect(text).toContain('20.000')
    // 差额只由"已开货 − 本单报单"算出, 订货额度不参与减法
    expect(text).not.toContain('12.768')
  })

  it('已开货未超过本单报单吨位时不给已开超说明', async () => {
    // 订货额度 100 / 报单 45 / 已开货 42 ⇒ 剩余 3, 不判已开超
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [lineWithShipped(42, { orderedWeight: 100 })],
      localTonForItem: 45,
    })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''
    expect(text).toContain('剩余未开')
    expect(text).toContain('3.000')
    expect(text).not.toContain('超出')
    expect(popover?.querySelector('.price-compare-ton-hint--over')).toBeNull()
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('弹层与相邻列同口径: 两边都取 actualWeightTon, 且写明口径来源', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''
    // 弹层的"已开货"合计行与列上数字必须一致(实测踩过"列上 20、弹层 18")
    expect(popoverValuesOf(popover, '已开货')).toEqual(['12.000'])
    expect(issuedVisible()).toBe('12')
    // 别家报单占用 30 不得出现在弹层任何位置
    expect(text).not.toContain('30.000')
    expect(text).toContain(
      '已开货 = 关联明细行的真实入库合计（入库审核回写）；剩余未开 = 报单吨位 − 已开货；订货吨位仅作参考',
    )
  })

  it('悬浮明细与 ⓘ 弹层都带不透明气泡类名(antd 默认 85% 透明会与页面文字叠成重影)', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const meta = container.querySelector(
      '.price-compare-ton-meta',
    ) as HTMLElement
    await act(async () => {
      meta.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    // 类名落在 antd 弹层的根节点上: price-compare.css 用它命中 -container / -arrow
    expect(
      document.querySelector(`.ant-tooltip.${TON_BUBBLE_CLASS}`),
    ).not.toBeNull()

    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    expect(
      document.querySelector(`.ant-popover.${TON_BUBBLE_CLASS}`),
    ).not.toBeNull()
  })

  it('锁定原因气泡(禁用吨位输入的 Tooltip)同样带不透明气泡类名', async () => {
    render({
      disabled: true,
      lockReason: '单据已锁定「规格和数量」',
      purchaseOrderLinkAllowed: false,
    })
    const wrap = container.querySelector(
      '.price-compare-ton-lock-reason',
    ) as HTMLElement
    expect(wrap).not.toBeNull()
    await act(async () => {
      wrap.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    expect(
      document.querySelector(`.ant-tooltip.${TON_BUBBLE_CLASS}`),
    ).not.toBeNull()
  })

  it('hover 明细图标显示订单明细 popover', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''
    expect(text).toContain('PO-88')
    expect(text).toContain('沙钢')
    expect(text).toContain('订货吨位')
    expect(text).toContain('40.000')
    expect(text).toContain('已开货')
    expect(text).toContain('12.000')
    expect(text).toContain('剩余未开')
    expect(text).toContain('28.000')
    expect(text).toContain('品牌')
    expect(text).toContain('中天')
    // 旧口径的"其他单据占用 30"不得借尸还魂
    expect(text).not.toContain('其他单据占用')
  })

  it('popover 内按钮触发 onOpenPicker', async () => {
    const props = render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
    })
    const popover = await openPopover()
    const button = popover?.querySelector('button') as HTMLButtonElement
    act(() => {
      button?.click()
    })
    expect(props.onOpenPicker).toHaveBeenCalledTimes(1)
  })

  it('订单已删除时 popover 提示重新选择', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '401', purchaseOrderNo: 'PO-99' },
      options: [],
      linked: undefined,
    })
    const popover = await openPopover()
    expect(popover?.textContent).toContain('PO-99')
    expect(popover?.textContent).toContain('关联订单已删除，请重新选择')
  })

  it('未定稿行禁用关联按钮并提示先锁定', async () => {
    render({ purchaseOrderLinkAllowed: false })
    const popover = await openPopover()
    const button = popover?.querySelector('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(popover?.textContent).toContain('请先锁定')
  })

  it('已定稿(行级锁或单据级「锁定规格和数量」)时, 未关联行可直接打开选择弹窗', async () => {
    // 工具栏「锁定规格和数量」冻结整单规格与吨位, 关联入口必须一并放行,
    // 否则用户会看到"请先锁定该行"而全局锁下「锁定该行」又是禁用的死路。
    const props = render()
    const popover = await openPopover()
    expect(popover?.textContent).toContain('未关联采购订单')
    expect(popover?.textContent).not.toContain('请先锁定')
    const button = popover?.querySelector('button') as HTMLButtonElement
    expect(button.disabled).toBe(false)
    act(() => {
      button.click()
    })
    expect(props.onOpenPicker).toHaveBeenCalledTimes(1)
  })

  it('只读(他人签出)时关联入口禁用, 原因是只读而不是"请先锁定"', async () => {
    render({
      purchaseOrderLinkAllowed: false,
      purchaseOrderLinkBlockedReason:
        '该批次正被他人编辑，当前为只读；解除编辑锁后可修改',
    })
    const popover = await openPopover()
    const button = popover?.querySelector('button') as HTMLButtonElement
    expect(button.disabled).toBe(true)
    // 只读时写回会被丢弃, 若仍显示"请先锁定该行"会把用户引向做不到的动作
    expect(popover?.textContent).toContain('正被他人编辑')
    expect(popover?.textContent).not.toContain('请先锁定')
  })

  it('列尾按 Tab 不吞键: 放行默认行为, 由浏览器把焦点移出本格', () => {
    const props = render({ onMoveFocus: vi.fn(() => false) })
    const input = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      input?.dispatchEvent(event)
    })
    expect(props.onMoveFocus).toHaveBeenCalledWith(1)
    // 关键: 没有 preventDefault, 否则单行单据时焦点会被永久锁死在吨位格
    expect(event.defaultPrevented).toBe(false)
  })

  it('列内可移动时拦截默认 Tab, 交给 moveFocus 处理', () => {
    const props = render({ onMoveFocus: vi.fn(() => true) })
    const input = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      input?.dispatchEvent(event)
    })
    expect(props.onMoveFocus).toHaveBeenCalledWith(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('Shift+Tab 反向移动, 边界同样放行', () => {
    const props = render({ onMoveFocus: vi.fn(() => false) })
    const input = container.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    const event = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    })
    act(() => {
      input?.dispatchEvent(event)
    })
    expect(props.onMoveFocus).toHaveBeenCalledWith(-1)
    expect(event.defaultPrevented).toBe(false)
  })

  it('明细触发器是键盘可聚焦的原生按钮, 点击即可打开弹层', async () => {
    render()
    const trigger = container.querySelector<HTMLButtonElement>(
      '.price-compare-ton-info',
    )
    expect(trigger).not.toBeNull()
    // 原本是不可聚焦的 span[role=img] + hover-only: 键盘打不开,
    // 而它是"关联采购订单"的唯一入口
    expect(trigger?.tagName).toBe('BUTTON')
    expect(trigger?.getAttribute('aria-label')).toBe('采购订单明细')

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    expect(document.querySelector('.price-compare-ton-popover')).not.toBeNull()
  })

  it('多行关联时 ⓘ 弹层逐条列出订单号/规格/订货量/真实已开货, 并给出关联合计', async () => {
    render({
      row: twoLineRow,
      options: [poRecord, secondRecord],
      linked: poRecord,
      localTonForItem: 20,
    })
    const popover = await openPopover()
    const text = popover?.textContent ?? ''

    // 头部不再只报第一条: 两条明细行逐条给出
    expect(text).toContain('关联明细行（2 条）')
    expect(popoverValuesOf(popover, '关联采购订单')).toEqual(['PO-88', 'PO-99'])
    expect(popoverValuesOf(popover, '材质 / 规格 / 长度')).toEqual([
      '螺纹钢 HRB400E 12 9米',
      '螺纹钢 HRB400E 14 9米',
    ])
    /*
     * 逐条明细行给出各自订货量与**本单该行已开货**(按本单分摊量封顶后的 actualWeightTon),
     * 其后是 Σ 口径的关联合计: 订货 40 + 70 = 110; 已开货 12 + 5.5 = 17.5; 剩余 = 报单 20 − 17.5 = 2.5。
     * 逐条值必须与合计同源, 否则弹层里逐条相加对不上合计(实测踩过)。
     * 该行没有 purchaseOrderLinks, 因此封顶回退到整行实收(历史单值关联行的兼容路径)。
     */
    expect(popoverValuesOf(popover, '订货吨位')).toEqual([
      '40.000',
      '70.000',
      '110.000',
    ])
    expect(popoverValuesOf(popover, '本单该行已开货（按分摊封顶）')).toEqual([
      '12.000',
      '5.500',
    ])
    expect(popoverValuesOf(popover, '已开货')).toEqual(['17.500'])
    expect(popoverValuesOf(popover, '剩余未开')).toEqual(['2.500'])
    expect(text).toContain('关联合计')
    // 旧口径的"本次开出 / 其他单据占用"已整体删除
    expect(text).not.toContain('本次开出')
    expect(text).not.toContain('其他单据占用')
    // 别家占用合计 50 绝不能冒充已开货
    expect(popoverValuesOf(popover, '已开货')).not.toEqual(['50.000'])
    // 列上与弹层同源: 剩余未开按关联行合计算
    expect(remainingFigure()).toBe('2.5')
  })

  it('选项未就绪(加载中/加载失败)时只说"还不知道", 不误报「已删除」', async () => {
    // 行已关联 301, 但选项还没加载到: 此时 missingItemIds 会把关联行全算成缺失,
    // 不能据此断言"订单已删除"(那只是还没加载到)。
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [],
      loading: true,
    })
    let states = container.querySelectorAll('.price-compare-ton-state')
    expect(states).toHaveLength(2)
    for (const state of states) expect(state.textContent).toBe('—')
    expect(container.textContent).not.toContain('已删除')
    expect(await bubbleTextOf(states[0] as HTMLElement)).toContain(
      i18n.t('common.loadingIndicatorAnnouncing'),
    )

    // 查询失败同样只能说"未知", 且说明是加载失败本身
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [],
      loading: false,
      isError: true,
    })
    states = container.querySelectorAll('.price-compare-ton-state')
    for (const state of states) expect(state.textContent).toBe('—')
    expect(container.textContent).not.toContain('已删除')
    expect(await bubbleTextOf(states[0] as HTMLElement)).toContain(
      i18n.t('priceCompare.sheet.purchaseOrderLoadFailed'),
    )
  })

  it('选项已就绪仍找不到明细行时才说「已删除」, 且合计不静默少算', () => {
    // 关联 301 + 302, 302 已不在选项里: 只算得到 301 的真实已开货 8,
    // 少算了哪一条必须当场说出来, 不能静默显示一个少算的合计。
    render({
      row: twoLineRow,
      options: [lineWithShipped(8)],
      localTonForItem: 100,
    })
    expect(remainingFigure()).toBe('92')
    // 旧的"本单报单 + 别家占用"口径在这里会得到 130, 必须不是它
    expect(remainingFigure()).not.toBe('130')
    expect(
      issuedCell()?.querySelector('.price-compare-ton-state')?.textContent,
    ).toBe('已删除')
  })
})
