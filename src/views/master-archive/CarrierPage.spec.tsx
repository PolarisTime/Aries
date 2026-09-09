// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  deleteBusinessModule,
  saveBusinessModule,
} from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import {
  fetchSettlementCompanyOptions,
  getSettlementCompanyOptions,
} from '@/api/system/company-settings'
import { bindAntdAppApi } from '@/utils/antd-app'
import { CarrierPage } from './CarrierPage'

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
  getCustomerOptions: vi.fn(),
}))
vi.mock('@/api/system/company-settings', () => ({
  fetchSettlementCompanyOptions: vi.fn(),
  getSettlementCompanyOptions: vi.fn(),
}))
vi.mock('@/api/system/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() =>
    Promise.resolve({ ui: { defaultPageSize: 10 } }),
  ),
}))
vi.mock('@/views/modules/components/ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: () => null,
}))

const settlementCompanyOptions = [
  {
    id: '2001',
    value: '2001',
    label: '结算主体甲',
    companyName: '结算主体甲',
  },
]

const carrierRows = [
  {
    id: '8001',
    carrierCode: 'WL001',
    carrierName: '物流商一',
    contactName: '联系人一',
    contactPhone: '13800000001',
    priceMode: '按吨',
    defaultSettlementCompanyId: '2001',
    defaultSettlementCompanyName: '结算主体甲',
    status: '正常',
    vehicles: [
      {
        vehicleId: '7101',
        plate: '京A11111',
        contact: '司机一',
        phone: '13900000001',
        remark: '',
      },
    ],
  },
]

describe('CarrierPage 主数据拆分试点', () => {
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
      data: { rows: carrierRows, total: 11 },
    })
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
          createElement(CarrierPage),
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

  const clickButton = async (label: string, scope: ParentNode = container) => {
    const target = [...scope.querySelectorAll('button')].find(
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

    expect(container.textContent).toContain('WL001')
    expect(container.textContent).toContain('物流商一')
    expect(container.textContent).toContain('按吨')
    const tableText = container.querySelector('.ant-table')?.textContent ?? ''
    expect(tableText).not.toContain('13800000001')
    expect(listBusinessModule).toHaveBeenCalledWith(
      'carrier',
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
    setTextValue(keywordInput, '物流')
    await clickButton('搜索')

    expect(listBusinessModule).toHaveBeenCalledWith(
      'carrier',
      { keyword: '物流' },
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
      'carrier',
      {},
      { currentPage: 2, pageSize: 10 },
      expect.anything(),
    )
  })

  it('新建物流方：保存时组装车辆数组与默认计价模式', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '8002' })
    renderPage()
    await flushAsync()

    await clickButton('新增')
    await flushAsync()
    const overlay = document.body.querySelector('.workspace-overlay')
    expect(overlay?.textContent).toContain('新建 — 物流方资料')

    const nameInput = document.body.querySelector(
      '.workspace-overlay input#carrierName',
    ) as HTMLInputElement
    setTextValue(nameInput, '物流商二')
    const plateInput = document.body.querySelector(
      '.workspace-overlay input#vehiclePlate',
    ) as HTMLInputElement
    setTextValue(plateInput, '京b22222')
    await chooseOverlaySelectOption(0)

    await clickButton('保存', document.body)

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect(draft).toMatchObject({
      carrierName: '物流商二',
      defaultSettlementCompanyId: '2001',
      defaultSettlementCompanyName: '结算主体甲',
      priceMode: '按吨',
      status: '正常',
    })
    expect((draft as { vehicles?: unknown[] }).vehicles).toEqual([
      {
        plate: '京B22222',
        contact: '',
        phone: '',
        remark: '',
      },
    ])
  })

  it('编辑物流方：车辆数组展开为槽位字段且保存保留原 id', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '8001' })
    renderPage()
    await flushAsync()

    const firstRow = container.querySelector('.ant-table-row')
    await act(async () => {
      firstRow?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('编辑')
    await flushAsync()
    const overlay = document.body.querySelector('.workspace-overlay')
    expect(overlay?.textContent).toContain('编辑 — 物流方资料')
    const plateInput = document.body.querySelector(
      '.workspace-overlay input#vehiclePlate',
    ) as HTMLInputElement
    expect(plateInput.value).toBe('京A11111')

    await clickButton('保存', document.body)

    expect(saveBusinessModule).toHaveBeenCalledTimes(1)
    const [, draft] = vi.mocked(saveBusinessModule).mock.calls[0]
    expect((draft as { id?: string }).id).toBe('8001')
    expect(
      (draft as { vehicles?: Array<{ plate: string }> }).vehicles?.[0],
    ).toMatchObject({ plate: '京A11111', contact: '司机一' })
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
    expect(deleteBusinessModule).toHaveBeenCalledWith('carrier', '8001')
  })
})
