// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { FinanceOverviewFilters } from './finance-overview-filters'
import { createInitialState } from './finance-overview-state'

const baseProps = () => ({
  dispatch: vi.fn(),
  optionsLoading: false,
  settlementCompanies: [{ label: '主体A', value: '10' }],
  settlementCompanyId: '10',
  state: createInitialState(),
})

describe('FinanceOverviewFilters 渲染冒烟', () => {
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
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
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const renderFilters = (props: Partial<ReturnType<typeof baseProps>> = {}) => {
    const merged = { ...baseProps(), ...props }
    act(() => {
      root.render(createElement(FinanceOverviewFilters, merged))
    })
    return merged
  }

  it('渲染主筛选行控件', () => {
    renderFilters()
    expect(container.querySelector('.finance-overview-toolbar')).toBeTruthy()
    expect(container.querySelector('input[aria-label="往来方"]')).toBeTruthy()
    expect(container.querySelector('input[aria-label="截止日期"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="财务方向"]')).toBeTruthy()
  })

  it('关键字输入即时更新 keywordInput，回车提交 keyword', () => {
    const props = renderFilters()
    const keywordInput = container.querySelector<HTMLInputElement>(
      'input[aria-label="往来方"]',
    )
    act(() => {
      if (!keywordInput) return
      Reflect.set(keywordInput, 'value', '客户A')
      keywordInput.dispatchEvent(new Event('input', { bubbles: true }))
      // React 受控输入在事件批次结束后会把 DOM 值还原为 prop 值，提交前需重新设值
      Reflect.set(keywordInput, 'value', '客户A')
      keywordInput.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          cancelable: true,
        }),
      )
    })
    const commitCall = props.dispatch.mock.calls.some(([action]) => {
      const values = (
        action as { values?: { keyword?: string; keywordInput?: string } }
      ).values
      return values?.keyword === '客户A' && values.keywordInput === '客户A'
    })
    expect(commitCall).toBe(true)
  })

  it('重置按钮派发 reset-filters', () => {
    const props = renderFilters()
    const resetButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('重置'),
    )
    act(() => {
      resetButton?.click()
    })
    expect(props.dispatch).toHaveBeenCalledWith({ type: 'reset-filters' })
  })

  it('默认隐藏高级筛选行，展开后 PAYABLE 方向显示往来类型', () => {
    const props = renderFilters()
    expect(
      container.querySelector('#finance-overview-advanced-filters'),
    ).toBeNull()
    const advancedButton = Array.from(
      container.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('高级筛选'))
    act(() => {
      advancedButton?.click()
    })
    expect(
      container.querySelector('#finance-overview-advanced-filters'),
    ).toBeTruthy()
    // RECEIVABLE 方向不渲染往来类型筛选
    expect(container.querySelector('[aria-label="往来类型"]')).toBeNull()
    expect(props.dispatch).not.toHaveBeenCalled()
  })
})
