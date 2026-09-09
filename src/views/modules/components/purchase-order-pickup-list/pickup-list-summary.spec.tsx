// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { PickupListSummary } from './pickup-list-summary'

const baseProps = {
  canGroup: true,
  canRestore: true,
  summaryItems: [
    ['单据数', 2],
    ['总件数', 10],
  ] as Array<[string, string | number]>,
  onAddGroup: vi.fn(),
  onClose: vi.fn(),
  onGroupByWarehouse: vi.fn(),
  onRestore: vi.fn(),
}

describe('PickupListSummary 渲染冒烟', () => {
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

  const renderSummary = (props: Partial<typeof baseProps> = {}) => {
    act(() => {
      root.render(createElement(PickupListSummary, { ...baseProps, ...props }))
    })
  }

  it('渲染汇总指标与操作按钮', () => {
    renderSummary()
    expect(container.textContent).toContain('单据数')
    expect(container.textContent).toContain('10')
    expect(container.textContent).toContain('按仓库一键分组')
    expect(container.textContent).toContain('添加分组')
    expect(container.textContent).toContain('恢复默认顺序')
  })

  it('按钮回调按预期触发', () => {
    renderSummary()
    const buttons = Array.from(container.querySelectorAll('button'))
    const byText = (text: string) =>
      buttons.find((button) => button.textContent?.includes(text))
    act(() => {
      byText('按仓库一键分组')?.click()
    })
    expect(baseProps.onGroupByWarehouse).toHaveBeenCalledTimes(1)
    act(() => {
      byText('添加分组')?.click()
    })
    expect(baseProps.onAddGroup).toHaveBeenCalledTimes(1)
    act(() => {
      byText('恢复默认顺序')?.click()
    })
    expect(baseProps.onRestore).toHaveBeenCalledTimes(1)
  })

  it('canGroup/canRestore 为 false 时禁用对应按钮', () => {
    renderSummary({ canGroup: false, canRestore: false })
    const buttons = Array.from(container.querySelectorAll('button'))
    expect(
      buttons.find((button) => button.textContent?.includes('按仓库一键分组'))
        ?.disabled,
    ).toBe(true)
    expect(
      buttons.find((button) => button.textContent?.includes('恢复默认顺序'))
        ?.disabled,
    ).toBe(true)
  })
})
