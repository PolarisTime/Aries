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

  it('beginSession 幂等：同 Tab 同身份重入(Activity 隐藏→恢复)不把脏状态重置回 clean', () => {
    editorSessionStore.beginSession('tab-a', identity)
    editorSessionStore.setSessionStatus('tab-a', 'dirty')

    // Activity 恢复时 effect setup 会重跑，这里必须保持现状
    editorSessionStore.beginSession('tab-a', identity)

    expect(
      editorSessionStore.getSession('tab-a')?.status,
      '同身份重复登记必须保留已有状态，否则「存在未保存的修改」守卫会在恢复后失效',
    ).toBe('dirty')
    expect(editorSessionStore.requiresConfirmation('tab-a')).toBe(true)

    // 身份真的变了才建新会话（换单据/换模块）
    editorSessionStore.beginSession('tab-a', { ...identity, recordId: '9001' })
    expect(editorSessionStore.getSession('tab-a')?.status).toBe('clean')
    expect(editorSessionStore.getSession('tab-a')?.recordId).toBe('9001')
    expect(editorSessionStore.requiresConfirmation('tab-a')).toBe(false)

    // recordId 省略与空串等价：不得因为 '' / undefined 抖动而重建会话
    editorSessionStore.beginSession('tab-b', { ...identity, recordId: '' })
    editorSessionStore.setSessionStatus('tab-b', 'dirty')
    editorSessionStore.beginSession('tab-b', identity)
    expect(editorSessionStore.getSession('tab-b')?.status).toBe('dirty')
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
