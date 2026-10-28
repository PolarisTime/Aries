// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { usePersonalSettings } from '@/layouts/usePersonalSettings'
import {
  normalizePersonalSettings,
  useUiSettingsStore,
} from '@/stores/uiSettingsStore'

/**
 * 个人设置 → 右键菜单的持久化契约。
 *
 * <p>与其他显示设置同一语义：**草稿态 → 保存才落库 → 取消回滚 → 恢复默认全部显示**。
 * 存的是"隐藏了哪些动作 key"，因此新增动作天然显示、不需要迁移老数据。</p>
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  ResizeObserverStub

describe('个人设置 · 右键菜单', () => {
  let container: HTMLDivElement
  let root: Root
  let api: ReturnType<typeof usePersonalSettings> | null = null

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    useUiSettingsStore.getState().clearSettings()
    localStorage.clear()
    api = null
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    useUiSettingsStore.getState().clearSettings()
    localStorage.clear()
  })

  const render = () => {
    function Harness() {
      api = usePersonalSettings({
        defaultFontSize: 14,
        defaultLayoutMode: 'top',
      })
      return null
    }
    act(() => root.render(createElement(Harness)))
  }

  /** 取"最近一次渲染"的 hook 返回值（save/close 闭包在渲染时的 state 上）。 */
  const current = () => api as unknown as ReturnType<typeof usePersonalSettings>

  it('缺省全部显示（隐藏集合为空）', () => {
    render()
    expect(current().contextMenu.hiddenActionKeys).toEqual([])
  })

  it('逐项隐藏: 草稿不落库, 保存后生效, 取消回滚', () => {
    render()
    act(() => current().toggleContextMenuAction('attach', false))
    expect(current().contextMenu.hiddenActionKeys).toEqual(['attach'])
    expect(useUiSettingsStore.getState().settings?.contextMenu).toBeUndefined()

    act(() => current().save())
    expect(useUiSettingsStore.getState().settings?.contextMenu).toEqual({
      hiddenActionKeys: ['attach'],
    })

    // 重新加载（模拟重开应用）仍读到隐藏
    render()
    expect(current().contextMenu.hiddenActionKeys).toEqual(['attach'])

    // 再打开并保存 → 隐藏集合清空
    act(() => current().toggleContextMenuAction('attach', true))
    act(() => current().save())
    expect(current().contextMenu.hiddenActionKeys).toEqual([])

    // 草稿改动被取消后回滚到已保存值
    act(() => current().toggleContextMenuAction('edit', false))
    act(() => current().close())
    expect(current().contextMenu.hiddenActionKeys).toEqual([])
  })

  it('整组开关一次隐藏/恢复该组全部动作', () => {
    render()
    act(() => current().setContextMenuGroupVisible('bulk', false))
    expect(current().contextMenu.hiddenActionKeys).toEqual(
      expect.arrayContaining([
        'export_selected',
        'bulk_audit',
        'bulk_reverse_audit',
        'bulk_delete',
      ]),
    )
    act(() => current().setContextMenuGroupVisible('bulk', true))
    expect(current().contextMenu.hiddenActionKeys).toEqual([])
  })

  it('恢复默认把右键菜单全部显示', () => {
    render()
    act(() => current().setContextMenuGroupVisible('row', false))
    act(() => current().save())
    act(() => current().reset())
    expect(current().contextMenu.hiddenActionKeys).toEqual([])
  })

  it('归一化: 只保留字符串 key，并兼容上一版分组布尔', () => {
    expect(
      normalizePersonalSettings({
        contextMenu: { hiddenActionKeys: ['attach', 'attach', 42] },
      })?.contextMenu?.hiddenActionKeys,
    ).toEqual(['attach'])

    expect(
      normalizePersonalSettings({ contextMenu: { showDangerActions: false } })
        ?.contextMenu?.hiddenActionKeys,
    ).toEqual(['bulk_delete'])
  })

  it('导航面包屑已移除: 设置里不再有 showBreadcrumb 字段', () => {
    const normalized = normalizePersonalSettings({
      showBreadcrumb: false,
      fontSize: 15,
    })
    expect(normalized).toEqual({ fontSize: 15 })
  })
})
