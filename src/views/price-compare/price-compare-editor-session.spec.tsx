// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { EditorSessionScopeProvider } from '@/layouts/editor-session/EditorSessionGuard'
import { editorSessionStore } from '@/layouts/editor-session/editor-session-store'
import { usePriceCompareEditorSession } from './price-compare-view-hooks'

const TAB_ID = 'tab-price-compare'

/** 只消费会话注册, 不渲染比价表格。 */
function Probe({ dirty }: { dirty: boolean }) {
  usePriceCompareEditorSession(dirty)
  return null
}

function renderProbe(dirty: boolean) {
  return (
    <EditorSessionScopeProvider tabId={TAB_ID}>
      <Probe dirty={dirty} />
    </EditorSessionScopeProvider>
  )
}

describe('usePriceCompareEditorSession', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    editorSessionStore.clearAll()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    act(() => root.unmount())
    container.remove()
    editorSessionStore.clearAll()
  })

  it('挂载即注册会话, 无未保存改动时不拦截', () => {
    act(() => {
      root.render(renderProbe(false))
    })
    const session = editorSessionStore.getSession(TAB_ID)
    expect(session?.moduleKey).toBe('price-compare')
    expect(session?.status).toBe('clean')
    expect(editorSessionStore.anyDirty()).toBe(false)
    expect(editorSessionStore.requiresConfirmation(TAB_ID)).toBe(false)
  })

  it('存在未落库改动时标记为脏: 刷新/关窗与关闭标签都会拦截', () => {
    act(() => {
      root.render(renderProbe(false))
    })
    act(() => {
      root.render(renderProbe(true))
    })
    expect(editorSessionStore.getSession(TAB_ID)?.status).toBe('dirty')
    // beforeunload 守卫读取 anyDirty()
    expect(editorSessionStore.anyDirty()).toBe(true)
    // 关闭标签守卫读取 requiresConfirmation(tabId)
    expect(editorSessionStore.requiresConfirmation(TAB_ID)).toBe(true)
  })

  it('保存落库后恢复 clean, 卸载时注销会话', () => {
    act(() => {
      root.render(renderProbe(true))
    })
    act(() => {
      root.render(renderProbe(false))
    })
    expect(editorSessionStore.getSession(TAB_ID)?.status).toBe('clean')

    act(() => root.unmount())
    expect(editorSessionStore.getSession(TAB_ID)).toBeNull()
    expect(editorSessionStore.anyDirty()).toBe(false)
  })
})
