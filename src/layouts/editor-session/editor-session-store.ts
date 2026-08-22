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

export const editorSessionStore = {
  getSession(tabId: string): EditorSession | null {
    return sessions.get(tabId) ?? null
  },

  hasSession(tabId: string): boolean {
    return sessions.has(tabId)
  },

  beginSession(tabId: string, identity: EditorSessionIdentity): void {
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
