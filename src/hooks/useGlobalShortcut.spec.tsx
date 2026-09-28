// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  hasShortcutModifier,
  isEditableShortcutTarget,
  isShortcutContainerVisible,
  useGlobalShortcut,
} from './useGlobalShortcut'

interface HarnessProps {
  enabled?: boolean
  ignoreEditableTarget?: boolean
  isActive?: () => boolean
  containerRef?: React.RefObject<HTMLElement | null>
  run: (event: KeyboardEvent) => void
}

/** 固定键位: 只验证守卫, 键位匹配本身由各业务快捷键负责。 */
const matchZ = (event: KeyboardEvent) => event.key.toLowerCase() === 'z'

function Harness({
  enabled = true,
  ignoreEditableTarget = false,
  isActive,
  containerRef,
  run,
}: HarnessProps) {
  useGlobalShortcut({
    enabled,
    ignoreEditableTarget,
    isActive,
    containerRef,
    match: matchZ,
    run,
  })
  return null
}

function dispatch(
  target: EventTarget = document.body,
  init: KeyboardEventInit = { key: 'z' },
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

describe('useGlobalShortcut 全局快捷键基元', () => {
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
    delete (document as unknown as Record<string, unknown>).visibilityState
  })

  const render = (props: Partial<Omit<HarnessProps, 'run'>> = {}) => {
    const run = vi.fn()
    act(() => {
      root.render(createElement(Harness, { ...props, run }))
    })
    return run
  }

  it('命中键位时执行动作(捕获阶段先于输入控件)', () => {
    const run = render()
    dispatch()
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('isComposing 组合态不执行', () => {
    const run = render()
    dispatch(document.body, { key: 'z', isComposing: true })
    expect(run).not.toHaveBeenCalled()
  })

  it('enabled=false 不注册监听', () => {
    const run = render({ enabled: false })
    dispatch()
    expect(run).not.toHaveBeenCalled()
  })

  it('ignoreEditableTarget 时输入控件/可编辑区域内的按键不执行', () => {
    const run = render({ ignoreEditableTarget: true })
    const input = document.createElement('input')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'plaintext-only')
    const inner = document.createElement('span')
    editable.appendChild(inner)
    const plain = document.createElement('div')
    document.body.append(input, editable, plain)

    dispatch(input)
    dispatch(inner)
    expect(run).not.toHaveBeenCalled()

    // 非可编辑目标仍然生效
    dispatch(plain)
    expect(run).toHaveBeenCalledTimes(1)

    input.remove()
    editable.remove()
    plain.remove()
  })

  it('isActive=false 时不执行', () => {
    const run = render({ isActive: () => false })
    dispatch()
    expect(run).not.toHaveBeenCalled()
  })

  it('容器处于 [hidden] 面板内时不执行', () => {
    const panel = document.createElement('div')
    panel.hidden = true
    const host = document.createElement('div')
    panel.appendChild(host)
    document.body.appendChild(panel)
    const run = render({
      containerRef: { current: host },
    })

    dispatch()
    expect(run).not.toHaveBeenCalled()

    panel.hidden = false
    dispatch()
    expect(run).toHaveBeenCalledTimes(1)
    panel.remove()
  })

  it('后台标签页(document.visibilityState=hidden)不执行', () => {
    const run = render()
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    dispatch()
    expect(run).not.toHaveBeenCalled()
  })

  it('isEditableShortcutTarget 识别输入控件与可编辑区域', () => {
    const input = document.createElement('input')
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    const editableInner = document.createElement('span')
    editable.appendChild(editableInner)
    const plain = document.createElement('button')

    expect(isEditableShortcutTarget(input)).toBe(true)
    expect(isEditableShortcutTarget(textarea)).toBe(true)
    expect(isEditableShortcutTarget(select)).toBe(true)
    expect(isEditableShortcutTarget(editableInner)).toBe(true)
    expect(isEditableShortcutTarget(plain)).toBe(false)
    expect(isEditableShortcutTarget(null)).toBe(false)
  })

  it('hasShortcutModifier 只认 Ctrl/Cmd 且排除 Alt', () => {
    const event = (init: KeyboardEventInit) =>
      new KeyboardEvent('keydown', init)
    expect(hasShortcutModifier(event({ ctrlKey: true }))).toBe(true)
    expect(hasShortcutModifier(event({ metaKey: true }))).toBe(true)
    expect(hasShortcutModifier(event({ ctrlKey: true, altKey: true }))).toBe(
      false,
    )
    expect(hasShortcutModifier(event({}))).toBe(false)
  })

  it('isShortcutContainerVisible 只在 [hidden] 祖先下判定为不可见', () => {
    const panel = document.createElement('div')
    panel.hidden = true
    const child = document.createElement('div')
    panel.appendChild(child)
    expect(isShortcutContainerVisible(child)).toBe(false)
    expect(isShortcutContainerVisible(document.createElement('div'))).toBe(true)
    expect(isShortcutContainerVisible(null)).toBe(true)
  })
})
