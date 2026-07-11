export type EditorTaskMode = 'create' | 'edit' | 'reconfirm'

export type EditorTaskStatus =
  | 'clean'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'readonly'

export interface EditorTaskIdentity {
  userKey: string
  moduleKey: string
  mode: EditorTaskMode
  recordId: string
}

export interface EditorTask extends EditorTaskIdentity {
  key: string
  path: string
  title: string
  status: EditorTaskStatus
  updatedAt: number
  closable: boolean
}

export interface EditorTaskMigration {
  mode: EditorTaskMode
  recordId: string
  title: string
  status: EditorTaskStatus
  updatedAt: number
}
