import { afterEach, describe, expect, it } from 'vitest'
import {
  type EditorSessionIdentity,
  editorSessionStore,
} from '@/layouts/editor-session/editor-session-store'

const identity: EditorSessionIdentity = {
  moduleKey: 'purchase-order',
  mode: 'edit',
}

afterEach(() => {
  editorSessionStore.clearAll()
})

describe('editorSessionStore（按 Tab 隔离的编辑器会话）', () => {
  it('不同 Tab 会话互不覆盖', () => {
    editorSessionStore.beginSession('tab-a', identity)
    editorSessionStore.beginSession('tab-b', {
      ...identity,
      moduleKey: 'sales-order',
    })

    editorSessionStore.setSessionStatus('tab-a', 'dirty')

    expect(editorSessionStore.getSession('tab-a')?.status).toBe('dirty')
    expect(editorSessionStore.getSession('tab-b')?.status).toBe('clean')
    expect(editorSessionStore.anyDirty()).toBe(true)
  })

  it('anyDirty 仅在有非 clean 会话时为 true', () => {
    expect(editorSessionStore.anyDirty()).toBe(false)

    editorSessionStore.beginSession('tab-a', identity)
    expect(editorSessionStore.anyDirty()).toBe(false)

    editorSessionStore.setSessionStatus('tab-a', 'submitting')
    expect(editorSessionStore.anyDirty()).toBe(true)
  })

  it('setSessionStatus 对不存在或同状态会话为 no-op', () => {
    editorSessionStore.setSessionStatus('missing', 'dirty')
    expect(editorSessionStore.hasSession('missing')).toBe(false)

    editorSessionStore.beginSession('tab-a', identity)
    editorSessionStore.setSessionStatus('tab-a', 'clean')
    expect(editorSessionStore.getSession('tab-a')?.status).toBe('clean')
  })

  it('endSession / requiresConfirmation / clearAll 行为', () => {
    editorSessionStore.beginSession('tab-a', identity)
    editorSessionStore.setSessionStatus('tab-a', 'dirty')
    expect(editorSessionStore.requiresConfirmation('tab-a')).toBe(true)

    editorSessionStore.endSession('tab-a')
    expect(editorSessionStore.hasSession('tab-a')).toBe(false)
    expect(editorSessionStore.requiresConfirmation('tab-a')).toBe(false)

    editorSessionStore.beginSession('tab-b', identity)
    editorSessionStore.setSessionStatus('tab-b', 'dirty')
    editorSessionStore.clearAll()
    expect(editorSessionStore.anyDirty()).toBe(false)
  })
})
