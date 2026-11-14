import { createContext, type ReactNode, use, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AUTH_SESSION_CLEARED_EVENT } from '@/constants/auth'
import {
  type EditorSessionIdentity,
  type EditorSessionStatus,
  editorSessionStore,
} from '@/layouts/editor-session/editor-session-store'
import { requestEditorSessionClose } from '@/layouts/editor-session/request-close'

export type {
  EditorSession,
  EditorSessionIdentity,
  EditorSessionStatus,
} from '@/layouts/editor-session/editor-session-store'

interface EditorSessionController {
  beginSession: (identity: EditorSessionIdentity) => void
  endSession: () => void
  requestClose: (onClose: () => void) => void
  setSessionStatus: (status: EditorSessionStatus) => void
}

const EditorSessionContext = createContext<EditorSessionController | null>(null)

/**
 * 应用级守卫：拦截浏览器刷新/关窗（存在任意未保存会话时），
 * 并在认证会话清除事件后重置全部编辑器会话。
 *
 * <p>路由层面的离开拦截分两处收口（面包屑单页模型下离开页面即会卸载编辑器）：</p>
 * <ul>
 *   <li>应用内导航（菜单 / 面包屑 / 指标卡等）统一走 `useTabOpen`：离开前先调用
 *       {@link requestEditorSessionClose} 确认；</li>
 *   <li>浏览器前进/后退/手输地址绕过了 `useTabOpen`，由 `useTabRouteReconciliation`
 *       检测「目标页 ≠ 当前激活页且当前页脏」后先取消地址变化、再弹同一个确认框。</li>
 * </ul>
 */
export function EditorSessionGuard({ children }: Props) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!editorSessionStore.anyDirty()) {
        return
      }
      event.preventDefault()
      event.returnValue = ''
    }
    const clearEditorSessions = () => {
      editorSessionStore.clearAll()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, clearEditorSessions)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener(
        AUTH_SESSION_CLEARED_EVENT,
        clearEditorSessions,
      )
    }
  }, [])

  return <>{children}</>
}

interface Props {
  children: ReactNode
}

type ScopeProps = {
  /** 多标签页面板 id；非 Tab 场景传稳定占位值 */
  tabId: string
  children: ReactNode
}

/** 每个多标签页面板包裹一层，为其内部的编辑器提供独立的会话槽 */
export function EditorSessionScopeProvider({ tabId, children }: ScopeProps) {
  const { t } = useTranslation()

  const controller = useMemo<EditorSessionController>(
    () => ({
      beginSession: (identity) => {
        editorSessionStore.beginSession(tabId, identity)
      },
      endSession: () => {
        editorSessionStore.endSession(tabId)
      },
      requestClose: (onClose) => {
        requestEditorSessionClose(t, tabId, onClose)
      },
      setSessionStatus: (status) => {
        editorSessionStore.setSessionStatus(tabId, status)
      },
    }),
    [tabId, t],
  )

  return (
    <EditorSessionContext.Provider value={controller}>
      {children}
    </EditorSessionContext.Provider>
  )
}

export function useEditorSession(): EditorSessionController {
  const controller = use(EditorSessionContext)
  if (!controller) {
    throw new Error(
      'useEditorSession must be used within EditorSessionScopeProvider',
    )
  }
  return controller
}
