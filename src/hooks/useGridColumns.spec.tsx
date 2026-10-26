// @vitest-environment jsdom

import { EyeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { type DetailToggleVariant, useGridColumns } from './useGridColumns'

const CONFIG = {
  key: 'purchase-order',
  title: '',
  kicker: '',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
} as unknown as ModulePageConfig

type GridColumnsResult = ReturnType<typeof useGridColumns>
type RenderDetailToggle = GridColumnsResult['renderRowDetailToggle']

interface ButtonProps {
  className?: string
  'aria-expanded'?: boolean
  'aria-label'?: string
  icon?: ReactElement
}

/** 取明细按钮渲染出的 Button 元素（renderRowDetailToggle 返回 Tooltip, Button 在 children）。 */
function detailButton(
  renderToggle: RenderDetailToggle,
  record: ModuleRecord,
): ButtonProps {
  const tooltip = renderToggle?.(record) as ReactElement<{
    children: ReactElement<ButtonProps>
  }>
  return tooltip.props.children.props
}

function renderHook(props: {
  onOpenDetail?: (record: ModuleRecord) => void
  expandedRowKeys?: string[]
  variant?: DetailToggleVariant
}): {
  renderRowDetailToggle: RenderDetailToggle
  columns: GridColumnsResult['columns']
  unmount: () => void
  container: HTMLDivElement
} {
  const captured: {
    renderRowDetailToggle: RenderDetailToggle
    columns: GridColumnsResult['columns']
  } = { renderRowDetailToggle: () => null, columns: [] }
  function Probe() {
    const result = useGridColumns({ config: CONFIG, ...props })
    captured.renderRowDetailToggle = result.renderRowDetailToggle
    captured.columns = result.columns
    return null
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(Probe))
  })
  return {
    renderRowDetailToggle: captured.renderRowDetailToggle,
    columns: captured.columns,
    unmount: () => {
      act(() => {
        root.unmount()
      })
      container.remove()
    },
    container,
  }
}

const record = { id: '1' } as ModuleRecord

describe('useGridColumns 明细按钮图标', () => {
  let cleanups: Array<() => void>

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    cleanups = []
  })

  afterEach(() => {
    for (const cleanup of cleanups) {
      cleanup()
    }
  })

  it('展开形态未展开渲染加号, 已展开渲染减号并标记 aria-expanded', () => {
    const collapsed = renderHook({
      onOpenDetail: () => undefined,
      variant: 'expand',
      expandedRowKeys: [],
    })
    cleanups.push(collapsed.unmount)
    const collapsedButton = detailButton(
      collapsed.renderRowDetailToggle,
      record,
    )
    expect(collapsedButton['aria-expanded']).toBe(false)
    expect(collapsedButton.icon?.type).toBe(PlusOutlined)
    expect(collapsedButton.className).toContain('table-detail-toggle-btn')
    expect(collapsedButton.className).not.toContain('is-active')

    const expanded = renderHook({
      onOpenDetail: () => undefined,
      variant: 'expand',
      expandedRowKeys: ['1'],
    })
    cleanups.push(expanded.unmount)
    const expandedButton = detailButton(expanded.renderRowDetailToggle, record)
    expect(expandedButton['aria-expanded']).toBe(true)
    expect(expandedButton.icon?.type).toBe(MinusOutlined)
    expect(expandedButton.className).toContain('is-active')
  })

  it('preview 形态（缺省）渲染眼睛图标且不含 aria-expanded', () => {
    const preview = renderHook({ onOpenDetail: () => undefined })
    cleanups.push(preview.unmount)
    const button = detailButton(preview.renderRowDetailToggle, record)
    expect(button.icon?.type).toBe(EyeOutlined)
    expect(button['aria-expanded']).toBeUndefined()
    expect(button.className).not.toContain('is-active')
  })

  it('没有 onOpenDetail 时不渲染明细按钮(渲染器存在但返回 null)', () => {
    const none = renderHook({})
    cleanups.push(none.unmount)
    expect(typeof none.renderRowDetailToggle).toBe('function')
    expect(none.renderRowDetailToggle(record)).toBeNull()
  })

  /*
   * 明细按钮已并入首位身份列（序号·勾选·加号·行菜单），本 hook 只留渲染口径：
   * 再单独产出 `detail-toggle` 列会让同一行出现两个加号、并白占 48px 横向预算。
   */
  it('不再单独产出明细列, 列集合只含业务数据列', () => {
    const hooked = renderHook({ onOpenDetail: () => undefined })
    cleanups.push(hooked.unmount)
    expect(hooked.columns).toHaveLength(0)
    expect(hooked.columns.some((column) => column.id === 'detail-toggle')).toBe(
      false,
    )
  })
})
