import type {
  EditorTask,
  EditorTaskIdentity,
  EditorTaskMigration,
} from '@/layouts/editor-workspace/editor-task-types'

const normalizeIdentityPart = (value: string): string => value.trim()

export const getEditorTaskLastActivatedAt = (task: EditorTask): number =>
  Number.isFinite(task.lastActivatedAt) ? task.lastActivatedAt : task.updatedAt

export const sortEditorTasksByRecent = (tasks: EditorTask[]): EditorTask[] =>
  [...tasks].sort(
    (left, right) =>
      getEditorTaskLastActivatedAt(right) - getEditorTaskLastActivatedAt(left),
  )

export const buildEditorTaskKey = (identity: EditorTaskIdentity): string => {
  const userKey = normalizeIdentityPart(identity.userKey)
  const moduleKey = normalizeIdentityPart(identity.moduleKey)
  const recordId = normalizeIdentityPart(identity.recordId)

  if (!userKey || !moduleKey || !recordId) {
    throw new Error('Editor task identity is incomplete')
  }

  return [userKey, moduleKey, identity.mode, recordId].join(':')
}

export const upsertEditorTask = (
  tasks: EditorTask[],
  task: EditorTask,
): EditorTask[] => {
  const existingIndex = tasks.findIndex((item) => item.key === task.key)
  if (existingIndex < 0) {
    return [...tasks, task]
  }

  return tasks.map((item, index) => (index === existingIndex ? task : item))
}

export const migrateEditorTask = (
  tasks: EditorTask[],
  sourceKey: string,
  migration: EditorTaskMigration,
): EditorTask[] => {
  const sourceTask = tasks.find((item) => item.key === sourceKey)
  if (!sourceTask) {
    return tasks
  }

  const migratedTask: EditorTask = {
    ...sourceTask,
    ...migration,
    key: buildEditorTaskKey({
      userKey: sourceTask.userKey,
      moduleKey: sourceTask.moduleKey,
      mode: migration.mode,
      recordId: migration.recordId,
    }),
  }
  const withoutSource = tasks.filter((item) => item.key !== sourceKey)
  return upsertEditorTask(withoutSource, migratedTask)
}
