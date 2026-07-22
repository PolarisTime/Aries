import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  updateBusinessModuleStatus,
} from '@/api/business'
import {
  canAuditFromStatus,
  resolveReverseAuditTargetForStatus,
  resolveStatusChangeActionLabelKey,
  type StatusChangeActionKind,
} from '@/module-system/module-adapter-actions'
import { resolveModuleRecordCapabilities } from '@/module-system/module-record-capabilities'
import { isDeletedModuleRecord } from '@/module-system/module-record-deletion'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'

export interface AuditTarget {
  key: string
  value: string
}

interface Props {
  moduleKey: string
  selectedRowKeys: string[]
  selectedRows: ModuleRecord[]
  listAuditTarget: AuditTarget | null
  listReverseAuditTarget: AuditTarget | null
  listAuditSourceStatuses?: string[]
  listAuditActionKind: StatusChangeActionKind | null
  listReverseAuditActionKind: StatusChangeActionKind | null
  refreshAndClearSelection: () => Promise<void>
}

export function useBusinessGridBatchActions({
  moduleKey,
  selectedRowKeys,
  selectedRows,
  listAuditTarget,
  listReverseAuditTarget,
  listAuditSourceStatuses,
  listAuditActionKind,
  listReverseAuditActionKind,
  refreshAndClearSelection,
}: Props) {
  const { t } = useTranslation()

  const handleSelectedAuditRecords = () => {
    const actionLabel = t(
      resolveStatusChangeActionLabelKey(listAuditActionKind || 'audit'),
    )
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    if (!listAuditTarget) {
      message.warning(
        t('hooks.batchActions.noBatchStatus', { action: actionLabel }),
      )
      return
    }

    const selected = selectedRows
    const eligible = selected.filter(
      (record) =>
        !isDeletedModuleRecord(record) &&
        canAuditFromStatus(
          record.status,
          listAuditTarget,
          listReverseAuditTarget,
          listAuditSourceStatuses,
        ),
    )
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning(
        t('hooks.batchActions.actionNotSupported', { action: actionLabel }),
      )
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchAction', { action: actionLabel }),
      content: t('hooks.batchActions.batchActionConfirm', {
        action: actionLabel,
        count: eligible.length,
        skippedPart:
          skippedCount > 0
            ? t('hooks.batchActions.skippedPart', { count: skippedCount })
            : '',
      }),
      onOk: async () => {
        const auditResults = await Promise.allSettled(
          eligible.map((record) =>
            updateBusinessModuleStatus(
              moduleKey,
              String(record.id),
              listAuditTarget.value,
            ),
          ),
        )
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const result of auditResults) {
          if (result.status === 'fulfilled') {
            successCount += 1
          } else {
            failedCount += 1
            if (!firstError) {
              firstError =
                result.reason instanceof Error
                  ? result.reason.message
                  : t('hooks.batchActions.actionFailed', {
                      action: actionLabel,
                    })
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.actionCompletedWithFailures', {
              action: actionLabel,
              successCount,
              failedCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
              errorPart: firstError ? `；${firstError}` : '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.actionSuccess', {
              action: actionLabel,
              successCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
            }),
          )
        }
        await refreshAndClearSelection()
      },
    })
  }

  const handleSelectedDeleteRecords = () => {
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }

    const selected = selectedRows
    const eligible = selected.filter(
      (record) => resolveModuleRecordCapabilities(record, moduleKey).canDelete,
    )
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning(t('hooks.batchActions.deleteNotSupported'))
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchDelete'),
      content: t('hooks.batchActions.batchDeleteConfirm', {
        count: eligible.length,
        skippedPart:
          skippedCount > 0
            ? t('hooks.batchActions.skippedPart', { count: skippedCount })
            : '',
      }),
      okButtonProps: { danger: true },
      onOk: async () => {
        const deleteResults = await Promise.allSettled(
          eligible.map((record) =>
            deleteBusinessModule(moduleKey, String(record.id)),
          ),
        )
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const result of deleteResults) {
          if (result.status === 'fulfilled') {
            successCount += 1
          } else {
            failedCount += 1
            if (!firstError) {
              firstError =
                result.reason instanceof Error
                  ? result.reason.message
                  : t('hooks.batchActions.deleteFailed')
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.deleteCompletedWithFailures', {
              successCount,
              failedCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
              errorPart: firstError ? `；${firstError}` : '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.deleteSuccess', {
              successCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
            }),
          )
        }
        await refreshAndClearSelection()
      },
    })
  }

  const handleSelectedReverseAuditRecords = () => {
    const actionLabel = t(
      resolveStatusChangeActionLabelKey(
        listReverseAuditActionKind || 'reverseAudit',
      ),
    )
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    if (!listReverseAuditTarget) {
      message.warning(
        t('hooks.batchActions.noBatchStatus', { action: actionLabel }),
      )
      return
    }

    const selected = selectedRows
    const eligible = selected.flatMap((record) => {
      if (isDeletedModuleRecord(record)) {
        return []
      }
      const targetStatus = resolveReverseAuditTargetForStatus(
        moduleKey,
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
      )
      return targetStatus ? [{ record, targetStatus }] : []
    })
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning(
        t('hooks.batchActions.actionNotSupported', { action: actionLabel }),
      )
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchAction', { action: actionLabel }),
      content: t('hooks.batchActions.batchActionConfirm', {
        action: actionLabel,
        count: eligible.length,
        skippedPart:
          skippedCount > 0
            ? t('hooks.batchActions.skippedPart', { count: skippedCount })
            : '',
      }),
      onOk: async () => {
        const reverseAuditResults = await Promise.allSettled(
          eligible.map(({ record, targetStatus }) =>
            updateBusinessModuleStatus(
              moduleKey,
              String(record.id),
              targetStatus,
            ),
          ),
        )
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const result of reverseAuditResults) {
          if (result.status === 'fulfilled') {
            successCount += 1
          } else {
            failedCount += 1
            if (!firstError) {
              firstError =
                result.reason instanceof Error
                  ? result.reason.message
                  : t('hooks.batchActions.actionFailed', {
                      action: actionLabel,
                    })
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.actionCompletedWithFailures', {
              action: actionLabel,
              successCount,
              failedCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
              errorPart: firstError ? `；${firstError}` : '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.actionSuccess', {
              action: actionLabel,
              successCount,
              skippedPart:
                skippedCount > 0
                  ? t('hooks.batchActions.skippedCount', {
                      count: skippedCount,
                    })
                  : '',
            }),
          )
        }
        await refreshAndClearSelection()
      },
    })
  }

  return {
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
  }
}
