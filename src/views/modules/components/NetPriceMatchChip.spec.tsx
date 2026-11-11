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

  it('匹配（正常态）不再用绿色 Tag：整列安静，不抢单价/金额的注意力', () => {
    act(() => {
      useNetPriceMatchStore.setState({
        entries: {
          r1: { state: 'MATCHED', expectedPrice: 3360, currentPrice: 3360 },
        },
      })
    })
    renderChip('r1')

    // 正常态是安静的行内标识，不是带底色的 Tag
    expect(container.querySelector('.net-price-match-quiet')).toBeTruthy()
    expect(container.querySelector('.ant-tag')).toBeNull()
    expect(container.textContent).toContain('匹配')
    // 图标 + 文字双通道仍在，差额照旧写进 sr-only 文本（WCAG 1.4.1 / 键盘可读）
    expect(container.querySelector('.anticon')).toBeTruthy()
    const detail = container.querySelector('.aries-sr-only')?.textContent ?? ''
    expect(detail.trim().length).toBeGreaterThan(0)
  })

  it('异常态仍用 Tag（语义色 + 图标），与正常态形成对比', () => {
    act(() => {
      useNetPriceMatchStore.setState({
        entries: {
          r1: { state: 'MISMATCH', expectedPrice: 3430, currentPrice: 3200 },
        },
      })
    })
    renderChip('r1')
    expect(container.querySelector('.ant-tag')).toBeTruthy()
    expect(container.querySelector('.net-price-match-quiet')).toBeNull()
  })

  /**
   * 只读状态标签**不描边**。
   *
   * <p>回归的真实反馈：网价匹配列里"未核查 / 无网价"用的 Tag 带边框，在表格里与可编辑
   * 单元格长得一模一样，用户以为这一列能改。这一列的语义是只读核查结果（数据在页面级
   * store，不在明细行上），所以只有"需要注意"的「与网价不一致」保留描边
   * （`variant="outlined"`），其余用 `variant="filled"` 做成无边框的行内标识。</p>
   */
  it('未核查 / 无网价的状态标签不描边，只有不一致才描边', () => {
    renderChip('r1')
    expect(container.querySelector('.ant-tag')?.className ?? '').not.toContain(
      'ant-tag-outlined',
    )

    act(() => {
      useNetPriceMatchStore.setState({
        entries: { r1: { state: 'NO_PRICE' } },
      })
    })
    renderChip('r1')
    expect(container.querySelector('.ant-tag')?.className ?? '').not.toContain(
      'ant-tag-outlined',
    )

    act(() => {
      useNetPriceMatchStore.setState({
        entries: {
          r1: { state: 'MISMATCH', expectedPrice: 3430, currentPrice: 3200 },
        },
      })
    })
    renderChip('r1')
    expect(container.querySelector('.ant-tag')?.className ?? '').toContain(
      'ant-tag-outlined',
    )
  })

  it('未核查（无 store 条目）也有可读说明，不留空', () => {
    renderChip('r1')
    expect(container.textContent).toContain('未核查')
    const detail = container.querySelector('.aries-sr-only')?.textContent ?? ''
    expect(detail.trim().length).toBeGreaterThan(0)
  })
})
