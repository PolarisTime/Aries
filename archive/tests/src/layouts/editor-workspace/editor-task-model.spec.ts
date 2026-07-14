import { describe, expect, it } from 'vitest'
import {
  buildEditorTaskKey,
  migrateEditorTask,
  upsertEditorTask,
} from '@/layouts/editor-workspace/editor-task-model'
import type { EditorTask } from '@/layouts/editor-workspace/editor-task-types'

const task = (overrides: Partial<EditorTask> = {}): EditorTask => ({
  key: 'user-1:sales-order:edit:100',
  userKey: 'user-1',
  moduleKey: 'sales-order',
  mode: 'edit',
  recordId: '100',
  path: '/sales-order',
  title: '销售订单 SO-100',
  status: 'clean',
  updatedAt: 1000,
  closable: true,
  ...overrides,
})

describe('editor task model', () => {
  it('builds a stable key scoped by user, module, mode and record', () => {
    expect(
      buildEditorTaskKey({
        userKey: ' user-1 ',
        moduleKey: ' sales-order ',
        mode: 'edit',
        recordId: ' 100 ',
      }),
    ).toBe('user-1:sales-order:edit:100')
  })

  it('rejects an incomplete task identity', () => {
    expect(() =>
      buildEditorTaskKey({
        userKey: '',
        moduleKey: 'sales-order',
        mode: 'edit',
        recordId: '100',
      }),
    ).toThrow('Editor task identity is incomplete')
  })

  it('deduplicates an existing task and refreshes its metadata', () => {
    const existing = task()
    const refreshed = task({
      title: '销售订单 SO-100（核价）',
      updatedAt: 2000,
    })

    expect(upsertEditorTask([existing], refreshed)).toEqual([refreshed])
  })

  it('keeps insertion order when adding another task', () => {
    const existing = task()
    const next = task({
      key: 'user-1:purchase-order:create:draft-1',
      moduleKey: 'purchase-order',
      mode: 'create',
      recordId: 'draft-1',
    })

    expect(upsertEditorTask([existing], next)).toEqual([existing, next])
  })

  it('migrates a saved create task to its stable edit identity atomically', () => {
    const createTask = task({
      key: 'user-1:sales-order:create:draft-1',
      mode: 'create',
      recordId: 'draft-1',
      title: '新建销售订单',
      status: 'dirty',
    })

    expect(
      migrateEditorTask([createTask], createTask.key, {
        mode: 'edit',
        recordId: '200',
        title: '销售订单 SO-200',
        status: 'clean',
        updatedAt: 3000,
      }),
    ).toEqual([
      task({
        key: 'user-1:sales-order:edit:200',
        mode: 'edit',
        recordId: '200',
        title: '销售订单 SO-200',
        status: 'clean',
        updatedAt: 3000,
      }),
    ])
  })

  it('does not create a duplicate when migration reaches an existing edit task', () => {
    const createTask = task({
      key: 'user-1:sales-order:create:draft-1',
      mode: 'create',
      recordId: 'draft-1',
    })
    const editTask = task()

    expect(
      migrateEditorTask([createTask, editTask], createTask.key, {
        mode: 'edit',
        recordId: '100',
        title: '销售订单 SO-100',
        status: 'clean',
        updatedAt: 3000,
      }),
    ).toEqual([
      task({
        title: '销售订单 SO-100',
        status: 'clean',
        updatedAt: 3000,
      }),
    ])
  })
})
