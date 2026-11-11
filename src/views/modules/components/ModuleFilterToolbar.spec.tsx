// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('antd', () => {
  const Form = Object.assign(
    ({ children }: { children?: ReactNode }) =>
      createElement('form', null, children),
    {
      Item: ({ children }: { children?: ReactNode }) =>
        createElement('div', null, children),
    },
  )
  const Radio = {
    Group: ({
      options = [],
      onChange,
    }: {
      options?: Array<{ label: string; value: string }>
      onChange?: (event: { target: { value: string } }) => void
    }) =>
      createElement(
        'div',
        null,
        options.map((option) =>
          createElement(
            'button',
            {
              key: option.value,
              type: 'button',
              onClick: () => onChange?.({ target: { value: option.value } }),
            },
            option.label,
          ),
        ),
      ),
  }
  const Popover = ({
    content,
    children,
  }: {
    content?: ReactNode
    children?: ReactNode
  }) => createElement('div', { className: 'mock-popover' }, children, content)

  return {
    /* 透传 props：折叠按钮的 className / aria-expanded 要能被断言到 */
    Button: ({
      children,
      ...rest
    }: { children?: ReactNode } & Record<string, unknown>) =>
      createElement('button', { type: 'button', ...rest }, children),
    Form,
    Input: () => createElement('input'),
    Popover,
    Radio,
    Select: () => createElement('select'),
  }
})

vi.mock('@ant-design/icons', () => ({
  DownOutlined: () => createElement('span'),
}))

vi.mock('@/hooks/useMasterOptions', () => ({
  resolveMasterOptionRequirements: () => ({}),
  useMasterOptions: () => ({ projects: [] }),
}))

vi.mock('@/module-system/presentation/module-action-icons', () => ({
  resolveModuleActionIcon: () => null,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@/views/modules/components/ModuleFilterField', () => ({
  ModuleFilterField: () => null,
}))

import type { ModulePageConfig } from '@/types/module-page'
import { ModuleFilterToolbar } from '@/views/modules/components/ModuleFilterToolbar'

