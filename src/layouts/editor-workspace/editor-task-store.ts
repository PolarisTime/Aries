import { createJSONStorage, persist } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import {
  sortEditorTasksByRecent,
  upsertEditorTask,
} from '@/layouts/editor-workspace/editor-task-model'
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
  closeMany: (keys: string[]) => number
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
        const lastActivatedAt = Date.now()
        set((state) => ({
          tasks: upsertEditorTask(state.tasks, {
            ...task,
            lastActivatedAt,
          }),
          activeKey: task.key,
        }))
      },
      activate: (key) => {
        if (!get().tasks.some((task) => task.key === key)) {
          return false
        }
        const lastActivatedAt = Date.now()
        set((state) => ({
          activeKey: key,
          tasks: state.tasks.map((task) =>
            task.key === key ? { ...task, lastActivatedAt } : task,
          ),
        }))
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
        return get().closeMany([key]) > 0
      },
      closeMany: (keys) => {
        const state = get()
        const requestedKeys = new Set(keys)
        const closingTasks = state.tasks.filter(
          (task) =>
            requestedKeys.has(task.key) &&
            task.closable &&
            task.status !== 'saving',
        )
        if (!closingTasks.length) {
          return 0
        }

        const closingKeys = new Set(closingTasks.map((task) => task.key))
        const tasks = state.tasks.filter((task) => !closingKeys.has(task.key))
        const activeTask = closingTasks.find(
          (task) => task.key === state.activeKey,
        )
        const fallbackTask = activeTask
          ? sortEditorTasksByRecent(
              tasks.filter((task) => task.userKey === activeTask.userKey),
            )[0]
          : undefined
        set({
          tasks,
          activeKey: activeTask ? (fallbackTask?.key ?? null) : state.activeKey,
        })
        return closingTasks.length
      },
      requestResume: (key) => {
        if (!get().tasks.some((task) => task.key === key)) {
          return false
        }
        const lastActivatedAt = Date.now()
        set((state) => ({
          activeKey: key,
          resumeKey: key,
          tasks: state.tasks.map((task) =>
            task.key === key ? { ...task, lastActivatedAt } : task,
          ),
        }))
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
          const activeTaskRemoved = state.tasks.some(
            (task) => task.key === state.activeKey && task.userKey === userKey,
          )
          return {
            tasks,
            activeKey: activeTaskRemoved ? null : state.activeKey,
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
