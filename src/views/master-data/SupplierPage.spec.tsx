// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { saveBusinessModule } from '@/api/business/business-crud'
import { listBusinessModule } from '@/api/business/business-listing'
import { bindAntdAppApi } from '@/utils/antd-app'
import type { MasterOption } from './master-data-types'
import { buildSupplierSpec, SupplierPage } from './SupplierPage'

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
    shortName: '河钢',
    brands: ['中天', '永钢'],
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
    shortName: '沙钢',
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
    expect(container.textContent).toContain('河钢')
    expect(container.textContent).toContain('SUP0002')
    expect(container.textContent).toContain('江苏沙钢物资')
    expect(container.textContent).toContain('沙钢')
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

  it('编辑抽屉展示供应商简称字段并可回填与保存', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    const row = [...container.querySelectorAll('tr')].find((element) =>
      element.textContent?.includes('河北钢铁贸易'),
    )
    expect(row, '供应商数据行应存在').toBeTruthy()
    await act(async () => {
      row!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(document.body.textContent).toContain('供应商简称')
    const shortNameInput = [
      ...document.querySelectorAll<HTMLInputElement>('input'),
    ].find((input) => input.value === '河钢')
    expect(shortNameInput, '简称输入框应回填河钢').toBeTruthy()

    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )
    await act(async () => {
      descriptor?.set?.call(shortNameInput, '河钢集团')
      shortNameInput!.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    const saveButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === '保存',
    )
    expect(saveButton, '保存按钮应存在').toBeTruthy()
    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(vi.mocked(saveBusinessModule)).toHaveBeenCalledWith(
      'supplier',
      expect.objectContaining({ shortName: '河钢集团' }),
    )
  })

  it('新增抽屉展示经营品牌多选控件', async () => {
    renderPage()
    await flushAsync()

    const createButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === '新增',
    )
    await act(async () => {
      createButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(document.body.textContent).toContain('经营品牌')
    expect(document.body.querySelector('.ant-select-multiple')).not.toBeNull()
  })

  it('编辑抽屉回填经营品牌并在保存时携带 brands', async () => {
    vi.mocked(saveBusinessModule).mockResolvedValue({ id: '9001' })
    renderPage()
    await flushAsync()

    const row = [...container.querySelectorAll('tr')].find((element) =>
      element.textContent?.includes('河北钢铁贸易'),
    )
    await act(async () => {
      row!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(document.body.textContent).toContain('经营品牌')
    expect(document.body.textContent).toContain('中天')
    expect(document.body.textContent).toContain('永钢')

    const saveButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === '保存',
    )
    await act(async () => {
      saveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(vi.mocked(saveBusinessModule)).toHaveBeenCalledWith(
      'supplier',
      expect.objectContaining({ brands: ['中天', '永钢'] }),
    )
  })
})

describe('buildSupplierSpec 经营品牌', () => {
  const brandOptions: MasterOption[] = [
    { label: '中天', value: '中天' },
    { label: '永钢', value: '永钢' },
  ]
  const spec = buildSupplierSpec(i18n.getFixedT('zh-CN'), brandOptions)

  it('表单提供经营品牌多选字段', () => {
    const field = spec.formFields.find((item) => item.key === 'brands')
    expect(field?.type).toBe('select')
    expect(field?.multiple).toBe(true)
    expect(field?.options).toEqual(brandOptions)
  })

  it('保存 payload 携带 brands, 缺省为空数组', () => {
    expect(
      spec.buildRecord({ supplierName: '沙钢', brands: ['中天'] }, null).brands,
    ).toEqual(['中天'])
    expect(spec.buildRecord({ supplierName: '河钢' }, null).brands).toEqual([])
  })

  it('回填时读取 brands 并去除空白', () => {
    expect(spec.buildValues({ id: '1', brands: ['中天', ' '] }).brands).toEqual(
      ['中天'],
    )
    expect(spec.buildValues({ id: '2' }).brands).toEqual([])
  })
})
