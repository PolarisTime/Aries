// @vitest-environment jsdom

import type { ColumnsType } from 'antd/es/table'
import { act, createElement, type HTMLAttributes } from 'react'
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
    renderTable({
      emptyStateInput: { hasFilters: false, canCreate: true, onCreate },
    })

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

  describe('虚拟滚动行菜单降级提示', () => {
    const rowContextMenus = new Map([
      [
        '1',
        {
          ariaLabel: '行操作',
          items: [],
          onClick: () => {},
        },
      ],
    ])
    const buildRows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: String(index + 1),
        name: `记录 ${index + 1}`,
      }))
    const hint = () =>
      document.querySelector('[data-testid="business-grid-virtual-mode-hint"]')

    it('99 行不进入虚拟模式, 不显示降级提示', () => {
      renderTable({
        dataSource: buildRows(99),
        rowContextMenus,
      })

      expect(hint()).toBeNull()
    })

    it('100 行仍是边界内, 不显示降级提示', () => {
      renderTable({
        dataSource: buildRows(100),
        rowContextMenus,
      })

      expect(hint()).toBeNull()
    })

    it('101 行进入虚拟模式, 显示行右键降级提示', () => {
      renderTable({
        dataSource: buildRows(101),
        rowContextMenus,
      })

      expect(hint()).not.toBeNull()
    })

    it('未配置行右键菜单时不显示降级提示', () => {
      renderTable({
        dataSource: buildRows(101),
      })

      expect(hint()).toBeNull()
    })

    it('展开行存在时不进入虚拟模式, 不显示降级提示', () => {
      renderTable({
        dataSource: buildRows(101),
        rowContextMenus,
        expandable: { expandedRowRender: () => null },
      })

      expect(hint()).toBeNull()
    })
  })

  /**
   * 虚拟滚动的真实降级行为: rc-table 的虚拟列表用 div 作行容器, 自定义行组件(挂行右键
   * 菜单的那个 `<tr>`)必须退掉, 否则非法嵌套会打乱虚拟布局。这里用探针行组件直接验证
   * 100/101 边界与 expandable 例外, 而不只看提示文案。
   */
  describe('虚拟模式下自定义行组件降级', () => {
    function ProbeRow(props: HTMLAttributes<HTMLTableRowElement>) {
      return <tr {...props} data-testid="grid-row-probe" />
    }
    const components = { body: { row: ProbeRow } }
    const buildRows = (count: number) =>
      Array.from({ length: count }, (_, index) => ({
        id: String(index + 1),
        name: `记录 ${index + 1}`,
      }))
    const probeRows = () =>
      document.querySelectorAll('[data-testid="grid-row-probe"]')

    it('100 行: 未进入虚拟模式, 自定义行组件参与渲染', () => {
      renderTable({ dataSource: buildRows(100), components })

      expect(document.querySelector('.ant-table-virtual')).toBeNull()
      expect(probeRows().length).toBeGreaterThan(0)
    })

    it('101 行: 进入虚拟模式并退掉自定义行组件(行右键菜单降级)', () => {
      renderTable({ dataSource: buildRows(101), components })

      expect(document.querySelector('.ant-table-virtual')).not.toBeNull()
      expect(probeRows()).toHaveLength(0)
    })

    it('101 行但存在展开行: 不进入虚拟模式, 行组件保留', () => {
      renderTable({
        dataSource: buildRows(101),
        components,
        expandable: { expandedRowRender: () => null },
      })

      expect(document.querySelector('.ant-table-virtual')).toBeNull()
      expect(probeRows().length).toBeGreaterThan(0)
    })
  })
})
