// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ValueAliasRecord } from '@/api/master/value-aliases'
import { ValueAliasPage } from './ValueAliasPage'

const {
  listValueAliasesMock,
  createValueAliasMock,
  updateValueAliasMock,
  deleteValueAliasMock,
} = vi.hoisted(() => ({
  listValueAliasesMock: vi.fn(),
  createValueAliasMock: vi.fn(),
  updateValueAliasMock: vi.fn(),
  deleteValueAliasMock: vi.fn(),
}))

vi.mock('@/api/master/value-aliases', async (importActual) => {
  const actual =
    await importActual<typeof import('@/api/master/value-aliases')>()
  return {
    ...actual,
    listValueAliases: listValueAliasesMock,
    createValueAlias: createValueAliasMock,
    updateValueAlias: updateValueAliasMock,
    deleteValueAlias: deleteValueAliasMock,
  }
})

vi.mock('@/hooks/useDefaultPageSize', () => ({
  useDefaultPageSize: () => 10,
}))

const EXISTING: ValueAliasRecord = {
  id: '1234567890123456789',
  dimension: 'BRAND',
  sourceValue: '万泰',
  targetValue: '浙江万泰',
  remark: '品牌别名',
  createdAt: '2026-01-02T03:04:05',
  updatedAt: '2026-01-03T04:05:06',
}

