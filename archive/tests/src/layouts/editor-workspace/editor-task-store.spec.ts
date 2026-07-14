import { beforeEach, describe, expect, it } from 'vitest'
import {
  editorTaskStore,
  getEditorTasksForUser,
} from '@/layouts/editor-workspace/editor-task-store'
import type { EditorTask } from '@/layouts/editor-workspace/editor-task-types'

const task = (
  userKey: string,
  moduleKey: string,
  recordId: string,
): EditorTask => ({
  key: `${userKey}:${moduleKey}:edit:${recordId}`,
  userKey,
  moduleKey,
  mode: 'edit',
  recordId,
  path: `/${moduleKey}`,
  title: `${moduleKey} ${recordId}`,
  status: 'clean',
  updatedAt: 1000,
  closable: true,
})

describe('editor task store', () => {
  beforeEach(() => {
    editorTaskStore.getState().reset()
  })

  it('opens and activates a task', () => {
    const salesTask = task('user-1', 'sales-order', '100')

    editorTaskStore.getState().open(salesTask)

    expect(editorTaskStore.getState().tasks).toEqual([salesTask])
    expect(editorTaskStore.getState().activeKey).toBe(salesTask.key)
  })

  it('activates an existing task without duplicating it', () => {
    const salesTask = task('user-1', 'sales-order', '100')
    editorTaskStore.getState().open(salesTask)
    editorTaskStore
      .getState()
      .open({ ...salesTask, title: '销售订单 SO-100', updatedAt: 2000 })

    expect(editorTaskStore.getState().tasks).toHaveLength(1)
    expect(editorTaskStore.getState().tasks[0]?.title).toBe('销售订单 SO-100')
  })

  it('isolates tasks by user', () => {
    const firstUserTask = task('user-1', 'sales-order', '100')
    const secondUserTask = task('user-2', 'purchase-order', '200')
    editorTaskStore.getState().open(firstUserTask)
    editorTaskStore.getState().open(secondUserTask)

    expect(getEditorTasksForUser('user-1')).toEqual([firstUserTask])
    expect(getEditorTasksForUser('user-2')).toEqual([secondUserTask])
  })

  it('updates status without replacing task identity', () => {
    const salesTask = task('user-1', 'sales-order', '100')
    editorTaskStore.getState().open(salesTask)

    editorTaskStore.getState().updateStatus(salesTask.key, 'dirty', 2000)

    expect(editorTaskStore.getState().tasks[0]).toMatchObject({
      key: salesTask.key,
      status: 'dirty',
      updatedAt: 2000,
    })
  })

  it('refuses to close a saving task', () => {
    const savingTask = {
      ...task('user-1', 'sales-order', '100'),
      status: 'saving' as const,
    }
    editorTaskStore.getState().open(savingTask)

    expect(editorTaskStore.getState().close(savingTask.key)).toBe(false)
    expect(editorTaskStore.getState().tasks).toEqual([savingTask])
  })

  it('closes a task and activates the previous task', () => {
    const salesTask = task('user-1', 'sales-order', '100')
    const purchaseTask = task('user-1', 'purchase-order', '200')
    editorTaskStore.getState().open(salesTask)
    editorTaskStore.getState().open(purchaseTask)

    expect(editorTaskStore.getState().close(purchaseTask.key)).toBe(true)
    expect(editorTaskStore.getState().activeKey).toBe(salesTask.key)
  })

  it('clears only the specified user tasks', () => {
    const firstUserTask = task('user-1', 'sales-order', '100')
    const secondUserTask = task('user-2', 'purchase-order', '200')
    editorTaskStore.getState().open(firstUserTask)
    editorTaskStore.getState().open(secondUserTask)

    editorTaskStore.getState().clearUser('user-1')

    expect(editorTaskStore.getState().tasks).toEqual([secondUserTask])
  })

  it('requests and consumes an explicit task resume without reopening on normal navigation', () => {
    const salesTask = task('user-1', 'sales-order', '100')
    editorTaskStore.getState().open(salesTask)

    expect(editorTaskStore.getState().requestResume(salesTask.key)).toBe(true)
    expect(editorTaskStore.getState().resumeKey).toBe(salesTask.key)
    expect(editorTaskStore.getState().consumeResume(salesTask.key)).toBe(true)
    expect(editorTaskStore.getState().resumeKey).toBeNull()
  })
})
