// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { useNetPriceMatchStore } from '../net-price-match-store'
import { NetPriceMatchChip } from './NetPriceMatchChip'

/**
 * 「网价匹配」标识的可访问性契约。
 *
 * <p>标识视觉上只有状态词（一致 / 不一致 / 无网价 / 未核查），差额挂在 `Tooltip` 上。
 * 但 `Tag` 不可聚焦 —— 键盘用户既 hover 不到也 focus 不到，差额等于**鼠标专属**信息。
 * 此前靠「网价匹配明细」弹层兜底（弹层里差额是真正文本），而那个弹层列的是全表清单、
 * 与这一列完全重复，已移除。因此差额必须同时写进标识内的 sr-only 文本。</p>
 */
describe('NetPriceMatchChip', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    useNetPriceMatchStore.getState().clear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    useNetPriceMatchStore.getState().clear()
  })

  const renderChip = (itemId: string) => {
    act(() => {
      root.render(createElement(NetPriceMatchChip, { itemId }))
    })
  }

  it('不一致时把「应有价 vs 当前价」写进可读文本，而非只放悬浮提示', () => {
    act(() => {
      useNetPriceMatchStore.setState({
        entries: {
          r1: { state: 'MISMATCH', expectedPrice: 3430, currentPrice: 3200 },
        },
      })
    })
    renderChip('r1')

    const visibleText = container.textContent ?? ''
    // 可见文本仍是短状态词，不把长句塞进单元格
    expect(visibleText).toContain('不匹配')

    const srOnly = Array.from(container.querySelectorAll('.aries-sr-only')).map(
      (node) => node.textContent ?? '',
    )
    const detail = srOnly.find((text) => text.includes('3430.00'))
    expect(detail).toBeTruthy()
    // 差额两侧都要读得到
    expect(detail).toContain('3200.00')
  })

  it('无网价时说明该手工填写', () => {
    act(() => {
      useNetPriceMatchStore.setState({
        entries: { r1: { state: 'NO_PRICE' } },
      })
    })
    renderChip('r1')

    expect(container.textContent).toContain('无网价')
    const srOnly = Array.from(container.querySelectorAll('.aries-sr-only')).map(
      (node) => node.textContent ?? '',
    )
    expect(srOnly.some((text) => text.length > 0)).toBe(true)
  })

  it('未核查（无 store 条目）也有可读说明，不留空', () => {
    renderChip('r1')
    expect(container.textContent).toContain('未核查')
    const detail = container.querySelector('.aries-sr-only')?.textContent ?? ''
    expect(detail.trim().length).toBeGreaterThan(0)
  })
})
