import { modal } from '@/utils/antd-app'
import type { ModuleLineItem } from '@/types/module-page'
import { useCallback, useRef, useState } from 'react'

interface EditorSessionData {
  key: string
  title: string
  formValues: Record<string, unknown>
  items: ModuleLineItem[]
  isDirty: boolean
}

export interface EditorSession {
  key: string
  title: string
  isDirty: boolean
}

interface UseEditorTabsOptions {
  moduleKey: string
  maxSessions?: number
  onDirtyChange?: (key: string, dirty: boolean) => void
}

interface UseEditorTabsReturn {
  sessions: EditorSession[]
  activeKey: string | null
  activeSessionData: EditorSessionData | null
  openTab: (
    key: string,
    title: string,
    initialData?: Partial<EditorSessionData>,
  ) => void
  closeTab: (key: string) => Promise<boolean>
  switchTab: (key: string) => void
  updateSession: (key: string, partial: Partial<EditorSessionData>) => void
  setDirty: (key: string, dirty: boolean) => void
  getSessionData: (key: string) => EditorSessionData | undefined
}

export function useEditorTabs({
  maxSessions = 10,
  onDirtyChange,
}: UseEditorTabsOptions): UseEditorTabsReturn {
  const sessionsRef = useRef<Map<string, EditorSessionData>>(new Map())
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [sessions, setSessions] = useState<EditorSession[]>([])

  const syncSessions = useCallback(
    (map: Map<string, EditorSessionData>) => {
      setSessions(
        Array.from(map.entries()).map(([key, data]) => ({
          key,
          title: data.title,
          isDirty: data.isDirty,
        })),
      )
    },
    [],
  )

  const openTab = useCallback(
    (
      key: string,
      title: string,
      initialData?: Partial<EditorSessionData>,
    ) => {
      const map = sessionsRef.current

      if (map.has(key)) {
        setActiveKey(key)
        return
      }

      if (map.size >= maxSessions) {
        modal.warning({
          title: '已达最大编辑数量',
          content: `最多同时打开 ${maxSessions} 个编辑标签，请关闭一些后重试。`,
        })
        return
      }

      map.set(key, {
        key,
        title,
        formValues: initialData?.formValues || {},
        items: initialData?.items || [],
        isDirty: initialData?.isDirty || false,
      })
      syncSessions(map)
      setActiveKey(key)
    },
    [maxSessions, syncSessions],
  )

  const closeTab = useCallback(
    async (key: string): Promise<boolean> => {
      const map = sessionsRef.current
      const session = map.get(key)
      if (!session) return true

      if (session.isDirty) {
        const confirmed = await new Promise<boolean>((resolve) => {
          modal.confirm({
            title: '未保存的更改',
            content: `"${session.title}" 有未保存的修改，确定要关闭吗？`,
            okText: '放弃更改',
            cancelText: '继续编辑',
            okButtonProps: { danger: true },
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
          })
        })
        if (!confirmed) return false
      }

      map.delete(key)
      syncSessions(map)

      if (activeKey === key) {
        const keys = Array.from(map.keys())
        const idx = sessions.findIndex((s) => s.key === key)
        const fallbackKey =
          keys[Math.max(idx - 1, 0)] || keys[0] || null
        setActiveKey(fallbackKey)
      }

      return true
    },
    [activeKey, sessions, syncSessions],
  )

  const switchTab = useCallback((key: string) => {
    setActiveKey(key)
  }, [])

  const updateSession = useCallback(
    (key: string, partial: Partial<EditorSessionData>) => {
      const map = sessionsRef.current
      const existing = map.get(key)
      if (!existing) return
      Object.assign(existing, partial)
      syncSessions(map)
    },
    [syncSessions],
  )

  const setDirty = useCallback(
    (key: string, dirty: boolean) => {
      const map = sessionsRef.current
      const existing = map.get(key)
      if (!existing) return
      existing.isDirty = dirty
      syncSessions(map)
      onDirtyChange?.(key, dirty)
    },
    [onDirtyChange, syncSessions],
  )

  const getSessionData = useCallback(
    (key: string) => sessionsRef.current.get(key),
    [],
  )

  const activeSessionData = activeKey
    ? sessionsRef.current.get(activeKey) || null
    : null

  return {
    sessions,
    activeKey,
    activeSessionData,
    openTab,
    closeTab,
    switchTab,
    updateSession,
    setDirty,
    getSessionData,
  }
}
