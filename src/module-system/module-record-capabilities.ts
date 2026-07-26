import {
  isDeleteBlockedByStatus,
  isEditBlockedByStatus,
} from '@/module-system/module-behavior-registry'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import { readModuleRecordField } from '@/module-system/module-record-fields'

interface ModuleRecordCapabilities {
  canEdit: boolean
  canDelete: boolean
}

export function resolveModuleRecordCapabilities(
  record: object,
  moduleKey?: string,
): ModuleRecordCapabilities {
  const isDeleted = isDeletedModuleRecord(record)

  return {
    canEdit:
      !isDeleted &&
      !isEditBlockedByStatus(
        readModuleRecordField(record, 'status'),
        moduleKey,
      ),
    canDelete:
      !isDeleted &&
      !isDeleteBlockedByStatus(
        readModuleRecordField(record, 'status'),
        moduleKey,
      ),
  }
}
