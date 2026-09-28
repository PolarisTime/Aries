// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { TON_BUBBLE_CLASS, TonCell } from './TonCell'
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

  const render = (overrides: Partial<Parameters<typeof TonCell>[0]> = {}) => {
    const props: Parameters<typeof TonCell>[0] = {
      row: baseRow,
      rowId: 'r1',
      options: [poRecord],
      linked: undefined,
      localTonForItem: 0,
      disabled: false,
      rowLockDisabled: false,
      lockReason: undefined,
      rowLocked: true,
      loading: false,
      onTonChange: vi.fn(),
      onOpenPicker: vi.fn(),
      onMoveFocus: vi.fn(),
      ...overrides,
    }
    act(() => {
      root.render(createElement(TonCell, props))
    })
    return props
  }

  it('渲染吨位输入与明细图标', () => {
    render()
    expect(container.querySelector('input[data-ton="r1"]')).toBeTruthy()
    expect(container.querySelector('.price-compare-ton-info')).toBeTruthy()
  })

  it('未关联时不显示已开吨位数值, 但保留占位保证行高一致', () => {
    render()
    expect(container.textContent).not.toContain('已开')
    const empty = container.querySelector('.price-compare-ton-meta--empty')
    expect(empty?.textContent).toBe('—')
    // 占位与输入同行, 吨位格只有一个行容器(两行结构会把整行撑高)
    expect(empty?.parentElement).toBe(
      container.querySelector('.price-compare-ton-cell'),
    )
    expect(container.querySelector('.price-compare-ton-meta-row')).toBeNull()
  })

  it('关联后进度行显示"已开 实际/订货"并带品牌(本地未保存吨位不进数字)', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 5,
    })
    // 服务端实际已开 30, 订货 40; 本地未保存的 5 吨不得混进"已开"数字
    const meta = container.querySelector('.price-compare-ton-meta')
    expect(meta?.textContent).toContain('已开 30/40')
    expect(meta?.textContent).not.toContain('35/40')
    // 已开的品牌直接跟在进度后面
    expect(meta?.textContent).toContain('中天')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()
  })

  it('品牌缺失时进度行不出现多余分隔符', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      options: [{ ...poRecord, brand: '' }],
    })
    const meta = container.querySelector('.price-compare-ton-meta')
    expect(meta?.textContent).toContain('已开 30/40')
    expect(container.querySelector('.price-compare-ton-brand')).toBeNull()
    expect(meta?.textContent).not.toContain('·')
  })

  it('输入与次要文本同一行: 吨位列只有一个可视行容器', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 5,
    })
    const cell = container.querySelector('.price-compare-ton-cell')
    expect(cell).not.toBeNull()
    // 旧的第二行容器必须消失, 否则吨位格又比其它数据行高出约 24px
    expect(container.querySelector('.price-compare-ton-meta-row')).toBeNull()
    const input = container.querySelector('input[data-ton="r1"]')
    const issued = container.querySelector('.price-compare-ton-issued')
    const info = container.querySelector('.price-compare-ton-info')
    // 输入 / 次要文本 / 明细图标都是行容器的直接子节点(没有额外的一行)
    expect(cell?.children.length).toBe(3)
    expect(cell?.contains(input)).toBe(true)
    expect(cell?.contains(issued)).toBe(true)
    expect(cell?.contains(info)).toBe(true)
    // 同时校验它们分属同一行: 输入不落在次要文本内部, 也不再有子行包裹层
    const valueRow = container.querySelector('.price-compare-ton-value')
    expect(valueRow?.contains(input)).toBe(true)
    expect(valueRow?.contains(issued)).toBe(false)
    expect(
      container.querySelector('.price-compare-ton-progress')?.contains(issued),
    ).toBe(true)
  })

  it('超额警告图标位于可省略文本之外, 文本被截断也不会丢图标', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: 15 },
      localTonForItem: 15,
    })
    const issued = container.querySelector('.price-compare-ton-issued')
    const progress = container.querySelector('.price-compare-ton-progress')
    const icon = container.querySelector('.price-compare-ton-over-icon')
    expect(icon).not.toBeNull()
    // 图标若留在 overflow:hidden + ellipsis 的文本层里, 文本一截断图标就被裁掉
    expect(issued?.contains(icon)).toBe(false)
    expect(progress?.contains(icon)).toBe(true)
    expect(progress?.contains(issued)).toBe(true)
  })

  it('超过订货吨数时进度行标红并补警告图标', () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: 15 },
      localTonForItem: 15,
    })
    // 30 + 15 = 45 > 40
    expect(
      container.querySelector(
        '.price-compare-ton-issued.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
    expect(
      container.querySelector('.price-compare-ton-over-icon'),
    ).not.toBeNull()
  })

  it('多张采购单叠加: 进度数字保持实际已开, 超限仍按含未保存的预计值判定', () => {
    // 同一采购订单明细行在本单据内有多行时, localTonForItem 为各行报单吨位之和
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 9,
    })
    expect(container.textContent).toContain('已开 30/40')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()

    act(() => root.unmount())
    root = createRoot(container)
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 10,
    })
    // 30 + 10 = 40 恰好等于订货吨位: 不算超额(边界), 数字仍是实际已开
    expect(container.textContent).toContain('已开 30/40')
    expect(container.querySelector('.price-compare-ton-hint--over')).toBeNull()

    act(() => root.unmount())
    root = createRoot(container)
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 10.5,
    })
    // 30 + 10.5 = 40.5 > 40: 按预计值超额(数字仍是实际已开, 由图标与 Tooltip 解释)
    const issued = container.querySelector('.price-compare-ton-issued')
    expect(
      container.querySelector(
        '.price-compare-ton-issued.price-compare-ton-hint--over',
      ),
    ).toBeTruthy()
    expect(issued?.textContent).toContain('已开 30/40')
  })

  it('悬浮进度行给出报单/订货/实际已开/含未保存/剩余/品牌完整明细', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: 15 },
      localTonForItem: 15,
    })
    const meta = container.querySelector(
      '.price-compare-ton-meta',
    ) as HTMLElement
    await act(async () => {
      meta.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const tooltip = document.querySelector('.price-compare-ton-tooltip')
    expect(tooltip).not.toBeNull()
    const text = tooltip?.textContent ?? ''
    // 精确值(3 位小数)只在明细里出现, 单元格内是紧凑值
    expect(text).toContain('报单吨位')
    expect(text).toContain('15.000')
    expect(text).toContain('订货吨位')
    expect(text).toContain('40.000')
    // 已开拆两个口径: 实际(服务端)与含未保存(本地草稿)
    expect(text).toContain('已开吨位（实际）')
    expect(text).toContain('30.000')
    expect(text).toContain('含未保存报单')
    expect(text).toContain('45.000')
    expect(text).toContain('品牌')
    expect(text).toContain('中天')
    expect(text).toContain('剩余吨位（含未保存）')
    expect(text).toContain('-5.000')
    expect(text).toContain('报单吨位已超过订单剩余可开吨')
  })

  it('悬浮明细与 ⓘ 弹层都带不透明气泡类名(antd 默认 85% 透明会与页面文字叠成重影)', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 5,
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
      rowLocked: false,
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

  it('悬浮明细的字段顺序固定: 报单吨位 → 订货吨位 → 已开吨位（实际） → 品牌 → 含未保存报单 → 剩余', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301', ton: 15 },
      localTonForItem: 15,
    })
    const meta = container.querySelector(
      '.price-compare-ton-meta',
    ) as HTMLElement
    await act(async () => {
      meta.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const labels = [
      ...document.querySelectorAll(
        '.price-compare-ton-tooltip .price-compare-ton-popover-row',
      ),
    ].map((row) => (row.firstElementChild?.textContent ?? '').trim())
    expect(labels).toEqual([
      '报单吨位',
      '订货吨位',
      '已开吨位（实际）',
      '品牌',
      '含未保存报单',
      '剩余吨位（含未保存）',
    ])
  })

  it('无本地未保存吨位时明细不出现"含未保存"行, 剩余用普通口径', async () => {
    render({ row: { ...baseRow, purchaseOrderItemId: '301' } })
    const meta = container.querySelector(
      '.price-compare-ton-meta',
    ) as HTMLElement
    await act(async () => {
      meta.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 250))
    })
    const text =
      document.querySelector('.price-compare-ton-tooltip')?.textContent ?? ''
    expect(text).toContain('已开吨位（实际）')
    expect(text).not.toContain('含未保存报单')
    expect(text).toContain('剩余吨位')
    expect(text).toContain('10.000')
  })

  it('hover 明细图标显示订单明细 popover', async () => {
    render({
      row: { ...baseRow, purchaseOrderItemId: '301' },
      localTonForItem: 5,
    })
    const icon = container.querySelector(
      '.price-compare-ton-info',
    ) as HTMLElement
    await act(async () => {
      icon.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 200))
    })
    const popover = document.querySelector('.price-compare-ton-popover')
    expect(popover).toBeTruthy()
    expect(popover?.textContent).toContain('PO-88')
    expect(popover?.textContent).toContain('沙钢')
    expect(popover?.textContent).toContain('40.000')
    // 已开(实际) 30 与含未保存 35 分开呈现, 品牌一并给出
    expect(popover?.textContent).toContain('已开吨位（实际）')
    expect(popover?.textContent).toContain('30.000')
    expect(popover?.textContent).toContain('35.000')
    expect(popover?.textContent).toContain('品牌')
    expect(popover?.textContent).toContain('中天')
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
  it('未锁定行禁用关联按钮并提示先锁定', async () => {
    render({ rowLocked: false })
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
