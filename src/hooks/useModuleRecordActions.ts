import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'
import { isEditBlockedByStatus } from '@/module-system/module-behavior-registry'

interface Props {
  moduleKey: string
  resourceKey?: string
  onEdit: (record: ModuleRecord) => void
  onAttach: (record: ModuleRecord) => void
  onRefresh: () => Promise<void>
  onDetail?: (record: ModuleRecord) => void
}

export function useModuleRecordActions({
  moduleKey,
  resourceKey,
  onEdit,
  onAttach,
  onRefresh,
  onDetail,
}: Props) {
  const { t } = useTranslation()
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey

  const buildActions = useCallback(
    (record: ModuleRecord): ActionItem[] => {
      const items: ActionItem[] = []
      const editBlocked = isEditBlockedByStatus(record.status)
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
        const canAudit = record.status === '草稿'
        const canReverse = record.status === '已审核'
        if (canAudit || canReverse) {
          items.push({
            key: 'audit',
            label: canAudit ? t('hooks.recordActions.audit') : t('hooks.recordActions.reverseAudit'),
            onClick: () => onEdit(record),
          })
        }
      }
      return items
    },
    [can, resource, moduleKey, onEdit, onAttach, onRefresh, onDetail, t],
  )

  return { buildActions }
}
