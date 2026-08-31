// @vitest-environment jsdom

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDeferredColumns } from '@/hooks/useDeferredColumns'
import { ModuleItemsTable } from '@/views/modules/components/ModuleItemsTable'

const tablePropsSpy = vi.hoisted(() => vi.fn())

vi.mock('antd', () => ({
  Table: (props: Record<string, unknown>) => {
    tablePropsSpy(props)
    return createElement('div', { 'data-testid': 'table' })
  },
}))

describe('表格首帧布局稳定性', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    tablePropsSpy.mockReset()
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

  it('首帧直接提供完整列集合', () => {
    const columns = Array.from({ length: 8 }, (_, index) => ({
      key: `column-${index}`,
      dataIndex: `column-${index}`,
      title: `列 ${index + 1}`,
    }))
    let renderedColumnCount = 0

    function Probe() {
      renderedColumnCount = useDeferredColumns(columns).length
      return null
    }

    act(() => root.render(createElement(Probe)))

    expect(renderedColumnCount).toBe(columns.length)
  })

  it('明细表始终使用按列宽计算的稳定横向滚动配置', () => {
    const columns = [
      { key: 'name', dataIndex: 'name', title: '名称', width: 160 },
      { key: 'quantity', dataIndex: 'quantity', title: '数量', width: 120 },
    ]

    act(() => {
      root.render(
        createElement(ModuleItemsTable, {
          columns,
          dataSource: [{ id: '1' }],
          emptyText: '暂无数据' as ReactNode,
        }),
      )
    })

    expect(tablePropsSpy).toHaveBeenCalled()
    expect(tablePropsSpy.mock.lastCall?.[0]).toMatchObject({
      scroll: { x: 280 },
    })
  })
})
