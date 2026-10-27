// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isBreadcrumbVisible } from '@/layouts/breadcrumb'
import { usePersonalSettings } from '@/layouts/usePersonalSettings'
import { useUiSettingsStore } from '@/stores/uiSettingsStore'

/**
 * 「个人设置 → 显示」里的面包屑开关。
 *
 * <p>契约三条：① 缺省显示（老用户 localStorage 里没有这个字段，不能被当成关闭）；
 * ② 与其他显示设置一致，**保存后才生效**，取消要回滚；③ 恢复默认回到"显示"。</p>
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
;(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
  ResizeObserverStub

describe('面包屑显示开关', () => {
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
    return api as unknown as ReturnType<typeof usePersonalSettings>
  }

  /**
   * 取"最近一次渲染"的 hook 返回值。
   *
   * <p>`save/reset/close` 都闭包在渲染时的 state 上：`setXxx` 之后继续用旧的返回对象，
   * 拿到的还是改动前的值（真实界面里由用户再点一次按钮触发新渲染，不会遇到）。</p>
   */
  const current = () => api as unknown as ReturnType<typeof usePersonalSettings>

  it('缺省显示: 没存过设置 / 字段缺省都算显示', () => {
    expect(isBreadcrumbVisible(null)).toBe(true)
    expect(isBreadcrumbVisible({})).toBe(true)
    expect(isBreadcrumbVisible({ showBreadcrumb: true })).toBe(true)
    expect(isBreadcrumbVisible({ showBreadcrumb: false })).toBe(false)
  })

  it('未设置过时开关默认打开', () => {
    const state = render()
    expect(state.showBreadcrumb).toBe(true)
    expect(state.appliedShowBreadcrumb).toBe(true)
  })

  it('保存后写进设置并生效; 重新加载仍是关闭', () => {
    render()
    act(() => api?.setShowBreadcrumb(false))
    // 保存前只是草稿态, 尚未落库
    expect(
      useUiSettingsStore.getState().settings?.showBreadcrumb,
    ).toBeUndefined()
    act(() => current().save())
    expect(useUiSettingsStore.getState().settings?.showBreadcrumb).toBe(false)
    expect(current().appliedShowBreadcrumb).toBe(false)

    // 模拟重新打开应用: 从持久化设置读回
    render()
    expect(current().showBreadcrumb).toBe(false)
  })

  it('取消(关闭弹窗)会回滚未保存的改动', () => {
    render()
    act(() => api?.setShowBreadcrumb(false))
    act(() => current().close())
    expect(current().showBreadcrumb).toBe(true)
    expect(current().appliedShowBreadcrumb).toBe(true)
  })

  it('恢复默认把面包屑改回显示', () => {
    render()
    act(() => api?.setShowBreadcrumb(false))
    act(() => current().save())
    act(() => current().reset())
    expect(current().showBreadcrumb).toBe(true)
  })
})
