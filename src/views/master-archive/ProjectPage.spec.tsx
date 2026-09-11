// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import { fetchSettlementCompanyOptions } from '@/api/system/company-settings'
import { getCustomerOptions } from '@/queries/master/customer-options'
import { getSettlementCompanyOptions } from '@/queries/system/company-settings'
import { bindAntdAppApi } from '@/utils/antd-app'
import { ProjectPage } from './ProjectPage'

vi.mock('@/api/business/business-listing', () => ({
  listBusinessModule: vi.fn(),
}))
vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: vi.fn(),
  saveBusinessModule: vi.fn(),
  deleteBusinessModule: vi.fn(),
}))
vi.mock('@/api/business/common-export', () => ({
  exportModuleData: vi.fn(),
}))
vi.mock('@/api/master/customer-options', () => ({
  fetchCustomerOptions: vi.fn(),
}))
vi.mock('@/queries/master/customer-options', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/queries/master/customer-options')>()
  return { ...actual, getCustomerOptions: vi.fn() }
})
vi.mock('@/api/system/company-settings', () => ({
  fetchSettlementCompanyOptions: vi.fn(),
}))
vi.mock('@/queries/system/company-settings', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/queries/system/company-settings')>()
  return { ...actual, getSettlementCompanyOptions: vi.fn() }
})
vi.mock('@/api/system/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() =>
    Promise.resolve({ ui: { defaultPageSize: 10 } }),
  ),
}))
vi.mock('@/views/modules/components/ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: () => null,
}))

const customerOptions = [
  {
    id: '1001',
    value: '1001',
    label: '客户甲',
    customerCode: 'KH001',
    customerName: '客户甲',
    defaultSettlementCompanyId: '2001',
    defaultSettlementCompanyName: '结算主体甲',
  },
]

const settlementCompanyOptions = [
  {
    id: '2001',
    value: '2001',
    label: '结算主体甲',
    companyName: '结算主体甲',
  },
  {
    id: '2002',
    value: '2002',
    label: '结算主体乙',
    companyName: '结算主体乙',
  },
]

const projectRows = [
  {
    id: '9001',
    projectCode: 'XM001',
    projectName: '项目一',
    projectNameAbbr: '项一',
    customerId: '1001',
    customerCode: 'KH001',
    settlementCompanyId: '2001',
    settlementCompanyName: '结算主体甲',
    projectManager: '张三',
    projectAddress: '地址一',
    status: '正常',
    remark: '备注一',
  },
  {
    id: '9002',
    projectCode: 'XM002',
    projectName: '项目二',
    customerId: '1001',
    customerCode: 'KH001',
    settlementCompanyId: '2001',
    settlementCompanyName: '结算主体甲',
    status: '禁用',
  },
]

