// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'
import { SHEET_COLUMN_WIDTH } from './core'
import { useSheetColumnWidths } from './use-sheet-column-widths'

/**
 * 探针组件: 把 hook 结果序列化进 DOM。
 * 不在渲染期写外部变量(组件必须保持纯函数), 断言统一从 container.textContent 读取。
 */
function Probe() {
  const widths = useSheetColumnWidths()
  return createElement('output', null, JSON.stringify(widths))
}

describe('useSheetColumnWidths 随个人设置字号自适应', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    useUiSettingsStore.setState({ settings: null })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    useUiSettingsStore.setState({ settings: null })
  })

  const widthsNow = () =>
    JSON.parse(container.textContent ?? '{}') as Record<string, number>

  const render = () => {
    act(() => {
      root.render(createElement(Probe))
    })
    return widthsNow()
  }

  it('未配置字号时使用 14px 基准列宽', () => {
    expect(render()).toEqual({ ...SHEET_COLUMN_WIDTH })
  })

  it('字号 16/18 时列宽等比放大', () => {
    useUiSettingsStore.setState({ settings: { fontSize: 16 } })
    const at16 = render()
    expect(at16.spec).toBe(Math.round((SHEET_COLUMN_WIDTH.spec * 16) / 14))
    expect(at16.ton).toBeGreaterThan(SHEET_COLUMN_WIDTH.ton)

    act(() => {
      useUiSettingsStore.setState({ settings: { fontSize: 18 } })
    })
    const at18 = widthsNow()
    expect(at18.spec).toBe(Math.round((SHEET_COLUMN_WIDTH.spec * 18) / 14))
    // 字号变大后每一列都不能变窄
    for (const key of Object.keys(SHEET_COLUMN_WIDTH)) {
      expect(at18[key]).toBeGreaterThanOrEqual(at16[key])
    }
  })

  it('字号缩小时列宽同比缩小, 不会出现 0 宽列', () => {
    useUiSettingsStore.setState({ settings: { fontSize: 11 } })
    const widths = render()
    expect(widths.spec).toBe(Math.round((SHEET_COLUMN_WIDTH.spec * 11) / 14))
    for (const value of Object.values(widths)) {
      expect(value).toBeGreaterThan(0)
    }
  })
})
