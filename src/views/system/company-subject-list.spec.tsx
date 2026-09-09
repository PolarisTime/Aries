// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { CompanySettingProfile } from '@/api/system/company-settings'
import { STATUS } from '@/constants/status-constants'
import { CompanySubjectList } from './company-subject-list'

const companies: CompanySettingProfile[] = [
  {
    id: '1',
    companyName: '公司A',
    taxNo: 'TAX-A',
    status: STATUS.NORMAL,
    remark: '',
    settlementAccounts: [],
  },
  {
    id: '2',
    companyName: '',
    taxNo: '',
    status: STATUS.DISABLED,
    remark: '',
    settlementAccounts: [],
  },
] as CompanySettingProfile[]

const baseProps = {
  companies,
  selectedId: '1',
  deletingId: null,
  onCreate: vi.fn(),
  onDelete: vi.fn(),
  onSelect: vi.fn(),
}

describe('CompanySubjectList 渲染冒烟', () => {
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

  const renderList = (props: Partial<typeof baseProps> = {}) => {
    act(() => {
      root.render(createElement(CompanySubjectList, { ...baseProps, ...props }))
    })
  }

  it('渲染公司列表与选中态', () => {
    renderList()
    expect(container.textContent).toContain('公司A')
    expect(container.textContent).toContain('TAX-A')
    const activeItem = container.querySelector(
      '.company-subject-selector-item.is-active',
    )
    expect(activeItem).toBeTruthy()
  })

  it('点击主体触发 onSelect，删除按钮不冒泡选中', () => {
    renderList()
    const mainButton = container.querySelector<HTMLButtonElement>(
      '.company-subject-selector-main',
    )
    act(() => {
      mainButton?.click()
    })
    expect(baseProps.onSelect).toHaveBeenCalledWith('1')

    const deleteButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="删除结算主体"]',
    )
    expect(deleteButton).toBeTruthy()
    act(() => {
      deleteButton?.click()
    })
    expect(baseProps.onDelete).toHaveBeenCalledWith('1')
    expect(baseProps.onSelect).toHaveBeenCalledTimes(1)
  })

  it('无公司时渲染空态', () => {
    renderList({ companies: [] })
    expect(container.querySelector('.ant-empty')).toBeTruthy()
  })
})
