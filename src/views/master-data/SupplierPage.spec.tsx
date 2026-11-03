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
import { SupplierPage } from './SupplierPage'
import { buildSupplierSpec } from './supplier-page-spec'

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

/* 品牌规格配置的两次取数都 mock 掉：单测不连真实后端（接口由后端并行实现中）。 */
const { saveSupplierBrandSpecsMock } = vi.hoisted(() => ({
  saveSupplierBrandSpecsMock: vi.fn(),
}))
vi.mock('@/api/master/supplier-brand-specs', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/api/master/supplier-brand-specs')>()
  return {
    ...actual,
    fetchSupplierBrandSpecs: vi.fn(() => Promise.resolve([])),
    saveSupplierBrandSpecs: saveSupplierBrandSpecsMock,
  }
})
vi.mock('@/api/market/supplier-price-lists', () => ({
  fetchSpecRows: vi.fn(() => Promise.resolve([])),
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
    // 经营品牌改为「标签 + 选择品牌按钮」的表格穿梭框入口
    expect(document.body.querySelector('.master-transfer-field')).not.toBeNull()
    expect(document.body.textContent).toContain('选择品牌')
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

  it('表单提供经营品牌穿梭框字段（不再用多选下拉）', () => {
    const field = spec.formFields.find((item) => item.key === 'brands')
    expect(field?.type).toBe('transfer')
    expect(field?.options).toEqual(brandOptions)
  })

  it('基本信息按四列栅格排布：城市在状态前，经营品牌三列宽（不再整行撑满）', () => {
    const basic = spec.formFields.filter(
      (field) => field.section === i18n.t('modules.formSections.basic'),
    )
    expect(basic.map((field) => field.key)).toEqual([
      'supplierCode',
      'supplierName',
      'shortName',
      'city',
      'status',
      'brands',
      'brandSpecs',
    ])
    const brands = basic.find((field) => field.key === 'brands')
    expect(brands?.span).toBe(18)
    expect(brands?.fullRow).toBeUndefined()
    // 品牌规格配置整行：每个经营品牌一行（名称 + 状态 + 配置按钮），需要横向空间
    const brandSpecs = basic.find((field) => field.key === 'brandSpecs')
    expect(brandSpecs?.span).toBe(24)
    expect(brandSpecs?.render).toBeTypeOf('function')
    // 其余普通字段保持四等分（span 缺省 = 6），保证各区块竖边对齐
    expect(
      basic
        .filter((field) => field.key !== 'brands' && field.key !== 'brandSpecs')
        .every((field) => field.span === undefined),
    ).toBe(true)
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

describe('buildSupplierSpec 品牌规格配置', () => {
  const spec = buildSupplierSpec(i18n.getFixedT('zh-CN'), [])

  const brandSpecItem = (
    overrides: Partial<{ brandName: string; spec: number }> = {},
  ) => ({
    brandName: '萍钢',
    category: '直条',
    material: 'HRB400E',
    spec: 12,
    length: '9米',
    ...overrides,
  })

  beforeEach(() => {
    saveSupplierBrandSpecsMock.mockReset()
    saveSupplierBrandSpecsMock.mockResolvedValue([])
  })

  it('回填：编辑态是「未知」（undefined），新建态是「确定没有显式配置」（[]）', () => {
    // 编辑态若回填 []，保存时会用空数组把服务端配置整集替换掉
    expect(spec.buildValues({ id: '1' }).brandSpecs).toBeUndefined()
    expect(spec.buildValues(null).brandSpecs).toEqual([])
  })

  it('供应商记录里不带 brandSpecs（它有自己的端点，不混进模块保存载荷）', () => {
    const record = spec.buildRecord({ supplierName: '沙钢' }, null)

    expect('brandSpecs' in record).toBe(false)
  })

  it('保存后把配置 PUT 到 /suppliers/{id}/brand-specs', async () => {
    await spec.afterSave?.({
      values: {
        brands: ['萍钢', '中天'],
        brandSpecs: [brandSpecItem({ spec: 14 }), brandSpecItem({ spec: 12 })],
      },
      saved: { id: '9001' },
    })

    expect(saveSupplierBrandSpecsMock).toHaveBeenCalledTimes(1)
    const [supplierId, items] = saveSupplierBrandSpecsMock.mock.calls[0]
    expect(supplierId).toBe('9001')
    expect(items.map((item: { spec: number }) => item.spec)).toEqual([12, 14])
  })

  it('只提交当前经营品牌范围内的组合（品牌被移除时不发它的旧配置）', async () => {
    await spec.afterSave?.({
      values: {
        brands: ['萍钢'],
        brandSpecs: [
          brandSpecItem(),
          brandSpecItem({ brandName: '永钢', spec: 16 }),
        ],
      },
      saved: { id: '9001' },
    })

    expect(
      saveSupplierBrandSpecsMock.mock.calls[0][1].map(
        (item: { brandName: string }) => item.brandName,
      ),
    ).toEqual(['萍钢'])
  })

  it('配置没读到（undefined）时跳过 PUT，绝不用空数组覆盖服务端配置', async () => {
    await spec.afterSave?.({
      values: { brands: ['萍钢'], brandSpecs: undefined },
      saved: { id: '9001' },
    })

    expect(saveSupplierBrandSpecsMock).not.toHaveBeenCalled()
  })

  it('全部取消勾选（[]）时提交空数组 = 清空配置', async () => {
    await spec.afterSave?.({
      values: { brands: ['萍钢'], brandSpecs: [] },
      saved: { id: '9001' },
    })

    expect(saveSupplierBrandSpecsMock.mock.calls[0][1]).toEqual([])
  })

  it('配置保存失败时抛出「供应商已保存但配置没存上」的明确错误', async () => {
    saveSupplierBrandSpecsMock.mockRejectedValue(new Error('422'))

    await expect(
      spec.afterSave?.({
        values: { brands: ['萍钢'], brandSpecs: [brandSpecItem()] },
        saved: { id: '9001' },
      }),
    ).rejects.toThrow(/供应商已保存/)
  })
})
