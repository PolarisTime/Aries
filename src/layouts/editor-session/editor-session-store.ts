export type EditorSessionStatus = 'clean' | 'dirty' | 'submitting' | 'conflict'

export interface EditorSessionIdentity {
  moduleKey: string
  mode: 'create' | 'edit'
  recordId?: string
}

export interface EditorSession extends EditorSessionIdentity {
  status: EditorSessionStatus
}

/**
 * 编辑器会话注册表：每个多标签页面板一个独立会话槽。
 * keep-alive 下多个 Tab 可同时持有打开的编辑器，脏状态互不覆盖。
 */
const sessions = new Map<string, EditorSession>()

function requiresLeaveConfirmation(session: EditorSession | null): boolean {
  return session != null && session.status !== 'clean'
}

/** 身份是否未变：用于 beginSession 的幂等判定（recordId 省略与空串等价）。 */
function isSameIdentity(
  current: EditorSession,
  identity: EditorSessionIdentity,
): boolean {
  return (
    current.moduleKey === identity.moduleKey &&
    current.mode === identity.mode &&
    (current.recordId ?? '') === (identity.recordId ?? '')
  )
}

export const editorSessionStore = {
  getSession(tabId: string): EditorSession | null {
    return sessions.get(tabId) ?? null
  },

  hasSession(tabId: string): boolean {
    return sessions.has(tabId)
  },

  /**
   * 登记会话。**幂等**：同一个 Tab 上身份未变的重复登记（Activity 隐藏→恢复重跑 effect
   * setup、StrictMode 双调用）保持现状，绝不把已有状态重置回 clean —— 否则恢复之后
   * 「存在未保存的修改」的关闭守卫会失效。只有身份真的变了（换模块/换单据/换模式）才建新会话。
   */
  beginSession(tabId: string, identity: EditorSessionIdentity): void {
    const current = sessions.get(tabId)
    if (current && isSameIdentity(current, identity)) {
      return
    }
    sessions.set(tabId, { ...identity, status: 'clean' })
  },

  endSession(tabId: string): void {
    sessions.delete(tabId)
  },

  setSessionStatus(tabId: string, status: EditorSessionStatus): void {
    const current = sessions.get(tabId)
    if (!current || current.status === status) {
      return
    }
    sessions.set(tabId, { ...current, status })
  },

  /** 是否存在任意未保存会话（用于 beforeunload 拦截刷新/关窗） */
  anyDirty(): boolean {
    for (const session of sessions.values()) {
      if (requiresLeaveConfirmation(session)) {
        return true
      }
    }
    return false
  },

  /** 指定 Tab 是否存在需要确认的未保存会话 */
  requiresConfirmation(tabId: string): boolean {
    return requiresLeaveConfirmation(sessions.get(tabId) ?? null)
  },

  clearAll(): void {
    sessions.clear()
  },
}
