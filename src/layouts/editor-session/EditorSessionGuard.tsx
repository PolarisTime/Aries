import { useBlocker } from '@tanstack/react-router'
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { useTranslation } from 'react-i18next'
import { AUTH_SESSION_CLEARED_EVENT } from '@/constants/auth'
import { modal } from '@/utils/antd-app'

export type EditorSessionStatus = 'clean' | 'dirty' | 'submitting' | 'conflict'

interface EditorSessionIdentity {
  moduleKey: string
  mode: 'create' | 'edit'
  recordId?: string
}

interface EditorSession extends EditorSessionIdentity {
  status: EditorSessionStatus
}

interface EditorSessionController {
  beginSession: (identity: EditorSessionIdentity) => void
  endSession: () => void
  requestClose: (onClose: () => void) => void
  setSessionStatus: (status: EditorSessionStatus) => void
}

const EditorSessionContext = createContext<EditorSessionController | null>(null)

function requiresLeaveConfirmation(session: EditorSession | null): boolean {
  return session != null && session.status !== 'clean'
}

interface Props {
  children: ReactNode
}

export function EditorSessionGuard({ children }: Props) {
  const { t } = useTranslation()
  const sessionRef = useRef<EditorSession | null>(null)
  const confirmationOpenRef = useRef(false)

  const commitSession = useCallback((nextSession: EditorSession | null) => {
    sessionRef.current = nextSession
  }, [])

  const beginSession = useCallback(
    (identity: EditorSessionIdentity) => {
      commitSession({ ...identity, status: 'clean' })
    },
    [commitSession],
  )

  const endSession = useCallback(() => {
    commitSession(null)
  }, [commitSession])

  useEffect(() => {
    const clearEditorSession = () => {
      commitSession(null)
    }
    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, clearEditorSession)
    return () => {
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, clearEditorSession)
    }
  }, [commitSession])

  const setSessionStatus = useCallback(
    (status: EditorSessionStatus) => {
      const currentSession = sessionRef.current
      if (!currentSession || currentSession.status === status) {
        return
      }
      commitSession({ ...currentSession, status })
    },
    [commitSession],
  )

  const showDiscardConfirmation = useCallback(
    (onDiscard: () => void, onCancel?: () => void): boolean => {
      if (confirmationOpenRef.current) {
        return false
      }
      confirmationOpenRef.current = true
      modal.confirm({
        title: t('common.unsavedChangesTitle'),
        content: t('common.unsavedChangesContent'),
        okText: t('common.discardChanges'),
        cancelText: t('common.cancel'),
        maskClosable: false,
        onOk: onDiscard,
        onCancel,
        afterClose: () => {
          confirmationOpenRef.current = false
        },
      })
      return true
    },
    [t],
  )

  const requestClose = useCallback(
    (onClose: () => void) => {
      const currentSession = sessionRef.current
      if (!currentSession || currentSession.status === 'clean') {
        endSession()
        onClose()
        return
      }
      if (currentSession.status === 'submitting') {
        if (confirmationOpenRef.current) {
          return
        }
        confirmationOpenRef.current = true
        modal.info({
          title: t('common.saveInProgressTitle'),
          content: t('common.saveInProgressContent'),
          okText: t('common.confirm'),
          afterClose: () => {
            confirmationOpenRef.current = false
          },
        })
        return
      }
      showDiscardConfirmation(() => {
        endSession()
        onClose()
      })
    },
    [endSession, showDiscardConfirmation, t],
  )

  const {
    status: blockerStatus,
    proceed,
    reset,
  } = useBlocker({
    shouldBlockFn: ({ current, next }) =>
      requiresLeaveConfirmation(sessionRef.current) &&
      current.pathname !== next.pathname,
    enableBeforeUnload: () => requiresLeaveConfirmation(sessionRef.current),
    withResolver: true,
  })

  useEffect(() => {
    if (blockerStatus !== 'blocked') {
      return
    }
    const currentSession = sessionRef.current
    if (!requiresLeaveConfirmation(currentSession)) {
      proceed()
      return
    }
    if (currentSession?.status === 'submitting') {
      if (confirmationOpenRef.current) {
        reset()
        return
      }
      confirmationOpenRef.current = true
      modal.info({
        title: t('common.saveInProgressTitle'),
        content: t('common.saveInProgressContent'),
        okText: t('common.confirm'),
        onOk: reset,
        afterClose: () => {
          confirmationOpenRef.current = false
        },
      })
      return
    }
    const opened = showDiscardConfirmation(() => {
      endSession()
      proceed()
    }, reset)
    if (!opened) {
      reset()
    }
  }, [blockerStatus, endSession, proceed, reset, showDiscardConfirmation, t])

  const controller = useMemo<EditorSessionController>(
    () => ({ beginSession, endSession, requestClose, setSessionStatus }),
    [beginSession, endSession, requestClose, setSessionStatus],
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
    throw new Error('useEditorSession must be used within EditorSessionGuard')
  }
  return controller
}
