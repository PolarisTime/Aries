// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { listBusinessModule } from '@/api/business/business-listing'
import { bindAntdAppApi } from '@/utils/antd-app'
import { SupplierPage } from './SupplierPage'

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
vi.mock('@/api/system/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() =>
    Promise.resolve({ ui: { defaultPageSize: 10 } }),
  ),
}))
vi.mock('@/views/modules/components/ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: () => null,
}))

const supplierRows = [
  {
    id: '9001',
    supplierCode: 'SUP0001',
    supplierName: '河北钢铁贸易',
    contactName: '张伟',
    contactPhone: '13800001111',
    city: '石家庄',
    status: '正常',
    remark: '长期合作',
  },
  {
    id: '9002',
    supplierCode: 'SUP0002',
    supplierName: '江苏沙钢物资',
    contactName: '李娜',
    contactPhone: '13900002222',
    city: '张家港',
    status: '禁用',
    remark: '',
  },
]

describe('SupplierPage 专属页面', () => {
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
      modal: { confirm: () => undefined },
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.mocked(listBusinessModule).mockResolvedValue({
      code: 0,
      data: { rows: supplierRows, total: 2 },
    })
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
          createElement(SupplierPage),
        ),
      )
    })
  }

  it('渲染供应商列表与状态', async () => {
    renderPage()
    await flushAsync()

    expect(vi.mocked(listBusinessModule)).toHaveBeenCalledWith(
      'supplier',
      {},
      { currentPage: 1, pageSize: 10 },
      expect.objectContaining({ signal: expect.anything() }),
    )
    expect(container.textContent).toContain('SUP0001')
    expect(container.textContent).toContain('河北钢铁贸易')
    expect(container.textContent).toContain('SUP0002')
    expect(container.textContent).toContain('江苏沙钢物资')
    expect(container.textContent).toContain('正常数：1')
  })

  it('点击新增打开编辑抽屉并展示供应商名称字段', async () => {
    renderPage()
    await flushAsync()

    const createButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === '新增',
    )
    expect(createButton, '新增按钮应存在').toBeTruthy()
    await act(async () => {
      createButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(document.body.textContent).toContain('供应商名称')
  })
})
