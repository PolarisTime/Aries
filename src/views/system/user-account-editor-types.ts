import type {
  UserAccountCreateResult,
  UserAccountRecord,
} from '@/types/user-account'
import type { UserAccountEditorMode } from '@/views/system/user-account-view-utils'

export interface UserAccountEditorFormValues {
  loginName: string
  password: string
  userName: string
  mobile: string
  departmentId: string | null
  roleNames: string[]
  dataScope: string
  permissionSummary: string
  status: string
  remark: string
}

export interface UserAccountEditorState {
  editorOpen: boolean
  editorMode: UserAccountEditorMode
  editorLoading: boolean
  editingId: string | null
  loginNameValidationMessage: string
  loginNameChecking: boolean
  createResultOpen: boolean
  createResult: UserAccountCreateResult | null
}

export interface LoginNameValidationResult {
  available: boolean
  message: string
}

export type UserAccountDetailRecord = UserAccountRecord
