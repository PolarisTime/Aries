import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import { upsertEditorTask } from '@/layouts/editor-workspace/editor-task-model'
import type {
  EditorTask,
  EditorTaskStatus,
} from '@/layouts/editor-workspace/editor-task-types'

interface EditorTaskState {
  tasks: EditorTask[]
  activeKey: string | null
  resumeKey: string | null
  open: (task: EditorTask) => void
  activate: (key: string) => boolean
  updateStatus: (
    key: string,
    status: EditorTaskStatus,
    updatedAt?: number,
  ) => void
  close: (key: string) => boolean
  requestResume: (key: string) => boolean
  consumeResume: (key: string) => boolean
  clearUser: (userKey: string) => void
  reset: () => void
}

export const editorTaskStore = createStore<EditorTaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeKey: null,
      resumeKey: null,
      open: (task) => {
        set((state) => ({
          tasks: upsertEditorTask(state.tasks, task),
          activeKey: task.key,
        }))
      },
      activate: (key) => {
        if (!get().tasks.some((task) => task.key === key)) {
          return false
        }
        set({ activeKey: key })
        return true
      },
      updateStatus: (key, status, updatedAt = Date.now()) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.key === key ? { ...task, status, updatedAt } : task,
          ),
        }))
      },
      close: (key) => {
        const state = get()
        const closingIndex = state.tasks.findIndex((task) => task.key === key)
        if (
          closingIndex < 0 ||
          state.tasks[closingIndex]?.status === 'saving'
        ) {
          return false
        }

        const tasks = state.tasks.filter((task) => task.key !== key)
        const fallbackTask =
          tasks[Math.max(0, closingIndex - 1)] ?? tasks.at(-1)
        set({
          tasks,
          activeKey:
            state.activeKey === key
              ? (fallbackTask?.key ?? null)
              : state.activeKey,
        })
        return true
      },
      requestResume: (key) => {
        if (!get().tasks.some((task) => task.key === key)) {
          return false
        }
        set({ activeKey: key, resumeKey: key })
        return true
      },
      consumeResume: (key) => {
        if (get().resumeKey !== key) {
          return false
        }
        set({ resumeKey: null })
        return true
      },
      clearUser: (userKey) => {
        set((state) => {
          const tasks = state.tasks.filter((task) => task.userKey !== userKey)
          const activeTask = tasks.find((task) => task.key === state.activeKey)
          return {
            tasks,
            activeKey: activeTask?.key ?? tasks.at(-1)?.key ?? null,
          }
        })
      },
      reset: () => set({ tasks: [], activeKey: null, resumeKey: null }),
    }),
    {
      name: 'aries-editor-task-index',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        tasks: state.tasks,
        activeKey: state.activeKey,
      }),
    },
  ),
)

export const getEditorTasksForUser = (userKey: string): EditorTask[] =>
  editorTaskStore.getState().tasks.filter((task) => task.userKey === userKey)
