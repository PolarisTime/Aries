import i18next from 'i18next'
import { usesSnowflakeBusinessNo } from '@/module-system/business-no-policy'
import { syncDerivedEditorFormValuesForModule } from '@/module-system/module-adapter-editor'
import { readModuleRecordField } from '@/module-system/module-record-fields'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleRecordInput,
} from '@/types/module-page'
import { getStoredUser } from '@/utils/storage'
import { asString } from '@/utils/type-narrowing'
import { normalizeRecordForEditor } from '@/views/modules/module-editor-record-normalization'

export interface EditorAuditTarget {
  key: string
  value: string
}

export type SubmissionAction = 'save' | 'save-and-audit' | 'save-and-complete'

export interface SubmissionState {
  action: SubmissionAction | null
  idempotencyKey: string | null
  inFlight: boolean
  sessionKey: string | null
}

export interface SubmissionRef {
  current: SubmissionState
}

export interface WorkspaceFormApi {
  validateFields: () => Promise<ModuleRecordInput>
  getFieldsValue: (all?: boolean) => ModuleRecordInput
  setFieldsValue: (values: Partial<ModuleRecordInput>) => void
  resetFields: () => void
}

export type EditorFormValues = ModuleRecordInput

export type FormChangedValues = Partial<EditorFormValues>

export function sumLineItemsBy(nextItems: ModuleLineItem[], key: string) {
  return nextItems.reduce((sum, item) => sum + Number(item[key] || 0), 0)
}

export function isAntdFormValidationError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false
  const value = error as Record<string, unknown>
  return (
    Array.isArray(value.errorFields) &&
    typeof value.values === 'object' &&
    value.values !== null
  )
}

export function getCurrentOperatorName() {
  const user = getStoredUser()
  if (user) {
    return String(
      user.userName ||
        user.loginName ||
        i18next.t('modules.editorWorkspace.currentUserFallback'),
    )
  }
  return i18next.t('modules.editorWorkspace.currentUserFallback')
}

export function getAuthoritativePrimaryNo(
  moduleKey: string,
  primaryNoKey: string | undefined,
  record: object | null | undefined,
) {
  if (
    !record ||
    !primaryNoKey ||
    !usesSnowflakeBusinessNo(moduleKey, primaryNoKey)
  ) {
    return ''
  }
  return asString(readModuleRecordField(record, primaryNoKey)).trim()
}

export function applyAuthoritativePrimaryNo(
  record: EditorFormValues,
  primaryNoKey: string | undefined,
  authoritativePrimaryNo: string,
) {
  if (!primaryNoKey || !authoritativePrimaryNo) {
    return record
  }
  record[primaryNoKey] = authoritativePrimaryNo
  return record
}

export function invalidateSubmissionIntent(
  state: SubmissionState,
  expectedIdempotencyKey?: string,
) {
  if (
    expectedIdempotencyKey &&
    state.idempotencyKey !== expectedIdempotencyKey
  ) {
    return
  }
  state.action = null
  state.idempotencyKey = null
}

export function syncEditorFormValues(args: {
  config: ModulePageConfig
  form: WorkspaceFormApi
  moduleKey: string
  items: ModuleLineItem[]
  changedValues?: FormChangedValues
}) {
  const { config, form, moduleKey, items, changedValues } = args
  const currentValues = form.getFieldsValue(true)
  const changedKeys = new Set(Object.keys(changedValues || {}))
  const nextValues = syncDerivedEditorFormValuesForModule({
    moduleKey,
    record: { ...currentValues, ...changedValues },
    items,
    sumLineItemsBy,
    changedKeys,
  })
  form.setFieldsValue(normalizeRecordForEditor(config, nextValues))
}
