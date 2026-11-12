// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { renderDocumentReferenceNo } from './document-reference'

/**
 * 单据编号列渲染的**唯一出口**（销售订单、采购订单共用，后续单据同样走这里）。
 *
 * <p>两条契约合一：类名结构（单据流弹层靠 `document-reference-trigger` 找到可点单号）
 * 与「不再渲染下游引用图标」的回归。此前的用例挂在销售订单的本地实现上，
 * 抽公共层后跟着搬到共享层 —— 否则两个配置各写一份时，只有被断言覆盖的那一份会被守住。</p>
 */

describe('单据编号列（共享渲染）', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
  })

  /**
   * 单号列的渲染结果只取决于单号本身：行上的引用标记已不再参与渲染。
   * 用例仍显式传入带标记的记录，用来证明「引用字段为 true 也不再出现图标」。
   */
  const renderCell = (_record: Record<string, unknown>) => {
    act(() => {
      root.render(
        createElement('div', null, renderDocumentReferenceNo('SO20261014001')),
      )
    })
    return container
  }

  it('外层带单据流触发器类名、内层带链接类名', () => {
    const cell = renderCell({})
    const trigger = cell.querySelector('.document-reference-trigger')
    expect(trigger).not.toBeNull()
    expect(
      trigger?.firstElementChild?.classList.contains('document-reference-link'),
    ).toBe(true)
  })

  it('单号文本仍正常渲染（不是把整列删空）', () => {
    const cell = renderCell({
      referencedByFreightBill: true,
      referencedBySalesOutbound: true,
      referencedBySalesReturn: true,
    })

    expect(cell.querySelector('.document-reference-link')?.textContent).toBe(
      'SO20261014001',
    )
  })

  it('即使三个引用字段都为 true，也不渲染任何引用图标与 tooltip', () => {
    const cell = renderCell({
      referencedByFreightBill: true,
      referencedBySalesOutbound: true,
      referencedBySalesReturn: true,
    })

    // 图标本体与可访问名都不允许出现。
    expect(cell.querySelectorAll('.anticon-link')).toHaveLength(0)
    expect(cell.querySelectorAll('[role="img"]')).toHaveLength(0)
    expect(cell.querySelector('[title="已被物流单引用"]')).toBeNull()
    expect(cell.textContent).not.toContain('已被物流单引用')
    expect(cell.textContent).not.toContain('已被销售出库引用')
    expect(cell.textContent).not.toContain('已被销售退货单引用')
    // 不留空节点：单号容器里除了单号文本没有别的元素。
    expect(
      cell.querySelector('.document-reference-trigger')?.children,
    ).toHaveLength(1)
  })

  it('引用字段全部为 false 时同样不渲染图标（不是只在有引用时才隐藏）', () => {
    const cell = renderCell({
      referencedByFreightBill: false,
      referencedBySalesOutbound: false,
      referencedBySalesReturn: false,
    })

    expect(cell.querySelectorAll('.anticon-link')).toHaveLength(0)
    expect(cell.querySelectorAll('[role="img"]')).toHaveLength(0)
  })
})
