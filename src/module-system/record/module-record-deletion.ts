import { DOCUMENT_STATUS } from '@/constants/status-constants'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import { asString } from '@/utils/type-narrowing'

/** 前端合成的「已删除」展示状态 code：后端用 deletedFlag 表达，不落 status 列。 */
const DELETED_STATUS = DOCUMENT_STATUS.DELETED

export function isDeletedModuleRecord(
  record: object | null | undefined,
): boolean {
  if (!record) {
    return false
  }

  return (
    readModuleRecordField(record, 'deletedFlag') === true ||
    readModuleRecordField(record, 'deleteFlag') === true ||
    readModuleRecordField(record, 'deleted_flag') === true
  )
}

export function getDisplayStatus(record: object, statusKey = 'status'): string {
  if (isDeletedModuleRecord(record)) {
    return DELETED_STATUS
  }

  return asString(readModuleRecordField(record, statusKey))
}
