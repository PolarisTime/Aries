import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import { usePermissionStore } from '@/stores/permissionStore'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  resourceKey?: string
  isReadOnly?: boolean
  attachmentCounts?: Record<string, number>
  onAttach: (record: ModuleRecord) => void
  onDetail?: (record: ModuleRecord) => void
  detailActionLabel?: string
}

export function useModuleRecordActions({
  moduleKey,
  resourceKey,
  isReadOnly = false,
  attachmentCounts = {},
  onAttach,
  onDetail,
  detailActionLabel,
}: Props) {
  const { t } = useTranslation()
  const can = usePermissionStore((s) => s.can)
  const resource = resourceKey || moduleKey

  const resolveAttachmentCount = (record: ModuleRecord) => {
    const mappedCount = attachmentCounts[String(record.id)]
    if (typeof mappedCount === 'number') {
      return mappedCount
    }
    if (Array.isArray(record.attachments)) {
      return record.attachments.length
    }
    if (Array.isArray(record.attachmentIds)) {
      return record.attachmentIds.length
    }
    return 0
  }

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
      const attachmentLabel = t('hooks.recordActions.attachment')
      const attachmentCount = resolveAttachmentCount(record)
      items.push({
        key: 'attach',
        label:
          attachmentCount > 0
            ? `${attachmentLabel}(${attachmentCount})`
            : attachmentLabel,
        onClick: () => onAttach(record),
      })
    }
    return items
  }

  return { buildActions }
}
