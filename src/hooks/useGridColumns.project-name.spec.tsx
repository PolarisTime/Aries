// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { salesOrdersPageConfig } from '@/config/business-pages/operations/sales-order-page'
import type { ModulePageConfig } from '@/types/module-page'
import { useGridColumns } from './useGridColumns'

/**
 * 「项目名称」列的**真实渲染链路**: 页面配置的 `columns[].render` → `useGridColumns` 的
 * `meta.renderCell` → 单元格文本。
 *
 * <p>页面配置的单测只能证明"列引用了同一个格式化函数", 这里补上"网格确实按它出文本",
 * 避免以后 `renderCell` 分支被改动时四张列表静默退回只显示全称。</p>
 */
function captureGridColumns(config: ModulePageConfig) {
  let captured: ReturnType<typeof useGridColumns> | undefined
  function Probe() {
    captured = useGridColumns({ config })
    return null
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(Probe))
  })
  const result = captured as ReturnType<typeof useGridColumns>
  return {
    columns: result.columns,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
  }
}

describe('业务网格「项目名称」列渲染', () => {
  let unmounts: Array<() => void>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    unmounts = []
  })

  afterEach(() => {
    for (const unmount of unmounts) {
      unmount()
    }
  })

  it('销售订单列表的项目列渲染「简称（全称）」', () => {
    const grid = captureGridColumns(salesOrdersPageConfig)
    unmounts.push(grid.unmount)
    const renderCell = grid.columns.find(
      (column) => column.id === 'projectName',
    )?.meta?.renderCell

    expect(typeof renderCell).toBe('function')
    expect(
      renderCell?.({
        id: '1',
        projectNameAbbr: '东钢',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('东钢（广东东钢供应链有限公司）')
    // 后端未返回简称（字段未上线）时退化为全称。
    expect(
      renderCell?.({
        id: '1',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('广东东钢供应链有限公司')
    expect(renderCell?.({ id: '1' })).toBe('-')
  })
})
