import {
  isDeleteBlockedByStatus,
  isEditBlockedByStatus,
} from '@/module-system/module-behavior-registry'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import type { ModuleRecord } from '@/types/module-page'

interface ModuleRecordCapabilities {
  canEdit: boolean
  canDelete: boolean
}

export function resolveModuleRecordCapabilities(
  record: ModuleRecord,
  moduleKey?: string,
): ModuleRecordCapabilities {
  const isDeleted = isDeletedModuleRecord(record)

  return {
    canEdit: !isDeleted && !isEditBlockedByStatus(record.status, moduleKey),
    canDelete: !isDeleted && !isDeleteBlockedByStatus(record.status, moduleKey),
  }
}
