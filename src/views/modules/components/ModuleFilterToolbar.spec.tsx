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
    Button: ({ children }: { children?: ReactNode }) =>
      createElement('button', { type: 'button' }, children),
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
})
