// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement, Fragment } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PurchaseOrderTonnageRecord } from '@/api/market/quote-sheets'
import { IssuedTonCell, TON_BUBBLE_CLASS, TonUnopenedCell } from './TonCell'
import type { PriceRow } from './types'

/**
 * 吨位短状态(「未关联」/「已删除」/「未填吨位」)的**纯键盘**可达性。
 *
 * <p>这些标签是用户唯一能读到"为什么这一列没有数字"的入口: 说明写在 Tooltip 里。
 * 只做 hover 的话键盘用户永远看不到 —— 因此这里钉住两件事: 标签自身可 Tab 聚焦,
 * 且聚焦时气泡真的打开(antd Tooltip 默认 trigger 只有 hover, rc-trigger 的 hover
 * 动作不含 focus, 必须显式加上 'focus')。</p>
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
  actualWeightTon: null,
  issuedDone: false,
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

describe('吨位短状态的键盘可达性', () => {
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

  const render = (row: PriceRow, localTonForItem = 0, loading = false) => {
    act(() => {
      root.render(
        createElement(
          Fragment,
          null,
          createElement(IssuedTonCell, {
            row,
            options: [poRecord] as PurchaseOrderTonnageRecord[],
            linked: undefined,
            localTonForItem,
          }),
          createElement(TonUnopenedCell, {
            row,
            options: [poRecord] as PurchaseOrderTonnageRecord[],
            linked: undefined,
            localTonForItem,
            loading,
            purchaseOrderLinkAllowed: true,
            purchaseOrderLinkBlockedReason: undefined,
            onOpenPicker: vi.fn(),
          }),
        ),
      )
    })
  }

  /** 模拟键盘把焦点移到节点上(React 19 监听 focusin)。 */
  const focusByKeyboard = async (node: HTMLElement) => {
    await act(async () => {
      node.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
      node.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 300))
    })
  }

  const stateLabels = () =>
    Array.from(
      container.querySelectorAll<HTMLElement>('.price-compare-ton-state'),
    )

  it('短状态标签是原生 button, 天然进入 Tab 序列(不是只能 hover 的死文本)', () => {
    render(baseRow)
    const labels = stateLabels()
    expect(labels).toHaveLength(2)
    for (const label of labels) {
      expect(label.tagName).toBe('BUTTON')
      expect(label.getAttribute('type')).toBe('button')
      // 原生 button 默认 tabIndex=0: 证明它确实在 Tab 序列里, 而不是 tabindex=-1 的摆设
      expect(label.tabIndex).toBe(0)
    }
  })

  it('聚焦短状态标签即打开说明气泡, 且气泡带不透明底类名', async () => {
    render(baseRow)
    const label = stateLabels()[0]
    expect(label.textContent).toBe('未关联')
    await focusByKeyboard(label)
    const bubble = document.querySelector<HTMLElement>(
      `.ant-tooltip.${TON_BUBBLE_CLASS}`,
    )
    expect(bubble, '键盘聚焦后未渲染出说明气泡').not.toBeNull()
    expect(bubble?.textContent).toContain(
      i18n.t('priceCompare.sheet.purchaseOrderNotLinkedHint'),
    )
  })

  it('「已删除」状态的键盘说明与可见短状态一致(不靠鼠标也能读到原因)', async () => {
    // 关联了明细行 301, 但选项里没有它 ⇒ 已删除
    render(
      { ...baseRow, purchaseOrderItemId: '404', purchaseOrderNo: 'PO-404' },
      0,
    )
    const label = stateLabels()[0]
    expect(label.textContent).toBe(
      i18n.t('priceCompare.sheet.purchaseOrderMissingShort'),
    )
    await focusByKeyboard(label)
    expect(
      document.querySelector(`.ant-tooltip.${TON_BUBBLE_CLASS}`)?.textContent,
    ).toContain(i18n.t('priceCompare.sheet.purchaseOrderMissingHint'))
  })
})
