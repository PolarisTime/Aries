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

  return {
    Button: ({ children }: { children?: ReactNode }) =>
      createElement('button', { type: 'button' }, children),
    Form,
    Input: () => createElement('input'),
    Radio,
    Space: ({ children }: { children?: ReactNode }) =>
      createElement('div', null, children),
  }
})

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

vi.mock('@/views/modules/components/ModuleQuickDateFilter', () => ({
  ModuleQuickDateFilter: () => null,
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

  it('从单选事件中提取关联筛选值后再提交', () => {
    const onApplyFilters = vi.fn()
    const config = {
      filters: [
        {
          key: 'referenced',
          label: '是否被关联',
          type: 'segmented',
          options: [
            { label: '已关联', value: 'true' },
            { label: '未关联', value: 'false' },
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
    ).find((button) => button.textContent === '已关联')

    act(() => referencedButton?.click())

    expect(onApplyFilters).toHaveBeenLastCalledWith({ referenced: 'true' })
  })

  it('从单选事件中提取快捷筛选值后再匹配预设', () => {
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
})
