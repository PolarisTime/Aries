// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { PriceCompareSaveStatus } from './PriceCompareSaveStatus'
import type { SheetSaveStatus } from './useSheetsStore'

describe('PriceCompareSaveStatus', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
  })

  const render = (status: SheetSaveStatus, onRetry = vi.fn()) => {
    act(() => {
      root.render(createElement(PriceCompareSaveStatus, { status, onRetry }))
    })
    return onRetry
  }

  it('无改动时不渲染任何内容', () => {
    render('idle')
    expect(container.textContent).toBe('')
    expect(container.querySelector('.price-compare-save-status')).toBeNull()
  })

  it('未保存/保存中/已保存分别给出可读状态与无障碍播报语义', () => {
    const statuses: Array<[SheetSaveStatus, string]> = [
      ['dirty', '未保存'],
      ['saving', '保存中'],
      ['saved', '已保存'],
    ]
    for (const [status, label] of statuses) {
      render(status)
      const el = container.querySelector('.price-compare-save-status')
      expect(el).not.toBeNull()
      expect(el?.textContent).toContain(label)
      // 状态只是颜色不同的话读屏/色觉障碍用户无法获取: 必须有文本+live region
      expect(el?.getAttribute('role')).toBe('status')
      expect(el?.getAttribute('aria-live')).toBe('polite')
    }
  })

  it('保存失败时提供重试按钮并触发回调', () => {
    const onRetry = render('error')
    expect(container.textContent).toContain('保存失败')
    const retry = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('重试'),
    )
    expect(retry).toBeTruthy()
    act(() => {
      retry?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('冲突态说明需按上方提示处理, 不提供直接重试', () => {
    render('conflict')
    expect(container.textContent).toContain('存在冲突，待处理')
    expect(
      Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('重试'),
      ),
    ).toBeUndefined()
  })
})
