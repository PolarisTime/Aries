// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmptyState, type EmptyStateType } from '@/components/EmptyState'

describe('EmptyState', () => {
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

  const renderEmptyState = (
    props: Partial<Parameters<typeof EmptyState>[0]> & { type: EmptyStateType },
  ) => {
    act(() => {
      root.render(createElement(EmptyState, { title: '标题', ...props }))
    })
  }

  it.each(['no-data', 'no-result', 'no-permission', 'error'] as const)(
    '渲染 %s 类型并标记对应的 testId',
    (type) => {
      renderEmptyState({ type })

      const content = document.querySelector(
        `[data-testid="empty-state-${type}"]`,
      )
      expect(content).not.toBeNull()
      expect(
        document.querySelector('[data-testid="empty-state-primary-action"]'),
      ).toBeNull()
      expect(
        document.querySelector('[data-testid="empty-state-secondary-action"]'),
      ).toBeNull()
    },
  )

  it('渲染主操作与次操作并触发回调', () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()

    renderEmptyState({
      type: 'no-data',
      description: '描述',
      hint: '提示',
      primaryAction: { label: '主要', onClick: onPrimary },
      secondaryAction: { label: '次要', onClick: onSecondary },
    })

    const primaryButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="empty-state-primary-action"]',
    )
    const secondaryButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="empty-state-secondary-action"]',
    )
    expect(primaryButton).not.toBeNull()
    expect(secondaryButton).not.toBeNull()

    act(() => {
      primaryButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })
    act(() => {
      secondaryButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })

    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })

  it('仅提供次操作时不渲染主操作按钮', () => {
    renderEmptyState({
      type: 'error',
      secondaryAction: { label: '重试', onClick: vi.fn() },
    })

    expect(
      document.querySelector('[data-testid="empty-state-primary-action"]'),
    ).toBeNull()
    expect(
      document.querySelector('[data-testid="empty-state-secondary-action"]'),
    ).not.toBeNull()
  })
})
