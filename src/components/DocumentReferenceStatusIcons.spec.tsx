// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DocumentReferenceStatusIcons } from '@/components/DocumentReferenceStatusIcons'

describe('DocumentReferenceStatusIcons', () => {
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

  const renderIcons = (
    statuses: Parameters<typeof DocumentReferenceStatusIcons>[0]['statuses'],
  ) => {
    act(() => {
      root.render(createElement(DocumentReferenceStatusIcons, { statuses }))
    })
  }

  it('未引用时不渲染图标', () => {
    renderIcons([
      { key: 'sales-order', label: '已被销售订单引用', referenced: false },
      { key: 'purchase-inbound', label: '已被采购入库引用', referenced: false },
    ])

    expect(container.querySelectorAll('[role="img"]')).toHaveLength(0)
  })

  it('仅渲染已引用的状态图标', () => {
    renderIcons([
      { key: 'sales-order', label: '已被销售订单引用', referenced: true },
      { key: 'purchase-inbound', label: '已被采购入库引用', referenced: false },
    ])

    const icons = container.querySelectorAll('[aria-label="已被销售订单引用"]')
    expect(icons).toHaveLength(1)
    expect(icons[0]?.getAttribute('role')).toBe('img')
  })
})