describe('ModuleFilterToolbar', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
  })

  it('从分段筛选面板单选事件中提取关联筛选值后再提交', () => {
    const onApplyFilters = vi.fn()
    const config = {
      filters: [
        {
          key: 'referencedBy',
          label: '下游引用',
          type: 'segmented',
          options: [
            { label: '被物流单引用', value: 'freight-bill' },
            { label: '未被引用', value: 'none' },
          ],
        },
      ],
      quickFilters: [],
    } as unknown as ModulePageConfig

    act(() => {
      root.render(
        createElement(ModuleFilterToolbar, {
          config,
          filters: {},
          submittedFilters: {},
          onUpdateFilter: vi.fn(),
          onApplyFilters,
          onReset: vi.fn(),
        }),
      )
    })

    const referencedButton = Array.from(
      container.querySelectorAll('button'),
    ).find((button) => button.textContent === '被物流单引用')

    act(() => referencedButton?.click())

    expect(onApplyFilters).toHaveBeenLastCalledWith({
      referencedBy: 'freight-bill',
    })
  })

  it('从快捷筛选面板单选事件中匹配预设', () => {
    const onApplyFilters = vi.fn()
    const config = {
      filters: [],
      quickFilters: [
        {
          key: 'pending',
          label: '待处理',
          values: { pendingOnly: 'true' },
        },
      ],
    } as unknown as ModulePageConfig

    act(() => {
      root.render(
        createElement(ModuleFilterToolbar, {
          config,
          filters: {},
          submittedFilters: {},
          onUpdateFilter: vi.fn(),
          onApplyFilters,
          onReset: vi.fn(),
        }),
      )
    })

    const pendingButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '待处理',
    )

    act(() => pendingButton?.click())

    expect(onApplyFilters).toHaveBeenLastCalledWith({ pendingOnly: 'true' })
  })

  it('chip 按钮声明标签与当前筛选值的可访问名称', () => {
    const config = {
      filters: [
        {
          key: 'referencedBy',
          label: '下游引用',
          type: 'segmented',
          options: [
            { label: '被物流单引用', value: 'freight-bill' },
            { label: '未被引用', value: 'none' },
          ],
        },
      ],
      quickFilters: [],
    } as unknown as ModulePageConfig

    act(() => {
      root.render(
        createElement(ModuleFilterToolbar, {
          config,
          filters: { referencedBy: 'freight-bill' },
          submittedFilters: { referencedBy: 'freight-bill' },
          onUpdateFilter: vi.fn(),
          onApplyFilters: vi.fn(),
          onReset: vi.fn(),
        }),
      )
    })

    const chip = Array.from(container.querySelectorAll('button')).find(
      (button) => button.className.includes('module-filter-chip'),
    )
    expect(chip?.getAttribute('aria-label')).toBe('下游引用: 被物流单引用')
    expect(chip?.getAttribute('aria-haspopup')).toBe('listbox')
  })

  /*
   * 折叠：每行 4 个、默认 2 行（8 个），第 9 个起收进「展开更多」。
   *
   * 开发库里的模块都只有 ≤6 个条件，靠真实页面验证不到这条分支，
   * 所以在这里用 9 个输入条件直接压边界。
   */
  it('超过 8 个条件时折叠到 8 个, 展开后全部渲染', () => {
    // hideKeywordFilter：默认会额外渲染「关键词」条件，会干扰 8 / 9 的边界计数
    const config = {
      filters: Array.from({ length: 9 }, (_, index) => ({
        key: `field${index}`,
        label: `条件${index}`,
        type: 'input',
      })),
      quickFilters: [],
      hideKeywordFilter: true,
    } as unknown as ModulePageConfig

    act(() => {
      root.render(
        createElement(ModuleFilterToolbar, {
          config,
          filters: {},
          submittedFilters: {},
          onUpdateFilter: vi.fn(),
          onApplyFilters: vi.fn(),
          onReset: vi.fn(),
        }),
      )
    })

    const fields = () => container.querySelector('.module-filter-fields')
    expect(fields()?.children.length).toBe(8)

    const toggle = Array.from(container.querySelectorAll('button')).find(
      (button) => button.className.includes('module-filter-toggle-button'),
    )
    expect(toggle?.textContent).toBe('modules.filter.expandMore')
    expect(toggle?.getAttribute('aria-expanded')).toBe('false')

    act(() => toggle?.click())

    expect(fields()?.children.length).toBe(9)
    expect(toggle?.getAttribute('aria-expanded')).toBe('true')
    expect(toggle?.textContent).toBe('common.collapse')
  })

  /* 条件数不超过 8 个时不渲染折叠按钮，外观与改造前一致 */
  it('条件数未超限时展开按钮置灰且不带计数', () => {
    const config = {
      filters: Array.from({ length: 8 }, (_, index) => ({
        key: `field${index}`,
        label: `条件${index}`,
        type: 'input',
      })),
      quickFilters: [],
      hideKeywordFilter: true,
    } as unknown as ModulePageConfig

    act(() => {
      root.render(
        createElement(ModuleFilterToolbar, {
          config,
          filters: {},
          submittedFilters: {},
          onUpdateFilter: vi.fn(),
          onApplyFilters: vi.fn(),
          onReset: vi.fn(),
        }),
      )
    })

    /*
     * 8 个条件铺满两行：展开按钮默认显示（置灰，因为没有被折叠的条件），
     * 但它不会额外撑高卡片 —— 字段本身就占两行。
     */
    const toggle = container.querySelector(
      '.module-filter-toggle-button',
    ) as HTMLButtonElement | null
    expect(toggle).not.toBeNull()
    expect(toggle?.disabled).toBe(true)
    expect(toggle?.textContent).toBe('common.expand')
    expect(
      container.querySelector('.module-filter-fields')?.children.length,
    ).toBe(8)
  })

  /* 单行字段（≤4 个条件）不渲染展开按钮：否则会为它额外撑出一行空白 */
  it('条件只有一行时不渲染展开按钮', () => {
    const config = {
      filters: Array.from({ length: 4 }, (_, index) => ({
        key: `field${index}`,
        label: `条件${index}`,
        type: 'input',
      })),
      quickFilters: [],
      hideKeywordFilter: true,
    } as unknown as ModulePageConfig

    act(() => {
      root.render(
        createElement(ModuleFilterToolbar, {
          config,
          filters: {},
          submittedFilters: {},
          onUpdateFilter: vi.fn(),
          onApplyFilters: vi.fn(),
          onReset: vi.fn(),
        }),
      )
    })

    expect(container.querySelector('.module-filter-toggle-button')).toBeNull()
  })

  /*
   * 业务列表页把「重置」移到工具行右侧（与已选择/清除/刷新同组）：筛选区若还留一份，
   * 同一动作就有两个入口，且它会被 margin-left:auto 顶到整行最右端、左边一大片空白。
   * 选单器这类没有工具行的场景保持默认渲染。
   */
  it('showResetButton=false 时筛选区不再渲染重置, 缺省仍渲染', () => {
    const config = {
      filters: [],
      quickFilters: [],
    } as unknown as ModulePageConfig

    const hasResetButton = (showResetButton?: boolean) => {
      act(() => {
        root.render(
          createElement(ModuleFilterToolbar, {
            config,
            filters: {},
            submittedFilters: {},
            onUpdateFilter: vi.fn(),
            onApplyFilters: vi.fn(),
            onReset: vi.fn(),
            ...(showResetButton === undefined ? {} : { showResetButton }),
          }),
        )
      })
      return Array.from(container.querySelectorAll('button')).some(
        (button) => button.textContent === 'common.reset',
      )
    }

    expect(hasResetButton()).toBe(true)
    expect(hasResetButton(false)).toBe(false)
  })
})
