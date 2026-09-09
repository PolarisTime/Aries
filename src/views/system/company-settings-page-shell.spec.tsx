// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  CompanySettingsPageActions,
  CompanySettingsPageShell,
} from './company-settings-page-shell'

describe('CompanySettingsPageShell / PageActions 渲染冒烟', () => {
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

  it('Shell 渲染标题描述与 extra 内容', () => {
    act(() => {
      root.render(
        createElement(
          CompanySettingsPageShell,
          { extra: createElement('span', null, 'extra-content') },
          createElement('main', null, 'page-body'),
        ),
      )
    })
    expect(container.textContent).toContain('extra-content')
    expect(container.textContent).toContain('page-body')
    expect(container.querySelector('.settings-standard-page')).toBeTruthy()
  })

  it('Actions 渲染刷新按钮并触发 onRefresh', () => {
    const onRefresh = vi.fn()
    const onSave = vi.fn()
    act(() => {
      root.render(
        createElement(CompanySettingsPageActions, {
          canSave: true,
          loading: false,
          saving: false,
          onRefresh,
          onSave,
        }),
      )
    })
    const refreshButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('刷新'),
    )
    expect(refreshButton).toBeTruthy()
    act(() => {
      refreshButton?.click()
    })
    expect(onRefresh).toHaveBeenCalledTimes(1)
    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('保存'),
    )
    expect(saveButton).toBeTruthy()
    act(() => {
      saveButton?.click()
    })
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('canSave 为 false 时隐藏保存按钮', () => {
    act(() => {
      root.render(
        createElement(CompanySettingsPageActions, {
          canSave: false,
          loading: false,
          saving: false,
          onRefresh: vi.fn(),
          onSave: vi.fn(),
        }),
      )
    })
    expect(container.textContent).not.toContain('保存')
  })
})
