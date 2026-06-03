import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
  updateBusinessModuleStatus,
} from '@/api/business'
import {
  canAuditFromStatus,
  canReverseAuditFromStatus,
} from '@/module-system/module-adapter-actions'
import { isDeleteBlockedByStatus } from '@/module-system/module-behavior-registry'
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
  refreshAndClearSelection: () => Promise<void>
}

export function useBusinessGridBatchActions({
  moduleKey,
  selectedRowKeys,
  selectedRows,
  listAuditTarget,
  listReverseAuditTarget,
  refreshAndClearSelection,
}: Props) {
  const { t } = useTranslation()

  const handleSelectedAuditRecords = () => {
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    if (!listAuditTarget) {
      message.warning(t('hooks.batchActions.noBatchAuditStatus'))
      return
    }

    const selected = selectedRows
    const eligible = selected.filter((record) =>
      canAuditFromStatus(
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
      ),
    )
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning(t('hooks.batchActions.auditNotSupported'))
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchAudit'),
      content: t('hooks.batchActions.batchAuditConfirm', {
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
                  : t('hooks.batchActions.auditFailed')
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.auditCompletedWithFailures', {
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
            t('hooks.batchActions.auditSuccess', {
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
    const eligible = selected.filter((r) => !isDeleteBlockedByStatus(r.status))
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
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    if (!listReverseAuditTarget) {
      message.warning(t('hooks.batchActions.noBatchReverseAuditStatus'))
      return
    }

    const selected = selectedRows
    const eligible = selected.filter((record) =>
      canReverseAuditFromStatus(
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
      ),
    )
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning(t('hooks.batchActions.reverseAuditNotSupported'))
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchReverseAudit'),
      content: t('hooks.batchActions.batchReverseAuditConfirm', {
        count: eligible.length,
        skippedPart:
          skippedCount > 0
            ? t('hooks.batchActions.skippedPart', { count: skippedCount })
            : '',
      }),
      onOk: async () => {
        const reverseAuditResults = await Promise.allSettled(
          eligible.map((record) =>
            updateBusinessModuleStatus(
              moduleKey,
              String(record.id),
              listReverseAuditTarget.value,
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
                  : t('hooks.batchActions.reverseAuditFailed')
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.reverseAuditCompletedWithFailures', {
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
            t('hooks.batchActions.reverseAuditSuccess', {
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

  const markSelectedFreightDelivered = () => {
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectFreight'))
      return
    }

    modal.confirm({
      title: t('hooks.batchActions.batchMarkDelivered'),
      content: t('hooks.batchActions.batchMarkDeliveredConfirm', {
        count: selectedRowKeys.length,
      }),
      onOk: async () => {
        const deliveredResults = await Promise.allSettled(
          selectedRowKeys.map((id) =>
            getBusinessModuleDetail('freight-bill', id).then((detail) =>
              saveBusinessModule('freight-bill', {
                ...detail.data,
                deliveryStatus: '已送达',
              }),
            ),
          ),
        )
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const result of deliveredResults) {
          if (result.status === 'fulfilled') {
            successCount += 1
          } else {
            failedCount += 1
            if (!firstError) {
              firstError =
                result.reason instanceof Error
                  ? result.reason.message
                  : t('hooks.batchActions.markDeliveredFailed')
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            t('hooks.batchActions.markDeliveredCompletedWithFailures', {
              successCount,
              failedCount,
              errorPart: firstError ? `；${firstError}` : '',
            }),
          )
        } else {
          message.success(
            t('hooks.batchActions.markDeliveredSuccess', { successCount }),
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
    markSelectedFreightDelivered,
  }
}
