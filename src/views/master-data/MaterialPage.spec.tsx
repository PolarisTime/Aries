// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { listBusinessModule } from '@/api/business/business-listing'
import { bindAntdAppApi } from '@/utils/antd-app'
import { buildMaterialFormFields, MaterialPage } from './MaterialPage'

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
vi.mock('@/api/master/materials', () => ({
  downloadMaterialImportTemplate: vi.fn(),
  importMaterialFile: vi.fn(),
}))
vi.mock('@/views/modules/components/ModuleAttachmentModal', () => ({
  ModuleAttachmentModal: () => null,
}))

describe('MaterialPage 专属页面导入入口', () => {
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
      data: { rows: [], total: 0 },
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
          createElement(MaterialPage),
        ),
      )
    })
  }

  it('工具栏渲染模板下载与导入入口', async () => {
    renderPage()
    await flushAsync()

    const buttons = [...container.querySelectorAll('button')].map((button) =>
      button.textContent?.replace(/\s/g, ''),
    )
    expect(buttons).toContain('下载模板')
    expect(buttons).toContain('导入')
  })
})

describe('商品表单附加费用字段可见性', () => {
  const fields = buildMaterialFormFields((key) => key, [])
  const byKey = new Map(fields.map((field) => [field.key, field]))
  const expense = { materialType: '附加费用' }
  const physical = { materialType: '实体商品' }

  it('附加费用保留名称、单位与单价必填，隐藏类别与物理属性', () => {
    expect(byKey.get('material')?.visibleWhen).toBeUndefined()
    expect(byKey.get('material')?.required).toBe(true)
    expect(byKey.get('unit')?.visibleWhen).toBeUndefined()
    expect(byKey.get('unitPrice')?.visibleWhen).toBeUndefined()

    expect(byKey.get('category')?.visibleWhen?.(expense)).toBe(false)
    expect(byKey.get('brand')?.visibleWhen?.(expense)).toBe(false)
    expect(byKey.get('spec')?.visibleWhen?.(expense)).toBe(false)
    expect(byKey.get('length')?.visibleWhen?.(expense)).toBe(false)
    expect(byKey.get('quantityUnit')?.visibleWhen?.(expense)).toBe(false)
    expect(byKey.get('pieceWeightTon')?.visibleWhen?.(expense)).toBe(false)
    expect(byKey.get('piecesPerBundle')?.visibleWhen?.(expense)).toBe(false)
  })

  it('实体商品显示类别与物理属性，未选类型时默认按实体展示', () => {
    expect(byKey.get('category')?.visibleWhen?.(physical)).toBe(true)
    expect(byKey.get('brand')?.visibleWhen?.(physical)).toBe(true)
    expect(byKey.get('category')?.visibleWhen?.({})).toBe(true)
  })
})
