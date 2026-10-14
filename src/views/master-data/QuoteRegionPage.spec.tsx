// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { QuoteRegionRecord } from '@/api/master/quote-regions'
import { QuoteRegionPage } from './QuoteRegionPage'

const {
  listQuoteRegionsMock,
  createQuoteRegionMock,
  updateQuoteRegionMock,
  deleteQuoteRegionMock,
} = vi.hoisted(() => ({
  listQuoteRegionsMock: vi.fn(),
  createQuoteRegionMock: vi.fn(),
  updateQuoteRegionMock: vi.fn(),
  deleteQuoteRegionMock: vi.fn(),
}))

vi.mock('@/api/master/quote-regions', async (importActual) => {
  const actual =
    await importActual<typeof import('@/api/master/quote-regions')>()
  return {
    ...actual,
    listQuoteRegions: listQuoteRegionsMock,
    createQuoteRegion: createQuoteRegionMock,
    updateQuoteRegion: updateQuoteRegionMock,
    deleteQuoteRegion: deleteQuoteRegionMock,
  }
})

vi.mock('@/hooks/useDefaultPageSize', () => ({
  useDefaultPageSize: () => 10,
}))

const EXISTING: QuoteRegionRecord = {
  id: '1234567890123456789',
  regionName: '杭州',
  slug: 'hangzhou',
  sortOrder: 1,
  status: '正常',
  remark: '原 yml 配置',
  createdAt: '2026-01-02T03:04:05',
  updatedAt: '2026-01-03T04:05:06',
}

function pageOf(content: QuoteRegionRecord[], total = content.length) {
  return {
    content,
    totalElements: total,
    totalPages: Math.max(1, Math.ceil(total / 10)),
    currentPage: 0,
    pageSize: 10,
    hasMore: false,
  }
}

/**
 * 本文件全是 jsdom + antd 渲染用例（每个 300~700ms）。整仓 296 个测试文件并行时
 * CPU 争用会把单个用例推到默认 5s 之上，超时后首屏没渲染出来，后续断言会连锁失败
 * 并伪装成功能缺陷。这里给足余量，不改变任何断言。
 */
vi.setConfig({ testTimeout: 20_000 })

