// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type LayoutTab, useLayoutTabsStore } from '@/stores/layoutTabsStore'
import { useUndoRedoShortcuts } from './price-compare-view-hooks'

const PRICE_COMPARE = '/price-compare'

function makeTab(id: string, pathname: string): LayoutTab {
  return {
    id,
    pathname,
    search: '',
    pinned: false,
    mountedOnce: true,
    reloadKey: 0,
  }
}

/** 激活指定路径的 Tab: 比价页只在自身为当前激活页时才响应快捷键。 */
function setActivePath(pathname: string) {
  act(() => {
    useLayoutTabsStore.setState({
      tabs: [makeTab('active', pathname), makeTab('other', '/dashboard')],
      activeTabId: 'active',
    })
  })
}

interface HarnessProps {
  enabled?: boolean
  undo: () => void
  redo: () => void
}

function Harness({ enabled = true, undo, redo }: HarnessProps) {
  useUndoRedoShortcuts(undo, redo, enabled)
  return null
}

function dispatchShortcut(
  init: KeyboardEventInit,
  target: EventTarget = document.body,
) {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  })
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

/**
 * 比价页撤销/重做快捷键的越界守卫。
 *
 * 此前监听直接挂在 window 上且不判事件目标: 在单元格输入框里按 Ctrl+Z 会回滚整表数据,
 * 切到别的 Tab 后仍会改到后台比价页。这里逐条固定守卫口径。
 */
describe('useUndoRedoShortcuts 撤销/重做越界守卫', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    setActivePath(PRICE_COMPARE)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    delete (document as unknown as { visibilityState?: string }).visibilityState
    vi.restoreAllMocks()
  })

  const render = (props: Omit<HarnessProps, 'undo' | 'redo'> = {}) => {
    const undo = vi.fn()
    const redo = vi.fn()
    act(() => {
      root.render(createElement(Harness, { ...props, undo, redo }))
    })
    return { undo, redo }
  }

  it('Ctrl+Z 撤销, Ctrl+Shift+Z / Ctrl+Y 重做', () => {
    const { undo, redo } = render()

    const undoEvent = dispatchShortcut({ ctrlKey: true, key: 'z' })
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).not.toHaveBeenCalled()
    expect(undoEvent.defaultPrevented).toBe(true)

    dispatchShortcut({ ctrlKey: true, shiftKey: true, key: 'z' })
    expect(redo).toHaveBeenCalledTimes(1)

    dispatchShortcut({ ctrlKey: true, key: 'y' })
    expect(redo).toHaveBeenCalledTimes(2)

    // macOS: Cmd 与 Ctrl 等价
    dispatchShortcut({ metaKey: true, key: 'z' })
    expect(undo).toHaveBeenCalledTimes(2)
  })

  it('焦点在输入框内时不触发, 让位给输入框自身的撤销', () => {
    const { undo, redo } = render()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()

    const event = dispatchShortcut({ ctrlKey: true, key: 'z' }, input)

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
    input.remove()
  })

  it('焦点在可编辑区域(textarea / contenteditable)内时不触发', () => {
    const { undo } = render()
    const textarea = document.createElement('textarea')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const inner = document.createElement('span')
    editable.appendChild(inner)
    document.body.append(textarea, editable)

    dispatchShortcut({ ctrlKey: true, key: 'z' }, textarea)
    dispatchShortcut({ ctrlKey: true, key: 'z' }, inner)

    expect(undo).not.toHaveBeenCalled()
    textarea.remove()
    editable.remove()
  })

  it('输入法组合态不打断输入, 也不触发撤销', () => {
    const { undo } = render()

    const event = dispatchShortcut({
      ctrlKey: true,
      key: 'z',
      isComposing: true,
    })

    expect(undo).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('只读态(enabled=false)不注册监听', () => {
    const { undo } = render({ enabled: false })

    const event = dispatchShortcut({ ctrlKey: true, key: 'z' })

    expect(undo).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('切到其它 Tab 后不再响应(后台不可见不触发)', () => {
    const { undo } = render()
    setActivePath('/dashboard')

    dispatchShortcut({ ctrlKey: true, key: 'z' })

    expect(undo).not.toHaveBeenCalled()
  })

  it('后台标签页(document.visibilityState=hidden)不触发', () => {
    const { undo } = render()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })

    const event = dispatchShortcut({ ctrlKey: true, key: 'z' })

    expect(undo).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('非快捷键键位与 Alt 组合不触发', () => {
    const { undo, redo } = render()

    dispatchShortcut({ ctrlKey: true, key: 'k' })
    dispatchShortcut({ key: 'z' })
    dispatchShortcut({ ctrlKey: true, altKey: true, key: 'z' })

    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
  })
})
