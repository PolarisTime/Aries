// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ModuleActionDefinition } from '@/types/module-page'
import { ModuleTableToolbar } from './ModuleTableToolbar'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('ModuleTableToolbar 工具栏动作按钮', () => {
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

  function render(actions: ModuleActionDefinition[]) {
    act(() => {
      root.render(
        createElement(ModuleTableToolbar, {
          canCreate: false,
          canExport: false,
          selectedCount: 2,
          loading: false,
          exporting: false,
          onCreate: () => {},
          onExport: () => {},
          onRefresh: () => {},
          toolbarActions: actions,
          onAction: () => {},
        }),
      )
    })
  }

  const buttonOf = (label: string) =>
    Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes(label),
    )

  it('普通动作按原样渲染按钮, 不额外包一层节点', () => {
    render([{ key: 'bulk_audit', label: '审 核', type: 'default' }])
    const button = buttonOf('审')
    expect(button).toBeDefined()
    expect(button?.disabled).toBe(false)
    expect(button?.parentElement?.className).not.toContain(
      'module-table-action-tooltip-target',
    )
  })

  it('带 tooltip 的置灰动作: 按钮禁用且外层包可悬停的说明节点', () => {
    render([
      {
        key: 'bulk_reverse_audit',
        label: '反 审 核',
        type: 'default',
        disabled: true,
        tooltip: '批量反审核仅支持选择 1 条记录，请只勾选一条后重试',
      },
    ])
    const button = buttonOf('反')
    expect(button).toBeDefined()
    // disabled 元素不派发 mouseenter, 必须靠外层 span 才能让 Tooltip 生效
    expect(button?.disabled).toBe(true)
    expect(button?.parentElement?.className).toContain(
      'module-table-action-tooltip-target',
    )
  })
})