function pageOf(content: ValueAliasRecord[]) {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
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

describe('值映射维护页', () => {
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

    listValueAliasesMock.mockResolvedValue(pageOf([EXISTING]))
    createValueAliasMock.mockResolvedValue(EXISTING)
    updateValueAliasMock.mockResolvedValue(EXISTING)
    deleteValueAliasMock.mockResolvedValue(undefined)
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
          createElement(ValueAliasPage),
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
      ...document.querySelectorAll<HTMLElement>(
        '.ant-select-item-option, [role="option"]',
      ),
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
    expect(overlayText(), '新增弹窗应打开').toContain('新增值映射')
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
    expect(overlayText(), '编辑弹窗应打开').toContain('编辑值映射')
  }

  it('加载列表并展示维度、源写法、目标写法与业务口径说明', async () => {
    await renderPage()

    expect(listValueAliasesMock).toHaveBeenCalledWith(
      { dimension: undefined, keyword: undefined, page: 0, size: 10 },
      expect.anything(),
    )
    expect(container.textContent).toContain('品牌')
    expect(container.textContent).toContain('万泰')
    expect(container.textContent).toContain('浙江万泰')
    expect(container.textContent).toContain('品牌别名')
    expect(container.textContent).toContain('只做同义归一，不做跨语义合并')
    expect(container.textContent).toContain('记录数：1')
  })

  it('新增弹窗必填校验给出中文提示', async () => {
    await renderPage()
    await openCreateDialog()

    await clickButton('保存', document.body)

    expect(overlayText()).toContain('请选择维度')
    expect(overlayText()).toContain('请输入源写法')
    expect(overlayText()).toContain('请输入目标写法')
    expect(createValueAliasMock).not.toHaveBeenCalled()
  })

  it('超长源写法即时提示 64 字符上限', async () => {
    await renderPage()
    await openCreateDialog()

    await chooseOverlaySelectOption('dimension', '材质')
    await setTextValue(overlayInput('sourceValue'), 'a'.repeat(65))
    await clickButton('保存', document.body)

    expect(overlayText()).toContain('源写法不能超过64个字符')
    expect(createValueAliasMock).not.toHaveBeenCalled()
  })

  it('自映射即时提示语义错误', async () => {
    await renderPage()
    await openCreateDialog()

    await chooseOverlaySelectOption('dimension', '材质')
    await setTextValue(overlayInput('sourceValue'), '万泰')
    await setTextValue(overlayInput('targetValue'), '万泰')
    await clickButton('保存', document.body)

    expect(overlayText()).toContain('源写法与目标写法相同，自映射没有意义')
    expect(createValueAliasMock).not.toHaveBeenCalled()
  })

  it('同维度源写法重复即时提示（不依赖后端 422）', async () => {
    await renderPage()
    await openCreateDialog()

    await chooseOverlaySelectOption('dimension', '品牌')
    await setTextValue(overlayInput('sourceValue'), '万泰')
    await clickButton('保存', document.body)

    expect(overlayText()).toContain(
      '该维度下源写法「万泰」已存在映射，请改为编辑既有记录',
    )
    expect(createValueAliasMock).not.toHaveBeenCalled()
  })

  it('新增成功后提交 trim 过的载荷并刷新列表', async () => {
    await renderPage()
    await openCreateDialog()

    await chooseOverlaySelectOption('dimension', '类别')
    await setTextValue(overlayInput('sourceValue'), ' 沙钢 ')
    await setTextValue(overlayInput('targetValue'), ' 江苏沙钢 ')
    await setTextValue(overlayInput('remark'), '   ')
    await clickButton('保存', document.body)

    expect(createValueAliasMock).toHaveBeenCalledWith({
      dimension: 'CATEGORY',
      sourceValue: '沙钢',
      targetValue: '江苏沙钢',
    })
    // 弹窗关闭 + 列表重新拉取
    expect(document.body.querySelector('.workspace-overlay')).toBeNull()
    expect(listValueAliasesMock.mock.calls.length).toBeGreaterThan(1)
  })

  it('编辑回填后按原雪花 ID 字符串提交更新', async () => {
    await renderPage()
    await openEditDialog()

    expect(overlayInput('sourceValue').value).toBe('万泰')
    expect(overlayInput('targetValue').value).toBe('浙江万泰')

    await setTextValue(overlayInput('targetValue'), '浙江万泰集团')
    await clickButton('保存', document.body)

    expect(updateValueAliasMock).toHaveBeenCalledWith('1234567890123456789', {
      dimension: 'BRAND',
      sourceValue: '万泰',
      targetValue: '浙江万泰集团',
      // 编辑时未改动的备注原样保留。
      remark: '品牌别名',
    })
    expect(createValueAliasMock).not.toHaveBeenCalled()
  })

  it('编辑自身不会误报源写法重复', async () => {
    await renderPage()
    await openEditDialog()

    await clickButton('保存', document.body)

    expect(overlayText()).not.toContain('已存在映射')
    expect(updateValueAliasMock).toHaveBeenCalledTimes(1)
  })

  it('删除有二次确认，取消不发请求，确认后按 ID 删除', async () => {
    await renderPage()

    await clickButton('删除')

    const confirmText = document.body.textContent ?? ''
    expect(confirmText).toContain('确定删除「万泰 → 浙江万泰」这条值映射吗？')
    await clickButton('取消', document.body)
    expect(deleteValueAliasMock).not.toHaveBeenCalled()

    await clickButton('删除')
    await clickButton('确定', document.body)
    expect(deleteValueAliasMock).toHaveBeenCalledWith('1234567890123456789')
  })

  it('按维度筛选时把维度透传给后端', async () => {
    await renderPage()

    const dimensionFilter = container.querySelector<HTMLElement>(
      '.module-grid-filter-region .ant-select',
    )
    expect(dimensionFilter, '维度筛选下拉应存在').toBeTruthy()
    await act(async () => {
      dimensionFilter!.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    const option = [
      ...document.querySelectorAll<HTMLElement>('.ant-select-item-option'),
    ].find((node) => node.textContent?.trim() === '品牌')
    expect(option, '维度选项「品牌」应存在').toBeTruthy()
    await act(async () => {
      option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await clickButton('搜索')

    expect(listValueAliasesMock).toHaveBeenCalledWith(
      expect.objectContaining({ dimension: 'BRAND', page: 0 }),
      expect.anything(),
    )
  })

  it('加载失败时给出错误提示与重试入口', async () => {
    listValueAliasesMock.mockRejectedValue(new Error('值映射加载失败'))
    await renderPage()

    expect(container.textContent).toContain('值映射加载失败')
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
      '搜索源写法、目标写法或备注',
    )

    const dimensionCombobox = container.querySelector<HTMLInputElement>(
      '.module-grid-filter-region .ant-select input',
    )
    expect(dimensionCombobox?.getAttribute('aria-label')).toBe('维度')

    const refreshButton = container.querySelector<HTMLButtonElement>(
      '.module-table-refresh-button',
    )
    expect(refreshButton?.getAttribute('aria-label')).toBe('刷新')
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
    expect(document.getElementById(labelledBy!)?.textContent).toBe('新增值映射')
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
    expect(createValueAliasMock).not.toHaveBeenCalled()
  })
})
