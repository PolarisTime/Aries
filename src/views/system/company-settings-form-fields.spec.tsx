// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { Form } from 'antd'
import {
  CompanyRemarkField,
  SettlementAccountsTable,
  SubjectProfileFields,
} from './company-settings-form-fields'

describe('CompanySettings 表单字段渲染冒烟', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    vi.useFakeTimers()
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
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('SubjectProfileFields 在 Form 内渲染基础信息字段', () => {
    act(() => {
      root.render(
        createElement(Form, null, createElement(SubjectProfileFields)),
      )
    })
    const inputs = container.querySelectorAll('input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    expect(container.textContent).toContain('结算主体名称')
    expect(container.textContent).toContain('税号')
  })

  it('SettlementAccountsTable 渲染空态并支持添加行回调', () => {
    const onChange = vi.fn()
    act(() => {
      root.render(
        createElement(
          Form,
          null,
          createElement(SettlementAccountsTable, { onChange }),
        ),
      )
    })
    const emptyAddButton = Array.from(
      container.querySelectorAll('button'),
    ).find((button) => button.textContent?.includes('新增银行'))
    expect(emptyAddButton).toBeTruthy()
    act(() => {
      emptyAddButton?.click()
    })
    expect(onChange).toHaveBeenCalled()
  })

  it('SettlementAccountsTable 渲染已有行与操作列', () => {
    act(() => {
      root.render(
        createElement(
          Form,
          { initialValues: { settlementAccounts: [{ id: '9' }] } },
          createElement(SettlementAccountsTable, { onChange: () => {} }),
        ),
      )
    })
    const rows = container.querySelectorAll('.ant-table-tbody tr')
    expect(rows.length).toBeGreaterThan(0)
    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="删除"]',
    )
    expect(deleteButton).toBeTruthy()
  })

  it('CompanyRemarkField 在 Form 内渲染备注文本域', () => {
    act(() => {
      root.render(createElement(Form, null, createElement(CompanyRemarkField)))
    })
    expect(container.querySelector('textarea')).toBeTruthy()
  })
})
