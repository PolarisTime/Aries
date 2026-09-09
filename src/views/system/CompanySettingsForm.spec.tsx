// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { CompanySettingProfile } from '@/api/system/company-settings'
import { STATUS } from '@/constants/status-constants'
import { CompanySettingsForm } from './CompanySettingsForm'

const companies: CompanySettingProfile[] = [
  {
    id: '1',
    companyName: '公司A',
    taxNo: 'TAX-A',
    status: STATUS.NORMAL,
    remark: '',
    settlementAccounts: [],
  },
] as CompanySettingProfile[]

const baseProps = {
  companies,
  isFetching: false,
  selectedId: '1',
  onRefresh: vi.fn(),
  onSelect: vi.fn(),
  onSelectSaved: vi.fn(),
  onCreateDraft: vi.fn(),
}

describe('CompanySettingsForm 渲染冒烟', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

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
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
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

  const renderForm = (props: Partial<typeof baseProps> = {}) => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(CompanySettingsForm, { ...baseProps, ...props }),
        ),
      )
    })
  }

  it('渲染主体列表、表单与折叠面板', () => {
    renderForm()
    expect(container.textContent).toContain('公司A')
    expect(container.textContent).toContain('主体资料')
    expect(container.textContent).toContain('结算银行')
    expect(container.textContent).toContain('补充说明')
    expect(
      container.querySelector('.company-settings-editor-card'),
    ).toBeTruthy()
    expect(
      container.querySelector('.company-subject-selector-list'),
    ).toBeTruthy()
  })

  it('无选中主体时渲染空态与新增入口', () => {
    renderForm({ selectedId: '', companies: [] })
    expect(container.querySelector('.ant-empty')).toBeTruthy()
    const createButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('新增主体'),
    )
    expect(createButton).toBeTruthy()
    act(() => {
      createButton?.click()
    })
    expect(baseProps.onCreateDraft).toHaveBeenCalled()
  })

  it('选中主体时渲染保存操作', () => {
    renderForm()
    const saveButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.includes('保存'),
    )
    expect(saveButton).toBeTruthy()
  })
})
