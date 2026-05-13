import { asString } from '@/utils/type-narrowing'
import { useCallback } from 'react'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business'
import type { ModuleRecord } from '@/types/module-page'
import { message, modal } from '@/utils/antd-app'
import {
  isDeleteBlockedByStatus,
  isEditBlockedByStatus,
} from '@/views/modules/module-behavior-registry'

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
  const handleSelectedAuditRecords = useCallback(() => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择记录')
      return
    }
    if (!listAuditTarget) {
      message.warning('当前模块未配置批量审核状态')
      return
    }

    const selected = selectedRows
    const auditStatus = String(listAuditTarget.value ?? '').trim()
    const eligible = selected.filter((r) => {
      const status = asString(r.status).trim()
      if (!status) return true
      if (status === auditStatus) return false
      return !isEditBlockedByStatus(status)
    })
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning('勾选单据当前状态不支持审核')
      return
    }

    modal.confirm({
      title: '批量审核',
      content: `确定审核选中的 ${eligible.length} 条记录吗？${
        skippedCount > 0 ? `另有 ${skippedCount} 条因状态不支持将跳过。` : ''
      }`,
      onOk: async () => {
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const record of eligible) {
          try {
            const detail = await getBusinessModuleDetail(
              moduleKey,
              String(record.id),
            )
            await saveBusinessModule(moduleKey, {
              ...detail.data,
              [listAuditTarget.key]: listAuditTarget.value,
            })
            successCount += 1
          } catch (err) {
            failedCount += 1
            if (!firstError) {
              firstError = err instanceof Error ? err.message : '审核失败'
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            `审核完成：成功 ${successCount} 条，失败 ${failedCount} 条${
              skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
            }${firstError ? `；${firstError}` : ''}`,
          )
        } else {
          message.success(
            `审核成功 ${successCount} 条${
              skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
            }`,
          )
        }
        await refreshAndClearSelection()
      },
    })
  }, [
    listAuditTarget,
    moduleKey,
    refreshAndClearSelection,
    selectedRowKeys,
    selectedRows,
  ])

  const handleSelectedDeleteRecords = useCallback(() => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择记录')
      return
    }

    const selected = selectedRows
    const eligible = selected.filter((r) => !isDeleteBlockedByStatus(r.status))
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning('勾选单据当前状态不支持删除')
      return
    }

    modal.confirm({
      title: '批量删除',
      content: `确定删除选中的 ${eligible.length} 条记录吗？此操作不可恢复。${
        skippedCount > 0 ? `另有 ${skippedCount} 条因状态不支持将跳过。` : ''
      }`,
      okButtonProps: { danger: true },
      onOk: async () => {
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const record of eligible) {
          try {
            await deleteBusinessModule(moduleKey, String(record.id))
            successCount += 1
          } catch (err) {
            failedCount += 1
            if (!firstError) {
              firstError = err instanceof Error ? err.message : '删除失败'
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            `删除完成：成功 ${successCount} 条，失败 ${failedCount} 条${
              skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
            }${firstError ? `；${firstError}` : ''}`,
          )
        } else {
          message.success(
            `删除成功 ${successCount} 条${
              skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
            }`,
          )
        }
        await refreshAndClearSelection()
      },
    })
  }, [moduleKey, refreshAndClearSelection, selectedRowKeys, selectedRows])

  const handleSelectedReverseAuditRecords = useCallback(() => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择记录')
      return
    }
    if (!listReverseAuditTarget) {
      message.warning('当前模块未配置批量反审核状态')
      return
    }

    const selected = selectedRows
    const auditStatus = String(listAuditTarget?.value ?? '').trim()
    const eligible = selected.filter((r) => {
      const status = asString(r.status).trim()
      return Boolean(auditStatus && status === auditStatus)
    })
    const skippedCount = selected.length - eligible.length

    if (!eligible.length) {
      message.warning('勾选单据当前状态不支持反审核')
      return
    }

    modal.confirm({
      title: '批量反审核',
      content: `确定反审核选中的 ${eligible.length} 条记录吗？${
        skippedCount > 0 ? `另有 ${skippedCount} 条因状态不支持将跳过。` : ''
      }`,
      onOk: async () => {
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const record of eligible) {
          try {
            const detail = await getBusinessModuleDetail(
              moduleKey,
              String(record.id),
            )
            await saveBusinessModule(moduleKey, {
              ...detail.data,
              [listReverseAuditTarget.key]: listReverseAuditTarget.value,
            })
            successCount += 1
          } catch (err) {
            failedCount += 1
            if (!firstError) {
              firstError = err instanceof Error ? err.message : '反审核失败'
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            `反审核完成：成功 ${successCount} 条，失败 ${failedCount} 条${
              skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
            }${firstError ? `；${firstError}` : ''}`,
          )
        } else {
          message.success(
            `反审核成功 ${successCount} 条${
              skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
            }`,
          )
        }
        await refreshAndClearSelection()
      },
    })
  }, [
    listAuditTarget,
    listReverseAuditTarget,
    moduleKey,
    refreshAndClearSelection,
    selectedRowKeys,
    selectedRows,
  ])

  const markSelectedFreightDelivered = useCallback(() => {
    if (!selectedRowKeys.length) {
      message.warning('请先选择物流单')
      return
    }

    modal.confirm({
      title: '批量标记送达',
      content: `确定将选中的 ${selectedRowKeys.length} 条物流单标记为已送达吗？`,
      onOk: async () => {
        let successCount = 0
        let failedCount = 0
        let firstError = ''
        for (const id of selectedRowKeys) {
          try {
            const detail = await getBusinessModuleDetail('freight-bill', id)
            await saveBusinessModule('freight-bill', {
              ...detail.data,
              deliveryStatus: '已送达',
            })
            successCount += 1
          } catch (err) {
            failedCount += 1
            if (!firstError) {
              firstError = err instanceof Error ? err.message : '标记送达失败'
            }
          }
        }

        if (failedCount > 0) {
          message.warning(
            `标记送达完成：成功 ${successCount} 条，失败 ${failedCount} 条${
              firstError ? `；${firstError}` : ''
            }`,
          )
        } else {
          message.success(`标记送达成功 ${successCount} 条`)
        }
        await refreshAndClearSelection()
      },
    })
  }, [refreshAndClearSelection, selectedRowKeys])

  return {
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
    markSelectedFreightDelivered,
  }
}
