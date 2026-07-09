import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const DELETED_STATUS = '已删除'

export function isDeletedModuleRecord(
  record: ModuleRecord | Record<string, unknown> | null | undefined,
): boolean {
  if (!record) {
    return false
  }

  return (
    record.deletedFlag === true ||
    record.deleteFlag === true ||
    record.deleted_flag === true
  )
}

export function getDisplayStatus(
  record: ModuleRecord | Record<string, unknown>,
  statusKey = 'status',
): string {
  if (isDeletedModuleRecord(record)) {
    return DELETED_STATUS
  }

  return asString(record[statusKey])
}