describe('取价地区维护页', () => {
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

    listQuoteRegionsMock.mockResolvedValue(pageOf([EXISTING]))
    createQuoteRegionMock.mockResolvedValue(EXISTING)
    updateQuoteRegionMock.mockResolvedValue(EXISTING)
    deleteQuoteRegionMock.mockResolvedValue(undefined)
  })

  afterEach(async () => {
    act(() => root.unmount())
    container.remove()
    document.querySelectorAll('.ant-select-dropdown').forEach((node) => {
      node.remove()
    })
    document.querySelectorAll('.ant-popover').forEach((node) => {
      node.remove()
    })
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

  const renderPage = async () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(QuoteRegionPage),
        ),
      )
    })
    await flushAsync()
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
    await flushAsync()
  }

  const setTextValue = async (input: HTMLInputElement, value: string) => {
    const descriptor = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )
    await act(async () => {
      input.focus()
      descriptor?.set?.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const overlayInput = (fieldName: string) => {
    const input = document.body.querySelector<HTMLInputElement>(
      `.workspace-overlay input#${fieldName}`,
    )
    expect(input, `字段 ${fieldName} 的控件应存在`).toBeTruthy()
    return input as HTMLInputElement
  }

  /**
   * 按字段名 + 选项文案选中下拉项（不按下标，避免排版调整后静默选错字段）。
   */
  const chooseOverlaySelectOption = async (
    fieldName: string,
    optionLabel: string,
  ) => {
    const control = overlayInput(fieldName)
    const selectRoot = control.closest<HTMLElement>('.ant-select')
    expect(selectRoot, `字段 ${fieldName} 应是下拉控件`).toBeTruthy()
    await act(async () => {
      selectRoot!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const option = [
      ...document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ].find((node) => node.textContent?.trim() === optionLabel)
    expect(option, `下拉选项「${optionLabel}」应渲染`).toBeTruthy()
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()
  }

  const overlayText = () =>
    document.body.querySelector('.workspace-overlay')?.textContent ?? ''

  const openCreateDialog = async () => {
    await clickButton('新增')
    expect(overlayText(), '新增弹窗应打开').toContain('新增取价地区')
  }

  const openEditDialog = async () => {
    const editButton = [...container.querySelectorAll('button')].find(
      (button) => button.textContent?.replace(/\s/g, '') === '编辑',
    )
    expect(editButton, '行内编辑按钮应存在').toBeTruthy()
    await act(async () => {
      editButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()
    expect(overlayText(), '编辑弹窗应打开').toContain('编辑取价地区')
  }

  const fillRequiredFields = async (
    overrides: { regionName?: string; slug?: string } = {},
  ) => {
    await setTextValue(
      overlayInput('regionName'),
      overrides.regionName ?? '宁波',
    )
    await setTextValue(overlayInput('slug'), overrides.slug ?? 'ningbo')
    // 排序号是 InputNumber：输入合法数字会立刻回写表单值。
    await setTextValue(overlayInput('sortOrder'), '2')
  }

  it('加载列表并展示城市、子域名、排序号、状态与业务口径说明', async () => {
    await renderPage()

    expect(listQuoteRegionsMock).toHaveBeenCalledWith(
      { status: undefined, keyword: undefined, page: 0, size: 10 },
      expect.anything(),
    )
    expect(container.textContent).toContain('杭州')
    expect(container.textContent).toContain('hangzhou')
    expect(container.textContent).toContain('正常')
    expect(container.textContent).toContain('原 yml 配置')
    expect(container.textContent).toContain('子域名会直接拼进抓取主机名')
    expect(container.textContent).toContain('记录数：1')
  })

  it('新增弹窗必填校验给出中文提示', async () => {
    await renderPage()
    await openCreateDialog()

    await clickButton('保存', document.body)

    expect(overlayText()).toContain('请输入城市名称')
    expect(overlayText()).toContain('请输入子域名')
    expect(overlayText()).toContain('请输入排序号')
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('非法子域名即时提示字符集要求（不会静默折叠大小写）', async () => {
    await renderPage()
    await openCreateDialog()

    await fillRequiredFields({ regionName: '杭州', slug: 'Hangzhou' })
    await clickButton('保存', document.body)

    expect(overlayText()).toContain('子域名只能包含小写字母、数字与连字符')
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('超长城市名称即时提示 32 字符上限', async () => {
    await renderPage()
    await openCreateDialog()

    await fillRequiredFields({ regionName: 'a'.repeat(33) })
    await clickButton('保存', document.body)

    expect(overlayText()).toContain('城市名称不能超过32个字符')
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('城市名重复即时提示（不依赖后端 422）', async () => {
    await renderPage()
    await openCreateDialog()

    await fillRequiredFields({ regionName: '杭州' })
    await clickButton('保存', document.body)

    expect(overlayText()).toContain(
      '城市「杭州」已存在取价地区，请改为编辑既有记录',
    )
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('子域名重复即时提示（不依赖后端 422）', async () => {
    await renderPage()
    await openCreateDialog()

    await fillRequiredFields({ slug: 'hangzhou', regionName: '宁波' })
    await clickButton('保存', document.body)

    expect(overlayText()).toContain(
      '子域名「hangzhou」已被其他城市占用，请改为编辑既有记录',
    )
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('新增成功后提交 trim 过的载荷并刷新列表', async () => {
    await renderPage()
    await openCreateDialog()

    await setTextValue(overlayInput('regionName'), ' 宁波 ')
    await setTextValue(overlayInput('slug'), ' ningbo ')
    await setTextValue(overlayInput('sortOrder'), '2')
    await setTextValue(overlayInput('remark'), '   ')
    await clickButton('保存', document.body)

    expect(createQuoteRegionMock).toHaveBeenCalledWith({
      regionName: '宁波',
      slug: 'ningbo',
      sortOrder: 2,
      status: '正常',
    })
    // 弹窗关闭 + 列表重新拉取
    expect(document.body.querySelector('.workspace-overlay')).toBeNull()
    expect(listQuoteRegionsMock.mock.calls.length).toBeGreaterThan(1)
  })

  it('排序号留空时不可保存（后端 @NotNull，弹窗内即时提示）', async () => {
    await renderPage()
    await openCreateDialog()

    await setTextValue(overlayInput('regionName'), '宁波')
    await setTextValue(overlayInput('slug'), 'ningbo')
    await clickButton('保存', document.body)

    expect(overlayText()).toContain('请输入排序号')
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('编辑回填后按原雪花 ID 字符串提交更新（状态可改「禁用」）', async () => {
    await renderPage()
    await openEditDialog()

    expect(overlayInput('regionName').value).toBe('杭州')
    expect(overlayInput('slug').value).toBe('hangzhou')
    expect(overlayInput('sortOrder').value).toBe('1')

    await chooseOverlaySelectOption('status', '禁用')
    await setTextValue(overlayInput('sortOrder'), '3')
    await clickButton('保存', document.body)

    expect(updateQuoteRegionMock).toHaveBeenCalledWith('1234567890123456789', {
      regionName: '杭州',
      slug: 'hangzhou',
      sortOrder: 3,
      status: '禁用',
      // 编辑时未改动的备注原样保留。
      remark: '原 yml 配置',
    })
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })

  it('编辑自身不会误报城市名/子域名重复', async () => {
    await renderPage()
    await openEditDialog()

    await clickButton('保存', document.body)

    expect(overlayText()).not.toContain('已存在取价地区')
    expect(updateQuoteRegionMock).toHaveBeenCalledTimes(1)
  })

  it('删除有二次确认，取消不发请求，确认后按 ID 删除', async () => {
    await renderPage()

    await clickButton('删除')

    const confirmText = document.body.textContent ?? ''
    expect(confirmText).toContain('确定删除取价地区「杭州」吗？')
    await clickButton('取消', document.body)
    expect(deleteQuoteRegionMock).not.toHaveBeenCalled()

    await clickButton('删除')
    await clickButton('确定', document.body)
    expect(deleteQuoteRegionMock).toHaveBeenCalledWith('1234567890123456789')
  })

  it('按状态筛选时把状态透传给后端', async () => {
    await renderPage()

    const statusFilter = container.querySelector<HTMLElement>(
      '.module-grid-filter-region .ant-select',
    )
    expect(statusFilter, '状态筛选下拉应存在').toBeTruthy()
    await act(async () => {
      statusFilter!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const option = [
      ...document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ].find((node) => node.textContent?.trim() === '禁用')
    expect(option, '状态选项「禁用」应存在').toBeTruthy()
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('搜索')

    expect(listQuoteRegionsMock).toHaveBeenCalledWith(
      expect.objectContaining({ status: '禁用', page: 0 }),
      expect.anything(),
    )
  })

  it('翻页时把 UI 页码换算成 0 基 page 参数', async () => {
    listQuoteRegionsMock.mockResolvedValue(pageOf([EXISTING], 25))
    await renderPage()

    const secondPage = container.querySelector<HTMLElement>(
      '.ant-pagination-item-2',
    )
    expect(secondPage, '第二页按钮应存在').toBeTruthy()
    await act(async () => {
      secondPage!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(listQuoteRegionsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, size: 10 }),
      expect.anything(),
    )
  })

  it('加载失败时给出错误提示与重试入口', async () => {
    listQuoteRegionsMock.mockRejectedValue(new Error('取价地区加载失败'))
    await renderPage()

    expect(container.textContent).toContain('取价地区加载失败')
    expect(
      [...container.querySelectorAll('button')].some(
        (button) => button.textContent?.replace(/\s/g, '') === '重试',
      ),
    ).toBe(true)
  })

  it('筛选控件有可访问名，刷新按钮有 aria-label（WCAG 4.1.2）', async () => {
    await renderPage()

    const keywordInput = container.querySelector<HTMLInputElement>(
      '.module-grid-filter-region input',
    )
    expect(keywordInput?.getAttribute('aria-label')).toBe(
      '搜索城市名称、子域名或备注',
    )

    const statusCombobox = container.querySelector<HTMLInputElement>(
      '.module-grid-filter-region .ant-select input',
    )
    expect(statusCombobox?.getAttribute('aria-label')).toBe('状态')

    const refreshButton = container.querySelector<HTMLButtonElement>(
      '.module-table-refresh-button',
    )
    expect(refreshButton?.getAttribute('aria-label')).toBe('刷新')
  })

  it('弹窗字段有可访问名（label 关联控件）', async () => {
    await renderPage()
    await openCreateDialog()

    for (const field of [
      'regionName',
      'slug',
      'sortOrder',
      'status',
      'remark',
    ]) {
      const control = overlayInput(field)
      const formItem = control.closest('.ant-form-item')
      const label = formItem?.querySelector('label')
      expect(
        label?.getAttribute('for'),
        `字段 ${field} 的 label 应关联控件`,
      ).toBe(field)
      expect(
        label?.textContent?.trim(),
        `字段 ${field} 应有可访问名`,
      ).toBeTruthy()
    }
  })

  /**
   * 焦点进弹窗、Tab 焦点圈定、关闭后焦点归还由 `WorkspaceOverlay` + `useFocusTrap`
   * 提供（`src/hooks/useFocusTrap.spec.tsx` 已逐条覆盖）。这里只验收本页组合出来的
   * 对话框语义与 Escape 关闭路径 —— 弹层焦点契约不该在业务页重复实现。
   */
  it('弹窗是带可访问名的模态对话框，Escape 可关闭（ARIA APG）', async () => {
    await renderPage()
    await openCreateDialog()

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog, '弹窗应有 role="dialog"').toBeTruthy()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')

    const labelledBy = dialog?.getAttribute('aria-labelledby')
    expect(labelledBy, '对话框应由标题提供可访问名').toBeTruthy()
    expect(document.getElementById(labelledBy!)?.textContent).toBe(
      '新增取价地区',
    )
    expect(
      document
        .querySelector('.workspace-overlay-close')
        ?.getAttribute('aria-label'),
    ).toBe('关闭工作区')

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flushAsync()

    expect(document.body.querySelector('.workspace-overlay')).toBeNull()
    expect(createQuoteRegionMock).not.toHaveBeenCalled()
  })
})
