import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  resourceKey?: string
  isReadOnly?: boolean
  onAttach: (record: ModuleRecord) => void
  onDetail?: (record: ModuleRecord) => void
  detailActionLabel?: string
}

export function useModuleRecordActions({
  moduleKey,
  resourceKey,
  isReadOnly = false,
  onAttach,
  onDetail,
  detailActionLabel,
}: Props) {
  const { t } = useTranslation()
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey

  const buildActions = (record: ModuleRecord): ActionItem[] => {
    const items: ActionItem[] = []
    if (onDetail && can(resource, 'read')) {
      items.push({
        key: 'detail',
        label: detailActionLabel || t('hooks.recordActions.view'),
        onClick: () => onDetail(record),
      })
    }
    if (isReadOnly) {
      return items
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
