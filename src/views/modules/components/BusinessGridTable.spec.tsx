// @vitest-environment jsdom

import type { ColumnsType } from 'antd/es/table'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleRecord } from '@/types/module-page'
import { BusinessGridTable } from '@/views/modules/components/BusinessGridTable'

const columns: ColumnsType<ModuleRecord> = [
  { key: 'name', dataIndex: 'name', title: '名称', width: 160 },
]

const baseProps = {
  moduleKey: 'material',
  columns,
  dataSource: [] as ModuleRecord[],
  loading: false,
  currentPage: 1,
  pageSize: 20,
  rowClassName: () => '',
  onRowClick: vi.fn(),
  onRowDoubleClick: vi.fn(),
}

describe('BusinessGridTable 空状态集成', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
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
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  })

  const renderTable = (
    props: Partial<Parameters<typeof BusinessGridTable>[0]>,
  ) => {
    act(() => {
      root.render(createElement(BusinessGridTable, { ...baseProps, ...props }))
    })
  }

  it('数据为空且存在筛选时展示 no-result 与清空筛选入口', () => {
    const onResetFilters = vi.fn()
    renderTable({ emptyStateInput: { hasFilters: true, onResetFilters } })

    expect(
      document.querySelector('[data-testid="empty-state-no-result"]'),
    ).not.toBeNull()
    const resetButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="empty-state-secondary-action"]',
    )
    expect(resetButton).not.toBeNull()

    act(() => {
      resetButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })
    expect(onResetFilters).toHaveBeenCalledTimes(1)
  })

  it('数据为空且无筛选时可创建时展示 no-data 与创建入口', () => {
    const onCreate = vi.fn()
    renderTable({ emptyStateInput: { hasFilters: false, canCreate: true, onCreate } })

    expect(
      document.querySelector('[data-testid="empty-state-no-data"]'),
    ).not.toBeNull()
    const createButton = document.querySelector<HTMLButtonElement>(
      '[data-testid="empty-state-primary-action"]',
    )
    expect(createButton).not.toBeNull()

    act(() => {
      createButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('数据为空且不可创建时展示 no-data 但无创建入口', () => {
    renderTable({ emptyStateInput: { hasFilters: false, canCreate: false } })

    expect(
      document.querySelector('[data-testid="empty-state-no-data"]'),
    ).not.toBeNull()
    expect(
      document.querySelector('[data-testid="empty-state-primary-action"]'),
    ).toBeNull()
  })

  it('有数据时不渲染空状态', () => {
    renderTable({
      dataSource: [{ id: '1', name: '记录' }],
      emptyStateInput: {
        hasFilters: true,
        canCreate: true,
      },
    })

    expect(document.querySelector('[data-testid^="empty-state-"]')).toBeNull()
  })
})
