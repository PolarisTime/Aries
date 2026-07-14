import { useTranslation } from 'react-i18next'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  updateBusinessModuleStatus,
} from '@/api/business'
import { auditPurchaseInbound } from '@/api/document-flow-commands'
import {
  canAuditFromStatus,
  resolveReverseAuditTargetForStatus,
} from '@/module-system/module-adapter-actions'
import { isDeleteBlockedByStatus } from '@/module-system/module-behavior-registry'
import { hasGeneratedSalesOutbound } from '@/module-system/module-record-guards'
import { requestPurchaseInboundAuditInput } from '@/module-system/purchase-inbound-audit-options'
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
  refreshAndClearSelection: () => Promise<void>
}

export function useBusinessGridBatchActions({
  moduleKey,
  selectedRowKeys,
  selectedRows,
  listAuditTarget,
  listReverseAuditTarget,
  listAuditSourceStatuses,
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

    if (moduleKey === 'purchase-inbound') {
      if (selectedRowKeys.length !== 1 || selectedRows.length !== 1) {
        message.warning('采购入库审核一次只能选择一张单据')
        return
      }
      const selectedRecord = selectedRows[0]
      if (
        !canAuditFromStatus(
          selectedRecord.status,
          listAuditTarget,
          listReverseAuditTarget,
          listAuditSourceStatuses,
        )
      ) {
        message.warning(t('hooks.batchActions.auditNotSupported'))
        return
      }
      void (async () => {
        try {
          const recordId = String(selectedRecord.id || '').trim()
          if (!recordId) {
            throw new Error('采购入库缺少稳定 ID，无法审核')
          }
          const detailResult = await getBusinessModuleDetail(
            'purchase-inbound',
            recordId,
          )
          const auditInput = await requestPurchaseInboundAuditInput(
            detailResult.data,
          )
          if (!auditInput) {
            return
          }
          await auditPurchaseInbound(recordId, auditInput)
          message.success('采购入库审核成功')
          await refreshAndClearSelection()
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : '采购入库审核失败',
          )
        }
      })()
      return
    }

    const selected = selectedRows
    const eligible = selected.filter((record) =>
      canAuditFromStatus(
        record.status,
        listAuditTarget,
        listReverseAuditTarget,
        listAuditSourceStatuses,
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
    const eligible = selected.filter(
      (record) =>
        !isDeleteBlockedByStatus(record.status, moduleKey) &&
        !(moduleKey === 'freight-bill' && hasGeneratedSalesOutbound(record)),
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
    if (!selectedRowKeys.length) {
      message.warning(t('hooks.batchActions.pleaseSelectRecords'))
      return
    }
    if (!listReverseAuditTarget) {
      message.warning(t('hooks.batchActions.noBatchReverseAuditStatus'))
      return
    }

    const selected = selectedRows
    const eligible = selected.flatMap((record) => {
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

  return {
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
  }
}