describe('ProjectPage 主数据拆分试点', () => {
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
    bindAntdAppApi({
      modal: {
        confirm: (config: { onOk?: () => unknown }) => {
          void config.onOk?.()
        },
      },
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.mocked(listBusinessModule).mockResolvedValue({
      code: 0,
      data: { rows: projectRows, total: 21 },
    })
    vi.mocked(fetchCustomerOptions).mockResolvedValue(customerOptions)
    vi.mocked(getCustomerOptions).mockReturnValue(customerOptions)
    vi.mocked(fetchSettlementCompanyOptions).mockResolvedValue(
      settlementCompanyOptions,
    )
    vi.mocked(getSettlementCompanyOptions).mockReturnValue(
      settlementCompanyOptions,
    )
  })

  afterEach(async () => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
    await queryClient.cancelQueries()
    queryClient.clear()
  })

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const renderPage = () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(ProjectPage),
        ),
      )
    })
  }

  const setTextValue = (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )
    act(() => {
      input.focus()
      descriptor?.set?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }

  const clickButton = async (label: string) => {
    const target = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === label,
    )
    expect(target, `按钮 ${label} 应存在`).toBeTruthy()
    await act(async () => {
      target!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const chooseOverlaySelectOption = async (index: number) => {
    const selectRoots = document.body
      .querySelector('.workspace-overlay')!
      .querySelectorAll('.ant-select')
    await act(async () => {
      selectRoots[index]?.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const option =
      document.body.querySelector('.ant-select-item-option') ??
      document.body.querySelector('[role="option"]')
    expect(option, '下拉选项应渲染').toBeTruthy()
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  it('渲染列表列、状态标签与默认隐藏列', async () => {
    renderPage()
    await flushAsync()

    expect(container.textContent).toContain('XM001')
    expect(container.textContent).toContain('项目一')
    expect(container.textContent).toContain('客户甲')
    const tableText = container.querySelector('.ant-table')?.textContent ?? ''
    expect(tableText).not.toContain('项一')
    expect(tableText).not.toContain('地址一')
    expect(container.querySelectorAll('.ant-table-cell')).not.toHaveLength(0)
    expect(listBusinessModule).toHaveBeenCalledWith(
      'project',
      {},
      { currentPage: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    )
  })

  it('关键字筛选提交后按条件重新拉取列表', async () => {
    renderPage()
    await flushAsync()
    vi.mocked(listBusinessModule).mockClear()

    const keywordInput = container.querySelector(
      'input[aria-label="关键字"]',
    ) as HTMLInputElement
    setTextValue(keywordInput, '项目')
    await clickButton('搜索')

    expect(listBusinessModule).toHaveBeenCalledWith(
      'project',
      { keyword: '项目' },
      { currentPage: 1, pageSize: 10 },
      expect.anything(),
    )
  })

  it('翻页后拉取下一页数据', async () => {
    renderPage()
    await flushAsync()
    vi.mocked(listBusinessModule).mockClear()

    const pageItem = [
      ...document.body.querySelectorAll('.ant-pagination-item'),
    ].find((item) => item.textContent === '2')
    expect(pageItem, '应存在第 2 页').toBeTruthy()
    await act(async () => {
      pageItem!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(listBusinessModule).toHaveBeenCalledWith(
      'project',
      {},
      { currentPage: 2, pageSize: 10 },
      expect.anything(),
    )
  })

  it('展开行详情时拉取详情接口并渲染字段', async () => {
    vi.mocked(getBusinessModuleDetail).mockResolvedValue({
      ...projectRows[0],
      projectAddress: '详情地址',
    })
    renderPage()
    await flushAsync()

    const detailButton = container.querySelector(
      'button[aria-label="查看明细"]',
    ) as HTMLButtonElement
    await act(async () => {
      detailButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(getBusinessModuleDetail).toHaveBeenCalledWith('project', '9001')
    expect(container.textContent).toContain('详情地址')
  })

  it('新建项目：填写表单保存时带上客户编码与结算主体快照', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9003' })
    renderPage()
    await flushAsync()

    await clickButton('新增')
    await flushAsync()
    const overlay = document.body.querySelector('.workspace-overlay')
    expect(overlay?.textContent).toContain('新建 — 项目资料')

    const nameInput = document.body.querySelector(
      '.workspace-overlay input#projectName',
    ) as HTMLInputElement
    setTextValue(nameInput, '项目三')
    await chooseOverlaySelectOption(0)
    await chooseOverlaySelectOption(1)

    await clickButtonInOverlay('保存')

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      projectName: '项目三',
      customerId: '1001',
      customerCode: 'KH001',
      settlementCompanyId: '2001',
      settlementCompanyName: '结算主体甲',
      status: '正常',
    })
    expect(String((draft as { id?: string }).id ?? '')).toBe('')
  })

  it('编辑已有项目：保存时保留原记录 id', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    await act(async () => {
      container
        .querySelector('.ant-table-row')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()
    expect(document.body.textContent).toContain('编辑 — 项目资料')

    await clickButtonInOverlay('保存')

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect((draft as { id?: string }).id).toBe('9001')
    expect((draft as { projectName?: string }).projectName).toBe('项目一')
  })

  it('勾选记录后执行批量删除', async () => {
    vi.mocked(deleteBusinessModule).mockResolvedValue(undefined)
    renderPage()
    await flushAsync()

    const firstRow = container.querySelector('.ant-table-row')
    await act(async () => {
      firstRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('删除')
    await flushAsync()

    expect(deleteBusinessModule).toHaveBeenCalledTimes(1)
    expect(deleteBusinessModule).toHaveBeenCalledWith('project', '9001')
  })
})

function clickButtonInOverlay(label: string) {
  const buttons = [...document.body.querySelectorAll('button')]
  const target = buttons.find(
    (button) =>
      button.textContent?.replace(/\s/g, '') === label.replace(/\s/g, ''),
  )
  expect(target, `浮层按钮 ${label} 应存在`).toBeTruthy()
  return act(async () => {
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}
