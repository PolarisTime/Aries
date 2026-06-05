import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import { isEditBlockedByStatus } from '@/module-system/module-behavior-registry'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  resourceKey?: string
  isReadOnly?: boolean
  onEdit: (record: ModuleRecord) => void
  onAttach: (record: ModuleRecord) => void
  onDetail?: (record: ModuleRecord) => void
}

export function useModuleRecordActions({
  moduleKey,
  resourceKey,
  isReadOnly = false,
  onEdit,
  onAttach,
  onDetail,
}: Props) {
  const { t } = useTranslation()
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey

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
    if (isReadOnly) {
      return items
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
    return items
  }

  return { buildActions }
}
