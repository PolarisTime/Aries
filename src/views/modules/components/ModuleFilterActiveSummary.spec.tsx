// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import {
  countActiveFilters,
  ModuleFilterActiveSummary,
} from '@/views/modules/components/ModuleFilterActiveSummary'

const DEFAULT_FILTERS = {
  orderDate: ['2026-07-18', '2026-10-18'],
  pendingOnly: 'true',
}

describe('countActiveFilters —— 筛选生效项数', () => {
  it('与默认值完全相同 => 0 项(默认日期范围不算用户筛选)', () => {
    expect(countActiveFilters(DEFAULT_FILTERS, DEFAULT_FILTERS)).toBe(0)
  })

  it('空值不算生效(空串 / undefined / null / 空数组)', () => {
    expect(
      countActiveFilters(
        {
          ...DEFAULT_FILTERS,
          keyword: '',
          status: undefined,
          moduleName: null,
          tagIds: [],
        },
        DEFAULT_FILTERS,
      ),
    ).toBe(0)
  })

  it('新增一个非默认条件 => 1 项', () => {
    expect(
      countActiveFilters(
        { ...DEFAULT_FILTERS, keyword: 'admin' },
        DEFAULT_FILTERS,
      ),
    ).toBe(1)
  })

  it('多条件累加, 且覆盖默认值时也算生效', () => {
    expect(
      countActiveFilters(
        {
          ...DEFAULT_FILTERS,
          keyword: 'admin',
          status: '待审核',
          pendingOnly: 'false',
        },
        DEFAULT_FILTERS,
      ),
    ).toBe(3)
  })

  it('日期范围被改动算 1 项(数组按值比较, 不按引用)', () => {
    expect(
      countActiveFilters(
        { ...DEFAULT_FILTERS, orderDate: ['2026-01-01', '2026-01-31'] },
        DEFAULT_FILTERS,
      ),
    ).toBe(1)
  })

  it('数组元素相同但引用不同时仍算未改动', () => {
    expect(
      countActiveFilters(
        {
          ...DEFAULT_FILTERS,
          orderDate: [...DEFAULT_FILTERS.orderDate],
        },
        DEFAULT_FILTERS,
      ),
    ).toBe(0)
  })
})

describe('ModuleFilterActiveSummary —— 可见提示', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
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

  function render(props: {
    submittedFilters: Record<string, unknown>
    defaultFilters: Record<string, unknown>
    onClear: () => void
  }) {
    act(() => {
      root.render(createElement(ModuleFilterActiveSummary, props))
    })
    return container.innerHTML
  }

  it('0 项时不渲染任何内容(不把默认筛选误报成用户筛选)', () => {
    expect(
      render({
        submittedFilters: DEFAULT_FILTERS,
        defaultFilters: DEFAULT_FILTERS,
        onClear: vi.fn(),
      }),
    ).toBe('')
  })

  it('有生效项时渲染「已筛选 N 项」与清空按钮', () => {
    const html = render({
      submittedFilters: {
        ...DEFAULT_FILTERS,
        keyword: 'admin',
        status: '待审核',
      },
      defaultFilters: DEFAULT_FILTERS,
      onClear: vi.fn(),
    })
    expect(container.textContent).toContain('已筛选 2 项')
    expect(container.textContent).toContain('清空筛选')
    // 提示是状态播报区, 读屏能感知筛选条件变化
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
  })

  it('点击「清空筛选」调用 onClear(与「重置」同一动作)', () => {
    const onClear = vi.fn()
    render({
      submittedFilters: { ...DEFAULT_FILTERS, keyword: 'admin' },
      defaultFilters: DEFAULT_FILTERS,
      onClear,
    })
    const button = [...container.querySelectorAll('button')].find((item) =>
      (item.textContent || '').includes('清空筛选'),
    )
    act(() => {
      button?.click()
    })
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('英文界面使用英文文案', async () => {
    await i18n.changeLanguage('en-US')
    render({
      submittedFilters: { ...DEFAULT_FILTERS, keyword: 'admin' },
      defaultFilters: DEFAULT_FILTERS,
      onClear: vi.fn(),
    })
    expect(container.textContent).toContain('1 filter(s) applied')
    expect(container.textContent).toContain('Clear filters')
  })
})
