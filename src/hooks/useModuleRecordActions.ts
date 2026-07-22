import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import { resolveModuleActionIcon } from '@/module-system/module-action-icons'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  isReadOnly?: boolean
  attachmentCounts?: Record<string, number>
  onAttach: (record: ModuleRecord) => void
  onDetail?: (record: ModuleRecord) => void
  onEdit?: (record: ModuleRecord) => void
  canEditRecord?: (record: ModuleRecord) => boolean
  onStatusChange?: (record: ModuleRecord, status: string) => void
  detailActionLabel?: string
}

export function useModuleRecordActions({
  moduleKey,
  isReadOnly = false,
  attachmentCounts = {},
  onAttach,
  onDetail,
  onEdit,
  canEditRecord,
  onStatusChange,
  detailActionLabel,
}: Props) {
  const { t } = useTranslation()

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
    if (onDetail) {
      items.push({
        key: 'detail',
        label: detailActionLabel || t('hooks.recordActions.view'),
        icon: resolveModuleActionIcon(detailActionLabel || '查看'),
        onClick: () => onDetail(record),
      })
    }
    if (isReadOnly) {
      return items
    }
    if (onEdit && (canEditRecord?.(record) ?? true)) {
      items.push({
        key: 'edit',
        label: t('hooks.recordActions.edit'),
        icon: resolveModuleActionIcon('编辑'),
        onClick: () => onEdit(record),
      })
    }
    if (
      moduleKey === 'sales-order' &&
      record.status === '交付核定' &&
      !isDeletedModuleRecord(record) &&
      onStatusChange
    ) {
      items.push({
        key: 'confirm-delivery-verification',
        label: t('hooks.recordActions.confirmDeliveryVerification'),
        icon: resolveModuleActionIcon('审核'),
        onClick: () => onStatusChange(record, '完成销售'),
      })
    }
    {
      const attachmentLabel = t('hooks.recordActions.attachment')
      const attachmentCount = resolveAttachmentCount(record)
      items.push({
        key: 'attach',
        label:
          attachmentCount > 0
            ? `${attachmentLabel}(${attachmentCount})`
            : attachmentLabel,
        icon: resolveModuleActionIcon('附件'),
        onClick: () => onAttach(record),
      })
    }
    return items
  }

  return { buildActions }
}
