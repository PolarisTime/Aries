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
  status: '正常',
}

const baseRow: PriceRow = {
  id: 'r1',
  category: '螺纹钢',
  material: 'HRB400E',
  spec: 12,
  length: '9米',
  ton: 5,
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
    vi.clearAllMocks()
  })

  /**
   * 吨位三列作为一个整体渲染(表格里它们就是相邻三列): 「报单吨位」输入 +
   * 「已开吨位」+「未开吨位」(含品牌与明细入口), 便于按列断言。
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
          }),
          createElement(TonUnopenedCell, {
            row: merged.row,
            options: merged.options,
            linked: merged.linked,
            localTonForItem: merged.localTonForItem,
            loading: merged.loading,
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

  it('渲染吨位输入与明细图标', () => {
    render()
    expect(container.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(container.querySelector('.price-compare-ton-info')).toBeTruthy()
  })

  it('未关联时两列给出"未关联"短状态, 不显示 0 误导', () => {
    render()
    expect(container.textContent).not.toContain('已开')
    // 已开/未开两列都说清原因(而不是 0.000 或莫名其妙的「—」)
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
    // 未开吨位列的短状态仍落在进度层内(与有值时的左起点一致, 竖列不跳)
    expect(
      container
        .querySelector('.price-compare-ton-progress')
        ?.querySelector('.price-compare-ton-state'),
    ).toBeTruthy()
  })

  it('已开吨位 = 本单报单 + 其他报单, 剩余未开 = 订货 − 已开', () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    // 该明细行报单 40 / 其他报单已开 30 ⇒ 已开合计 70; 订货 40 ⇒ 剩余 −30(超开)
    const issued = container.querySelector('.price-compare-ton-issued')
    expect(issued?.textContent).toContain('70')
    // 相邻格给出剩余未开吨位(订货 40 − 已开 70)
    expect(
      container.querySelector('.price-compare-ton-figure')?.textContent,
    ).toBe('-30')
    // 品牌跟在已开数字后面(独立品牌层)
    expect(
      container.querySelector('.price-compare-ton-progress')?.textContent,
    ).toContain('中天')
  })
  it('回归: 本单报 12 吨、订单只订了 10.19 吨时, 已开 12 且剩余 −1.81 标红', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: 12 },
      options: [{ ...poRecord, orderedWeight: 10.19, issuedWeight: 0 }],
      localTonForItem: 12,
    })
    // 已开合计 = 本单报单 12 + 其他 0
    expect(
      container.querySelector('.price-compare-ton-issued')?.textContent,
    ).toContain('12')
    // 剩余未开 = 订货 10.19 − 已开 12 = −1.81, 这是真正需要提示的"超开"
    expect(
      container.querySelector('.price-compare-ton-figure')?.textContent,
    ).toBe('-1.81')
    expect(
      container.querySelector(
        '.price-compare-ton-figure.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
  })
  it('数字层与品牌层分开: 品牌层先让位, 数字不被品牌挤出省略号', () => {
    // 订货给到 100, 保持"未超开"的前提(已开合计 70)
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [{ ...poRecord, orderedWeight: 100 }],
    })
    const value = container.querySelector('.price-compare-ton-issued')
    const brandGroup = container.querySelector('.price-compare-ton-brand-group')
    // 数字层只承载数字: 品牌与它同层时省略号会先吃掉数字(11/12px 档线上实测)
    const visibleOf = (node: Element | null) => {
      const clone = node?.cloneNode(true) as HTMLElement | undefined
      clone?.querySelector('.aries-sr-only')?.remove()
      return clone?.textContent ?? ''
    }
    expect(visibleOf(value)).toBe('70')
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
      options: [{ ...poRecord, brand: '' }],
    })
    expect(
      container.querySelector('.price-compare-ton-issued')?.textContent,
    ).toContain('70')
    expect(container.querySelector('.price-compare-ton-brand')).toBeNull()
    expect(container.querySelector('.price-compare-ton-brand-group')).toBeNull()
    expect(
      container.querySelector('.price-compare-ton-progress')?.textContent,
    ).not.toContain('·')
  })
  it('三列各司其职: 报单格只有输入框, 数字与明细入口在相邻格', () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const inputCell = container.querySelector('.price-compare-ton-cell')
    expect(inputCell).not.toBeNull()
    // 报单吨位格只剩输入框: 不再被"已开/未开"小字与明细图标挤占宽度
    expect(inputCell?.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(inputCell?.querySelector('.price-compare-ton-issued')).toBeNull()
    expect(inputCell?.querySelector('.price-compare-ton-info')).toBeNull()
    // 数字与明细入口在未开吨位列; 已开吨位列只有数字
    const cells = container.querySelectorAll('.price-compare-ton-cell')
    expect(cells).toHaveLength(3)
    expect(cells[1]?.querySelector('.price-compare-ton-figure')).toBeTruthy()
    expect(cells[2]?.querySelector('.price-compare-ton-issued')).toBeTruthy()
    expect(cells[2]?.querySelector('.price-compare-ton-info')).toBeTruthy()
  })
  it('已开合计超过订货量时剩余为负, 只用文字表达不补图标', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [{ ...poRecord, orderedWeight: 12, issuedWeight: 30 }],
      localTonForItem: 10,
    })
    // 已开合计 = 10 + 30 = 40; 订货 12 ⇒ 剩余 −28
    expect(container.querySelector('.price-compare-ton-over-icon')).toBeNull()
    const value = container.querySelector('.price-compare-ton-figure')
    expect(value?.textContent).toBe('-28')
    expect(value?.classList.contains('price-compare-ton-hint--over')).toBe(true)
  })
  it('超过订货量时已开吨位数字也标红', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [{ ...poRecord, orderedWeight: 12, issuedWeight: 30 }],
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
  it('已开恰好等于订货量时剩余为 0 且不标红(边界)', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [{ ...poRecord, orderedWeight: 40, issuedWeight: 30 }],
      localTonForItem: 10,
    })
    // 已开合计 = 10 + 30 = 40 = 订货量 ⇒ 剩余 0
    expect(
      container.querySelector('.price-compare-ton-figure')?.textContent,
    ).toBe('0')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })
  it('同明细行多行时悬浮明细给出本单报单合计(基数)', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 45,
    })
    const value = container.querySelector(
      '.price-compare-ton-issued',
    ) as HTMLElement
    await act(async () => {
      value.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const text =
      document.querySelector('.price-compare-ton-tooltip')?.textContent ?? ''
    expect(text).toContain('本单该明细行报单')
    expect(text).toContain('45.000')
    // 已开合计 = 本单报单合计 45 + 其他报单已开 30 = 75; 剩余未开 = 订货 40 − 75 = −35
    expect(text).toContain('已开吨位')
    expect(text).toContain('75.000')
    expect(text).toContain('剩余未开吨位')
    expect(text).toContain('-35.000')
  })
  it('悬浮明细给出订货/已开(实际)/未开/品牌完整口径', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const value = container.querySelector(
      '.price-compare-ton-issued',
    ) as HTMLElement
    await act(async () => {
      value.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const text =
      document.querySelector('.price-compare-ton-tooltip')?.textContent ?? ''
    expect(text).toContain('订货吨位')
    expect(text).toContain('40.000')
    expect(text).toContain('其他报单已开')
    expect(text).toContain('30.000')
    expect(text).toContain('已开吨位')
    expect(text).toContain('70.000')
    expect(text).toContain('剩余未开吨位')
    expect(text).toContain('-30.000')
    expect(text).toContain('品牌')
    expect(text).toContain('中天')
  })
  it('已开合计超过订货量时悬浮明细把两个数说明白', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [{ ...poRecord, orderedWeight: 20 }],
      localTonForItem: 10,
    })
    const value = container.querySelector(
      '.price-compare-ton-issued',
    ) as HTMLElement
    await act(async () => {
      value.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const text =
      document.querySelector('.price-compare-ton-tooltip')?.textContent ?? ''
    expect(text).toContain('剩余未开吨位')
    expect(text).toContain('-20.000')
    expect(text).toContain('已开吨位 40.000 吨已超过订货吨位 20.000 吨')
  })
  it('悬浮明细与 ⓘ 弹层都带不透明气泡类名(antd 默认 85% 透明会与页面文字叠成重影)', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 40,
    })
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

  it('悬浮明细字段顺序固定: 本单报单 → 其他报单已开 → 已开吨位 → 剩余未开 → 订货(参考) → 品牌', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 45,
    })
    const value = container.querySelector(
      '.price-compare-ton-issued',
    ) as HTMLElement
    await act(async () => {
      value.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const labels = [
      ...document.querySelectorAll(
        '.price-compare-ton-tooltip .price-compare-ton-popover-row',
      ),
    ].map((row) => (row.firstElementChild?.textContent ?? '').trim())
    expect(labels).toEqual([
      '本单该明细行报单',
      '其他报单已开',
      '已开吨位',
      '剩余未开吨位',
      '订货吨位',
      '品牌',
    ])
  })
  it('未填报单吨位时不显示负值, 而是给出「未填吨位」短状态', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: undefined },
      localTonForItem: 0,
    })
    const state = container.querySelector('.price-compare-ton-state')
    expect(state?.textContent).toBe('未填吨位')
    expect(container.querySelector('.price-compare-ton-issued')).toBeNull()
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
    // 剩余未开列仍然照常显示(订货 − 已开, 不依赖本单据报了多少)
    expect(
      container.querySelector('.price-compare-ton-figure')?.textContent,
    ).toBe('10')
  })
  it('已开吨位随本单据报单量变化(基数就是本单据报单合计)', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 40,
    })
    expect(
      container.querySelector('.price-compare-ton-issued')?.textContent,
    ).toContain('70')
    act(() => root.unmount())
    root = createRoot(container)
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 100,
    })
    expect(
      container.querySelector('.price-compare-ton-issued')?.textContent,
    ).toContain('130')
  })
  it('hover 明细图标显示订单明细 popover', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover?.textContent).toContain('PO-88')
    expect(popover?.textContent).toContain('沙钢')
    expect(popover?.textContent).toContain('订货吨位')
    expect(popover?.textContent).toContain('40.000')
    expect(popover?.textContent).toContain('其他报单已开')
    expect(popover?.textContent).toContain('30.000')
    expect(popover?.textContent).toContain('已开吨位')
    expect(popover?.textContent).toContain('70.000')
    expect(popover?.textContent).toContain('剩余未开吨位')
    expect(popover?.textContent).toContain('-30.000')
    expect(popover?.textContent).toContain('品牌')
    expect(popover?.textContent).toContain('中天')
  })
  it('弹层已开吨位与相邻列同口径: 本单报单 + 其他报单', async () => {
    // 订货 40 / 报单 45 / 其他报单已开 30 ⇒ 已开合计 75, 剩余未开 40 − 75 = −35
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 45,
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    const text = popover?.textContent ?? ''
    expect(text).toContain('本单该明细行报单')
    expect(text).toContain('45.000')
    expect(text).toContain('已开吨位')
    expect(text).toContain('75.000')
    expect(text).toContain('剩余未开吨位')
    expect(text).toContain('-35.000')
    // 列上的数字与弹层一致
    expect(
      container.querySelector('.price-compare-ton-issued')?.textContent,
    ).toContain('75')
    // 口径说明必须写明"已开 = 本单报单 + 其他报单"
    expect(text).toContain('本单据该明细行报单吨位 + 其他已保存报单占用')
  })
  it('已开合计未超过订货量时不判超开(订货量给足)', async () => {
    // 订货 100 / 报单 45 / 其他报单已开 42 ⇒ 已开合计 87 ≤ 100, 不应报超开
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 45,
      options: [{ ...poRecord, orderedWeight: 100, issuedWeight: 42 }],
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    const text = popover?.textContent ?? ''
    expect(text).toContain('剩余未开吨位')
    expect(text).toContain('13.000')
    expect(text).not.toContain('已超过订货吨位')
    expect(popover?.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })
  it('popover 内按钮触发 onOpenPicker', async () => {
    const props = render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const button = Array.from(
      document.querySelectorAll('.price-compare-ton-popover button'),
    )[0] as HTMLButtonElement
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
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover?.textContent).toContain('PO-99')
    expect(popover?.textContent).toContain('关联订单已删除，请重新选择')
  })
  it('未定稿行禁用关联按钮并提示先锁定', async () => {
    render({ purchaseOrderLinkAllowed: false })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const button = document.querySelector(
      '.price-compare-ton-popover button',
    ) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(
      document.querySelector('.price-compare-ton-popover')?.textContent,
    ).toContain('请先锁定')
  })

  it('已定稿(行级锁或单据级「锁定规格和数量」)时, 未关联行可直接打开选择弹窗', async () => {
    // 工具栏「锁定规格和数量」冻结整单规格与吨位, 关联入口必须一并放行,
    // 否则用户会看到"请先锁定该行"而全局锁下「锁定该行」又是禁用的死路。
    const props = render()
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
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
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
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
})
