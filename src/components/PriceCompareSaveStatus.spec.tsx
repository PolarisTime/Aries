// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { PriceCompareSaveStatusValue } from './PriceCompareSaveStatus'
import { PriceCompareSaveStatus } from './PriceCompareSaveStatus'

describe('PriceCompareSaveStatus（两页共用）', () => {
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

  const render = (
    status: PriceCompareSaveStatusValue,
    options: { onRetry?: () => void; detail?: string } = {},
  ) => {
    const onRetry = options.onRetry ?? vi.fn()
    act(() => {
      root.render(
        createElement(PriceCompareSaveStatus, {
          status,
          onRetry,
          detail: options.detail,
        }),
      )
    })
    return onRetry
  }

  it('idle 时容器常驻并显示 idle 文案（locale key 由 task-18 补）', () => {
    render('idle')
    const statusNode = container.querySelector('.price-compare-save-status')
    expect(statusNode).not.toBeNull()
    expect(statusNode?.getAttribute('role')).toBe('status')
    expect(statusNode?.getAttribute('aria-live')).toBe('polite')
    expect(container.textContent).toContain(
      i18n.t('priceCompare.saveStatus.idle'),
    )
  })

  it('未保存/保存中/已保存分别给出可读状态与无障碍播报语义', () => {
    const statuses: Array<[PriceCompareSaveStatusValue, string]> = [
      ['dirty', '未保存'],
      ['saving', '保存中'],
      ['saved', '已保存'],
    ]
    for (const [status, label] of statuses) {
      render(status)
      const el = container.querySelector('.price-compare-save-status')
      expect(el).not.toBeNull()
      expect(el?.textContent).toContain(label)
      expect(el?.getAttribute('role')).toBe('status')
      expect(el?.getAttribute('aria-live')).toBe('polite')
    }
  })

  it('保存失败时说明文字可见（不只 Tooltip），并给出重试入口', () => {
    const onRetry = render('error')
    expect(container.textContent).toContain('保存失败')
    // 说明必须直接渲染出来，读屏/低视力用户不展开 Tooltip 也能看到
    expect(container.textContent).toContain('改动仍保留在本地')
    const retry = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('重试'),
    )
    expect(retry).toBeTruthy()
    act(() => {
      retry?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('自定义 detail 覆盖默认说明（供应商报价表显示失败品牌）', () => {
    render('error', { detail: '保存失败品牌：中天、永钢' })
    expect(container.textContent).toContain('保存失败品牌：中天、永钢')
    expect(container.textContent).not.toContain('改动仍保留在本地')
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
