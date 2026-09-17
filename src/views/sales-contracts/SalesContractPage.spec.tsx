// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { fetchCustomerOptions } from '@/api/master/customer-options'
import { fetchProjectOptions } from '@/api/master/project-options'
import {
  deleteSalesContract,
  listSalesContracts,
  updateSalesContractStatus,
} from '@/api/sales/sales-contracts'
import { bindAntdAppApi } from '@/utils/antd-app'
import { SalesContractPage } from './SalesContractPage'

vi.mock('@/api/sales/sales-contracts', () => ({
  listSalesContracts: vi.fn(),
  getSalesContract: vi.fn(),
  createSalesContract: vi.fn(),
  updateSalesContract: vi.fn(),
  deleteSalesContract: vi.fn(),
  updateSalesContractStatus: vi.fn(),
  fetchSalesOrderContractCheck: vi.fn(),
}))
vi.mock('@/api/master/customer-options', () => ({
  fetchCustomerOptions: vi.fn(),
}))
vi.mock('@/api/master/project-options', () => ({
  fetchProjectOptions: vi.fn(),
}))
vi.mock('@/api/system/runtime-config', () => ({
  getRuntimeConfig: vi.fn(() =>
    Promise.resolve({ ui: { defaultPageSize: 10 } }),
  ),
}))

const contractRows = [
  {
    id: '9000000000000000001',
    contractNo: 'HT-001',
    name: '年度销售合同',
    customerId: '1001',
    customerName: '客户甲',
    projectId: '2001',
    projectName: '项目一',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    totalAmount: 1000,
    totalTonnage: 100,
    status: '草稿',
    remark: '',
    version: '1',
  },
  {
    id: '9000000000000000002',
    contractNo: 'HT-002',
    name: '框架合同',
    customerId: '1001',
    customerName: '客户甲',
    projectId: '2001',
    projectName: '项目一',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    totalAmount: 500,
    totalTonnage: 50,
    status: '审核',
    remark: '',
    version: '2',
  },
  {
    id: '9000000000000000003',
    contractNo: 'HT-003',
    name: '签发合同',
    customerId: '1001',
    customerName: '客户甲',
    projectId: '2001',
    projectName: '项目一',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    totalAmount: 300,
    totalTonnage: 30,
    status: '签发',
    remark: '',
    version: '1',
  },
  {
    id: '9000000000000000004',
    contractNo: 'HT-004',
    name: '归档合同',
    customerId: '1001',
    customerName: '客户甲',
    projectId: '2001',
    projectName: '项目一',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    totalAmount: 200,
    totalTonnage: 20,
    status: '归档',
    remark: '',
    version: '1',
  },
  {
    id: '9000000000000000005',
    contractNo: 'HT-005',
    name: '作废合同',
    customerId: '1001',
    customerName: '客户甲',
    projectId: '2001',
    projectName: '项目一',
    signDate: '2026-01-01',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    totalAmount: 100,
    totalTonnage: 10,
    status: '作废',
    remark: '',
    version: '1',
  },
]

describe('SalesContractPage 销售合同页', () => {
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
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    bindAntdAppApi({
      modal: {
        confirm: (config: { onOk?: () => unknown }) => {
          void config.onOk?.()
        },
      },
      message: {},
    } as unknown as Parameters<typeof bindAntdAppApi>[0])
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    vi.mocked(listSalesContracts).mockResolvedValue({
      content: contractRows as never,
      totalElements: 5,
      totalPages: 1,
      currentPage: 0,
      pageSize: 10,
      hasMore: false,
    })
    vi.mocked(fetchCustomerOptions).mockResolvedValue([])
    vi.mocked(fetchProjectOptions).mockResolvedValue([])
    vi.mocked(updateSalesContractStatus).mockResolvedValue(
      contractRows[0] as never,
    )
    vi.mocked(deleteSalesContract).mockResolvedValue(undefined)
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
          createElement(SalesContractPage),
        ),
      )
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

  const selectRow = async (index: number) => {
    const rows = container.querySelectorAll('.ant-table-row')
    await act(async () => {
      rows[index]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const toolbarLabels = () =>
    [...container.querySelectorAll('button')].map((button) =>
      button.textContent?.replace(/\s/g, ''),
    )

  it('渲染合同列表与五种状态', async () => {
    renderPage()
    await flushAsync()

    expect(container.textContent).toContain('HT-001')
    expect(container.textContent).toContain('年度销售合同')
    expect(container.textContent).toContain('客户甲')
    for (const status of ['草稿', '审核', '签发', '归档', '作废']) {
      expect(container.textContent).toContain(status)
    }
  })

  it('选中草稿后可审核，调用状态接口', async () => {
    renderPage()
    await flushAsync()

    await selectRow(0)
    await clickButton('审核')

    expect(updateSalesContractStatus).toHaveBeenCalledWith(
      '9000000000000000001',
      '审核',
    )
  })

  it('选中审核记录只显示签发与作废', async () => {
    renderPage()
    await flushAsync()

    await selectRow(1)
    const labels = toolbarLabels()
    expect(labels).toContain('签发')
    expect(labels).toContain('作废')
    expect(labels).not.toContain('审核')
    expect(labels).not.toContain('回草稿')
  })

  it('选中签发记录只显示归档，不提供作废', async () => {
    renderPage()
    await flushAsync()

    await selectRow(2)
    const labels = toolbarLabels()
    expect(labels).toContain('归档')
    expect(labels).not.toContain('作废')
  })

  it('选中归档记录可作废', async () => {
    renderPage()
    await flushAsync()

    await selectRow(3)
    const labels = toolbarLabels()
    expect(labels).toContain('作废')

    await clickButton('作废')
    expect(updateSalesContractStatus).toHaveBeenCalledWith(
      '9000000000000000004',
      '作废',
    )
  })

  it('作废记录为只读，无状态动作', async () => {
    renderPage()
    await flushAsync()

    await selectRow(4)
    const labels = toolbarLabels()
    expect(labels).not.toContain('审核')
    expect(labels).not.toContain('签发')
    expect(labels).not.toContain('归档')
    expect(labels).not.toContain('作废')
    expect(labels).not.toContain('编辑')
  })
})
