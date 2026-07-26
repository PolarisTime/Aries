import { readModuleRecordField } from '@/module-system/module-record-fields'
import { asString } from '@/utils/type-narrowing'

const DELETED_STATUS = '已删除'

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
