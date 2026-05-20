import { useCallback, useEffect, useRef } from 'react'
import type { EditorSession } from './useEditorTabs'
import { useEditorTabs } from './useEditorTabs'

interface UseEditorTabsAdapterOptions {
  moduleKey: string
  editRecord: unknown
  editorOpen: boolean
  configTitle: string
  onCloseEditor: () => void
}

interface UseEditorTabsAdapterReturn {
  sessions: EditorSession[]
  activeKey: string | null
  closeTab: (key: string) => Promise<boolean>
  switchTab: (key: string) => void
}

const CREATING_KEY = '__new__'

export function useEditorTabsAdapter({
  moduleKey,
  editRecord,
  editorOpen,
  configTitle,
  onCloseEditor,
}: UseEditorTabsAdapterOptions): UseEditorTabsAdapterReturn {
  const {
    sessions,
    activeKey,
    openTab,
    closeTab: baseCloseTab,
    switchTab,
  } = useEditorTabs({ moduleKey, maxSessions: 10 })

  const prevSyncedRef = useRef<{ key: string | null; dirty: boolean }>({
    key: null,
    dirty: false,
  })

  // Sync page state → tabs
  useEffect(() => {
    if (editorOpen && editRecord !== undefined) {
      const record = editRecord as Record<string, unknown> | null
      const key = record?.id ? String(record.id) : CREATING_KEY
      const title = record?.id
        ? ((record.primaryNo as string) ||
            (record.docNo as string) ||
            String(record.id))
        : `新建 — ${configTitle}`

      if (key !== prevSyncedRef.current.key) {
        openTab(key, title)
        prevSyncedRef.current.key = key
        prevSyncedRef.current.dirty = false
      }
    }

    if (!editorOpen && prevSyncedRef.current.key !== null) {
      prevSyncedRef.current.key = null
      prevSyncedRef.current.dirty = false
    }
  }, [editorOpen, editRecord, configTitle, openTab])

  // When user closes tab, propagate to page-level close
  const closeTab = useCallback(
    async (key: string): Promise<boolean> => {
      const result = await baseCloseTab(key)
      if (result) {
        prevSyncedRef.current.key = null
        prevSyncedRef.current.dirty = true
        // Use setTimeout to break the render cycle
        setTimeout(() => onCloseEditor(), 0)
      }
      return result
    },
    [baseCloseTab, onCloseEditor],
  )

  return { sessions, activeKey, closeTab, switchTab }
}
