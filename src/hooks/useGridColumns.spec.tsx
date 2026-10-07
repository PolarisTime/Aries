// @vitest-environment jsdom

import { EyeOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons'
import { act, createElement, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  DETAIL_TOGGLE_COLUMN_ID,
  type DetailToggleVariant,
  useGridColumns,
} from './useGridColumns'

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

type Columns = ReturnType<typeof useGridColumns>['columns']

interface ButtonProps {
  className?: string
  'aria-expanded'?: boolean
  'aria-label'?: string
  icon?: ReactElement
}

/** 取明细按钮列渲染出的 Button 元素（renderCell 返回 Tooltip, Button 在 children）。 */
function detailButton(columns: Columns, record: ModuleRecord): ButtonProps {
  const column = columns.find((item) => item.id === DETAIL_TOGGLE_COLUMN_ID)
  const tooltip = column?.meta?.renderCell?.(record) as ReactElement<{
    children: ReactElement<ButtonProps>
  }>
  return tooltip.props.children.props
}

function renderHook(props: {
  onOpenDetail?: (record: ModuleRecord) => void
  expandedRowKeys?: string[]
  variant?: DetailToggleVariant
}): { columns: Columns; unmount: () => void; container: HTMLDivElement } {
  const captured: { columns: Columns } = { columns: [] }
  function Probe() {
    const { columns } = useGridColumns({ config: CONFIG, ...props })
    captured.columns = columns
    return null
  }
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root: Root = createRoot(container)
  act(() => {
    root.render(createElement(Probe))
  })
  return {
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
    const collapsedButton = detailButton(collapsed.columns, record)
    expect(collapsedButton['aria-expanded']).toBe(false)
    expect(collapsedButton.icon?.type).toBe(PlusOutlined)
    expect(collapsedButton.className).not.toContain('is-active')

    const expanded = renderHook({
      onOpenDetail: () => undefined,
      variant: 'expand',
      expandedRowKeys: ['1'],
    })
    cleanups.push(expanded.unmount)
    const expandedButton = detailButton(expanded.columns, record)
    expect(expandedButton['aria-expanded']).toBe(true)
    expect(expandedButton.icon?.type).toBe(MinusOutlined)
    expect(expandedButton.className).toContain('is-active')
  })

  it('preview 形态（缺省）渲染眼睛图标且不含 aria-expanded', () => {
    const preview = renderHook({ onOpenDetail: () => undefined })
    cleanups.push(preview.unmount)
    const button = detailButton(preview.columns, record)
    expect(button.icon?.type).toBe(EyeOutlined)
    expect(button['aria-expanded']).toBeUndefined()
    expect(button.className).not.toContain('is-active')
  })
})
