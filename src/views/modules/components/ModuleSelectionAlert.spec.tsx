// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type {
  ModuleActionDefinition,
  ModuleOverviewItem,
} from '@/types/module-page'
import { ModuleSelectionAlert } from '@/views/modules/components/ModuleSelectionAlert'

const overviewItems: ModuleOverviewItem[] = [
  {
    label: '总重量',
    value: '40.727 吨',
    scope: '已选 1 项',
    scopeKey: 'selection',
  },
  {
    label: '总金额',
    value: '134163.28 元',
    scope: '已选 1 项',
    scopeKey: 'selection',
  },
]

const actions: ModuleActionDefinition[] = [
  { key: 'export_selected', label: '导出选中 1 条' },
  {
    key: 'bulk_reverse_audit',
    label: '反审核',
    disabled: true,
    tooltip: '批量反审核仅支持选择 1 条记录',
  },
]

describe('ModuleSelectionAlert —— 勾选状态横幅', () => {
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

  function render(props: Partial<Parameters<typeof ModuleSelectionAlert>[0]>) {
    act(() => {
      root.render(
        createElement(ModuleSelectionAlert, {
          selectedCount: 1,
          overviewItems,
          actions,
          onClear: () => {},
          ...props,
        }),
      )
    })
  }

  const alert = () =>
    container.querySelector<HTMLElement>('.module-selection-alert')
  const summary = () =>
    container.querySelector<HTMLElement>('.module-selection-alert-summary')

  it('没有勾选时整条不渲染(勾选态不占位)', () => {
    render({ selectedCount: 0 })
    expect(alert()).toBeNull()
  })

  it('勾选后横贯一条: 左侧数量与已选合计, 右侧批量动作与清除选择', () => {
    render({})
    const bar = alert()
    expect(bar).not.toBeNull()
    // 播报只挂在摘要上, 动作区不进 live region(否则每点一行就把一排按钮再播一遍)
    expect(summary()?.getAttribute('role')).toBe('status')
    expect(summary()?.getAttribute('aria-live')).toBe('polite')
    expect(bar?.getAttribute('role')).toBeNull()

    expect(
      summary()?.querySelector('.module-selection-alert-count')?.textContent,
    ).toBe('已选择 1 项')
    // 指标只渲染 label：value，不再重复口径文案（口径已由「已选择 1 项」表达）
    const metrics = Array.from(
      bar?.querySelectorAll('.module-selection-alert-metric') ?? [],
    ).map((item) => item.textContent)
    expect(metrics).toEqual(['总重量：40.727 吨', '总金额：134163.28 元'])

    const actionLabels = Array.from(
      bar?.querySelectorAll('.module-selection-alert-actions button') ?? [],
    ).map((button) => button.textContent?.trim())
    expect(actionLabels).toContain('导出选中 1 条')
    expect(actionLabels).toContain('反审核')
    expect(actionLabels).toContain('清除选择')
  })

  it('置灰的批量动作保留 tooltip 说明, 清除选择回调可用', () => {
    const onClear = vi.fn()
    render({ onClear })
    const disabled = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.module-selection-alert-actions button',
      ),
    ).find((button) => button.textContent?.includes('反审核'))
    expect(disabled?.disabled).toBe(true)
    // disabled 元素不派发 mouseenter, 必须靠外层 span 才能让 Tooltip 生效
    expect(
      disabled?.closest('.module-table-action-tooltip-target'),
    ).not.toBeNull()

    const clear = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.module-selection-alert-actions button',
      ),
    ).find((button) => button.textContent?.includes('清除选择'))
    act(() => {
      clear?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('批量动作点击透传动作对象(与工具栏同一份 onAction)', () => {
    const onAction = vi.fn()
    render({ onAction })
    const exportButton = Array.from(
      container.querySelectorAll<HTMLButtonElement>(
        '.module-selection-alert-actions button',
      ),
    ).find((button) => button.textContent?.includes('导出选中'))
    act(() => {
      exportButton?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      )
    })
    expect(onAction).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'export_selected' }),
    )
  })
})
