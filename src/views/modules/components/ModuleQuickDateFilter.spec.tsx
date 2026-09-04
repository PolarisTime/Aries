// @vitest-environment jsdom

import dayjs from 'dayjs'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('antd', () => ({
  Radio: {
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
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import type { ModuleFilterDefinition } from '@/types/module-page'
import { ModuleQuickDateFilter } from '@/views/modules/components/ModuleQuickDateFilter'

describe('ModuleQuickDateFilter', () => {
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

  it('从单选事件中提取快捷日期值后再提交日期范围', () => {
    const onCommitFilter = vi.fn()
    const field: ModuleFilterDefinition = {
      key: 'orderDate',
      label: '订单日期',
      type: 'dateRange',
    }

    act(() => {
      root.render(
        createElement(ModuleQuickDateFilter, {
          field,
          filters: {},
          datePresets: [
            {
              key: 'last7Days',
              label: '近7天',
              value: [dayjs('2026-08-28'), dayjs('2026-09-03')],
            },
          ],
          onCommitFilter,
        }),
      )
    })

    const presetButton = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === '近7天',
    )

    act(() => presetButton?.click())

    expect(onCommitFilter).toHaveBeenLastCalledWith('orderDate', [
      '2026-08-28',
      '2026-09-03',
    ])
  })
})
