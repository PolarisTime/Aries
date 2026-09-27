import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import { getModuleDeliveryVerification } from '@/module-system/behavior/module-page-behaviors'
import { resolveModuleActionIcon } from '@/module-system/presentation/module-action-icons'
import { resolveRecordPrimaryNo } from '@/module-system/record/module-record-clipboard'
import { isDeletedModuleRecord } from '@/module-system/record/module-record-deletion'
import { useCopyDocNo } from '@/module-system/record/use-module-record-clipboard'
import type { ModuleRecord } from '@/types/module-page'

interface Props {
  moduleKey: string
  isReadOnly?: boolean
  /** 主单号字段（config.primaryNoKey）；缺失或无值时不渲染「复制单号」。 */
  primaryNoKey?: string
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
  primaryNoKey,
  attachmentCounts = {},
  onAttach,
  onDetail,
  onEdit,
  canEditRecord,
  onStatusChange,
  detailActionLabel,
}: Props) {
  const { t } = useTranslation()
  const copyDocNo = useCopyDocNo()

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
    // 复制单号只读也可用（不改变数据），但必须存在真实单号
    const primaryNo = resolveRecordPrimaryNo(record, primaryNoKey)
    if (primaryNo) {
      const copyLabel = t('hooks.recordActions.copyDocNo')
      items.push({
        key: 'copy-doc-no',
        label: copyLabel,
        icon: resolveModuleActionIcon(copyLabel),
        onClick: () => copyDocNo(primaryNo),
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
    const deliveryVerification = getModuleDeliveryVerification(moduleKey)
    if (
      deliveryVerification &&
      record.status === deliveryVerification.sourceStatus &&
      !isDeletedModuleRecord(record) &&
      onStatusChange
    ) {
      items.push({
        key: 'confirm-delivery-verification',
        label: t('hooks.recordActions.confirmDeliveryVerification'),
        icon: resolveModuleActionIcon('审核'),
        onClick: () =>
          onStatusChange(record, deliveryVerification.targetStatus),
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
