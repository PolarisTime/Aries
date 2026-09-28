import { useTranslation } from 'react-i18next'
import type { ActionItem } from '@/components/TableActions'
import {
  canAuditFromStatus,
  resolveReverseAuditTargetForStatus,
  resolveStatusChangeActionKind,
  resolveStatusChangeActionLabelKey,
  type StatusChangeActionKind,
} from '@/module-system/adapter/module-adapter-actions'
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
  /** 审核能力：与批量入口同一口径（无权限 / 只读 / 未配置目标时不出现行级审核项）。 */
  canAuditRecords?: boolean
  listAuditTarget?: { value: string } | null
  listReverseAuditTarget?: { value: string } | null
  listAuditSourceStatuses?: string[]
  listAuditActionKind?: StatusChangeActionKind | null
  /**
   * 行级审核：只对菜单所属的这一行执行（实现上是批量核心的 `runAudit([record])`），
   * 即使该行同时属于多选集合也不会连带其它行。
   */
  onAuditRecord?: (record: ModuleRecord) => void
  /** 行级反审核：目标状态逐行解析后同样只作用于该行。 */
  onReverseAuditRecord?: (record: ModuleRecord) => void
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
  canAuditRecords = false,
  listAuditTarget,
  listReverseAuditTarget,
  listAuditSourceStatuses,
  listAuditActionKind,
  onAuditRecord,
  onReverseAuditRecord,
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
    /*
     * 行级审核/反审核：与批量入口共用同一套状态机判定，但按「菜单所属的这一行」判定与执行。
     * 允许审核与允许反审核互斥(见 canAuditFromStatus / resolveReverseAuditTargetForStatus)，
     * 因此同一行不会同时出现两项。
     */
    const auditActionLabel = t(
      resolveStatusChangeActionLabelKey(listAuditActionKind || 'audit'),
    )
    if (
      canAuditRecords &&
      onAuditRecord &&
      !isDeletedModuleRecord(record) &&
      canAuditFromStatus(
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
        listAuditSourceStatuses,
      )
    ) {
      const handleAudit = onAuditRecord
      items.push({
        key: 'audit',
        label: auditActionLabel,
        icon: resolveModuleActionIcon(auditActionLabel),
        onClick: () => handleAudit(record),
      })
    }
    const reverseAuditTarget =
      canAuditRecords && onReverseAuditRecord && !isDeletedModuleRecord(record)
        ? resolveReverseAuditTargetForStatus(
            moduleKey,
            record.status,
            listAuditTarget,
            listReverseAuditTarget,
          )
        : null
    if (reverseAuditTarget && onReverseAuditRecord) {
      const handleReverseAudit = onReverseAuditRecord
      // 文案跟随该行解析出的目标状态：回到「交付核定」是「重新核定」而不是「反审核」
      const reverseAuditLabel = t(
        resolveStatusChangeActionLabelKey(
          resolveStatusChangeActionKind(reverseAuditTarget, true),
        ),
      )
      items.push({
        key: 'reverse-audit',
        label: reverseAuditLabel,
        icon: resolveModuleActionIcon(reverseAuditLabel),
        onClick: () => handleReverseAudit(record),
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
