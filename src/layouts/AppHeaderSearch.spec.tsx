// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { AppHeaderSearch } from '@/layouts/AppHeaderSearch'

const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

describe('AppHeaderSearch focus restore', () => {
  let root: Root
  let host: HTMLDivElement
  const handlers = {
    onBlur: vi.fn(),
    onKeywordChange: vi.fn(),
    onOpen: vi.fn(),
    onOpenChange: vi.fn(),
    onSearch: vi.fn(),
    onSelect: vi.fn(),
    onSubmit: vi.fn(),
  }

  const renderSearch = () => {
    act(() => {
      root.render(
        createElement(AppHeaderSearch, {
          className: 'header-global-search',
          keyword: 'SO-1',
          options: [{ value: 'sales-order::1', label: 'SO-1' }],
          open: true,
          loading: false,
          ...handlers,
        }),
      )
    })
  }

  beforeEach(() => {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    renderSearch()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    host.remove()
    document.body.innerHTML = ''
    Object.values(handlers).forEach((handler) => {
      handler.mockClear()
    })
  })

  const searchInput = () =>
    host.querySelector<HTMLInputElement>('input.header-global-search-input')!

  it('restores focus to the search input after selecting a result', async () => {
    const input = searchInput()
    input.focus()
    expect(document.activeElement).toBe(input)

    const option = document.querySelector<HTMLElement>(
      '.ant-select-item-option',
    )!
    expect(option).toBeTruthy()

    act(() => {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await nextFrame()

    expect(handlers.onSelect).toHaveBeenCalledWith('sales-order::1')
    expect(document.activeElement).toBe(input)
  })

  it('restores focus to the search input after submitting with Enter', async () => {
    const input = searchInput()
    input.focus()
    input.blur()
    expect(document.activeElement).not.toBe(input)

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    await nextFrame()

    expect(handlers.onSubmit).toHaveBeenCalledWith('SO-1')
    expect(document.activeElement).toBe(input)
  })

  it('restores focus to the search input after submitting via the button', async () => {
    const input = searchInput()
    input.focus()
    input.blur()

    const button = host.querySelector<HTMLButtonElement>(
      'button.header-global-search-button',
    )!
    expect(button).toBeTruthy()

    act(() => {
      button.click()
    })
    await nextFrame()

    expect(handlers.onSubmit).toHaveBeenCalledWith('SO-1')
    expect(document.activeElement).toBe(input)
  })
})
