import { useTranslation } from 'react-i18next'
import { updateBusinessModuleStatus } from '@/api/business'
import type { ActionItem } from '@/components/TableActions'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import {
  canAuditFromStatus,
  canReverseAuditFromStatus,
} from '@/module-system/module-adapter-actions'
import { isEditBlockedByStatus } from '@/module-system/module-behavior-registry'

interface AuditTarget {
  key: string
  value: string
}

interface Props {
  moduleKey: string
  resourceKey?: string
  listAuditTarget?: AuditTarget | null
  listReverseAuditTarget?: AuditTarget | null
  onEdit: (record: ModuleRecord) => void
  onAttach: (record: ModuleRecord) => void
  onRefresh: () => Promise<void>
  onDetail?: (record: ModuleRecord) => void
}

export function useModuleRecordActions({
  moduleKey,
  resourceKey,
  listAuditTarget,
  listReverseAuditTarget,
  onEdit,
  onAttach,
  onRefresh,
  onDetail,
}: Props) {
  const { t } = useTranslation()
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey
  const handleStatusChange = async (
    record: ModuleRecord,
    target: AuditTarget,
    successKey: 'auditSuccess' | 'reverseAuditSuccess',
    failedKey: 'auditFailed' | 'reverseAuditFailed',
  ) => {
    try {
      await updateBusinessModuleStatus(
        moduleKey,
        String(record.id),
        target.value,
      )
      message.success(
        t(`hooks.batchActions.${successKey}`, {
          successCount: 1,
          skippedPart: '',
        }),
      )
      await onRefresh()
    } catch (err) {
      message.error(
        err instanceof Error
          ? err.message
          : t(`hooks.batchActions.${failedKey}`),
      )
    }
  }

  const buildActions = (record: ModuleRecord): ActionItem[] => {
    const items: ActionItem[] = []
    const editBlocked = isEditBlockedByStatus(record.status, moduleKey)
    if (onDetail && can(resource, 'read')) {
      items.push({
        key: 'detail',
        label: t('hooks.recordActions.view'),
        onClick: () => onDetail(record),
      })
    }
    if (can(resource, 'update')) {
      items.push({
        key: 'edit',
        label: t('hooks.recordActions.edit'),
        disabled: editBlocked,
        onClick: () => onEdit(record),
      })
    }
    if (can(resource, 'read') || can(resource, 'update')) {
      items.push({
        key: 'attach',
        label: t('hooks.recordActions.attachment'),
        onClick: () => onAttach(record),
      })
    }
    if (can(resource, 'audit')) {
      const canAudit = canAuditFromStatus(
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
      )
      const canReverse = canReverseAuditFromStatus(
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
      )
      if (canAudit || canReverse) {
        const target = canReverse ? listReverseAuditTarget : listAuditTarget
        items.push({
          key: canReverse ? 'reverseAudit' : 'audit',
          label: canAudit
            ? t('hooks.recordActions.audit')
            : t('hooks.recordActions.reverseAudit'),
          onClick: () => {
            if (!target) return
            void handleStatusChange(
              record,
              target,
              canReverse ? 'reverseAuditSuccess' : 'auditSuccess',
              canReverse ? 'reverseAuditFailed' : 'auditFailed',
            )
          },
        })
      }
    }
    return items
  }

  return { buildActions }
}
