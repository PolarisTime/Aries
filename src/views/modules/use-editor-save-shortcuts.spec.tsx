// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorSaveShortcuts } from './use-editor-save-shortcuts'

interface HarnessProps {
  enabled?: boolean
  canSave?: boolean
  canAudit?: boolean
  saving?: boolean
  onSave: (audit: boolean) => void
}

function Harness({
  enabled = true,
  canSave = true,
  canAudit = true,
  saving = false,
  onSave,
}: HarnessProps) {
  useEditorSaveShortcuts({ enabled, canSave, canAudit, saving, onSave })
  return null
}

function dispatchSaveKey(init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', {
    key: 's',
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

describe('useEditorSaveShortcuts', () => {
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
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  const render = (props: HarnessProps) => {
    act(() => {
      root.render(createElement(Harness, props))
    })
  }

  it('Ctrl+S 触发保存并阻止浏览器保存网页', () => {
    const onSave = vi.fn()
    render({ onSave })

    const event = dispatchSaveKey({ ctrlKey: true })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(false)
    expect(event.defaultPrevented).toBe(true)
  })

  it('Cmd+S（macOS metaKey）同样触发保存', () => {
    const onSave = vi.fn()
    render({ onSave })

    const event = dispatchSaveKey({ metaKey: true })

    expect(onSave).toHaveBeenCalledWith(false)
    expect(event.defaultPrevented).toBe(true)
  })

  it('Ctrl+Shift+S 触发保存并审核', () => {
    const onSave = vi.fn()
    render({ onSave })

    const event = dispatchSaveKey({ ctrlKey: true, shiftKey: true, key: 'S' })

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith(true)
    expect(event.defaultPrevented).toBe(true)
  })

  it('保存中忽略快捷键（不重复提交）', () => {
    const onSave = vi.fn()
    render({ onSave, saving: true })

    const event = dispatchSaveKey({ ctrlKey: true })

    expect(onSave).not.toHaveBeenCalled()
    // 保存中仍然阻止浏览器「保存网页」，避免编辑器内弹出原生保存框
    expect(event.defaultPrevented).toBe(true)
  })

  it('无保存权限时忽略 Ctrl+S', () => {
    const onSave = vi.fn()
    render({ onSave, canSave: false })

    dispatchSaveKey({ ctrlKey: true })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('无审核权限时忽略 Ctrl+Shift+S', () => {
    const onSave = vi.fn()
    render({ onSave, canAudit: false })

    dispatchSaveKey({ ctrlKey: true, shiftKey: true, key: 'S' })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('输入法组合态不打断输入，也不触发保存', () => {
    const onSave = vi.fn()
    render({ onSave })

    const event = dispatchSaveKey({ ctrlKey: true, isComposing: true })

    expect(onSave).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('编辑器未打开时不注册监听', () => {
    const onSave = vi.fn()
    render({ onSave, enabled: false })

    const event = dispatchSaveKey({ ctrlKey: true })

    expect(onSave).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('非保存键位与非修饰键组合不触发', () => {
    const onSave = vi.fn()
    render({ onSave })

    dispatchSaveKey({ ctrlKey: true, key: 'k' })
    dispatchSaveKey({ key: 's' })
    dispatchSaveKey({ ctrlKey: true, altKey: true })

    expect(onSave).not.toHaveBeenCalled()
  })

  it('卸载后不再响应快捷键', () => {
    const onSave = vi.fn()
    render({ onSave })

    act(() => {
      root.unmount()
    })
    dispatchSaveKey({ ctrlKey: true })

    expect(onSave).not.toHaveBeenCalled()
  })
})
