import type { Ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  deleteBusinessModule,
  getBusinessModuleDetail,
  saveBusinessModule,
} from '@/api/business'
import type { ModuleLineItem, ModuleRecord } from '@/types/module-page'
import { cloneLineItems, cloneRecord } from '@/utils/clone-utils'
import { isDeleteBlockedByStatus } from './module-behavior-registry'

export type StatusChangeTarget = {
  key: string
  value: unknown
}

interface UseModuleRecordActionsOptions {
  moduleKey: Ref<string>
  selectedRowKeys: Ref<string[]>
  selectedRowMap: Ref<Record<string, ModuleRecord>>
  expandedDetailRecordMap: Ref<Record<string, ModuleRecord>>
  activeRecord: Ref<ModuleRecord | null>
  attachmentRecord: Ref<ModuleRecord | null>
  isReadOnly: Ref<boolean>
  canDeleteRecords: Ref<boolean>
  canAuditRecords: Ref<boolean>
  canUseBulkDeleteActions: Ref<boolean>
  listAuditTarget: Ref<StatusChangeTarget | null>
  listReverseAuditTarget: Ref<StatusChangeTarget | null>
  listStatusOptions: Ref<string[]>
  canUseRecordActions?: (record: ModuleRecord | null | undefined) => boolean
  getRecordActionBlockedMessage?: (record: ModuleRecord | null | undefined, actionLabel: string) => string
  getPrimaryNo: (record: ModuleRecord) => string
  handleCloseDetail: () => void
  closeAttachmentDialog: () => void
  printRecords: (records: ModuleRecord[], preview: boolean) => Promise<void>
  refreshModuleQueries: () => Promise<void>
  isSuccessCode: (code: unknown) => boolean
  showRequestError: (error: unknown, fallbackMessage: string) => void
}

const TERMINAL_AUDIT_STATUSES = new Set([
  '待完善',
  '已完成',
  '完成采购',
  '完成入库',
  '完成销售',
  '已付款',
  '已收款',
  '已签署',
  '已送达',
  '已收票',
  '已开票',
])

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

function normalizeRecordStatus(record: ModuleRecord) {
  return String(record.status || '').trim()
}

export function useModuleRecordActions(options: UseModuleRecordActionsOptions) {
  function canUseRecordActions(record: ModuleRecord | null | undefined) {
    return options.canUseRecordActions?.(record) ?? true
  }

  function getRecordActionBlockedMessage(record: ModuleRecord | null | undefined, actionLabel: string) {
    return options.getRecordActionBlockedMessage?.(record, actionLabel) || `当前记录不支持${actionLabel}`
  }

  function validateDeleteRecord(record: ModuleRecord, showWarning = true) {
    if (!canUseRecordActions(record)) {
      if (showWarning) message.warning(getRecordActionBlockedMessage(record, '删除'))
      return false
    }
    if (!options.canDeleteRecords.value) {
      if (showWarning) message.warning('暂无删除权限')
      return false
    }
    if (options.isReadOnly.value) {
      if (showWarning) message.warning('当前模块为只读模式')
      return false
    }
    if (isDeleteBlockedByStatus(record.status)) {
      if (showWarning) message.warning(`当前单据状态为「${String(record.status || '').trim()}」，不能删除`)
      return false
    }
    return true
  }

  function clearDeletedRecordState(record: ModuleRecord) {
    const recordKey = String(record.id)
    options.selectedRowKeys.value = options.selectedRowKeys.value.filter((key) => key !== recordKey)
    if (options.selectedRowMap.value[recordKey]) {
      const nextMap = { ...options.selectedRowMap.value }
      delete nextMap[recordKey]
      options.selectedRowMap.value = nextMap
    }
    if (options.expandedDetailRecordMap.value[recordKey]) {
      const nextMap = { ...options.expandedDetailRecordMap.value }
      delete nextMap[recordKey]
      options.expandedDetailRecordMap.value = nextMap
    }
    if (options.activeRecord.value?.id === record.id) {
      options.handleCloseDetail()
    }
    if (options.attachmentRecord.value?.id === record.id) {
      options.closeAttachmentDialog()
    }
  }

  async function deleteRecord(record: ModuleRecord) {
    const response = await deleteBusinessModule(options.moduleKey.value, String(record.id))
    if (!options.isSuccessCode(response.code)) {
      throw new Error(response.message || '删除失败')
    }
    clearDeletedRecordState(record)
    return response
  }

  async function handleDelete(record: ModuleRecord) {
    if (!validateDeleteRecord(record)) {
      return
    }

    try {
      const response = await deleteRecord(record)
      await options.refreshModuleQueries()
      message.success(response.message || `已删除 ${options.getPrimaryNo(record)}`)
    } catch (error) {
      options.showRequestError(error, '删除失败')
    }
  }

  function canDeleteRecord(record: ModuleRecord) {
    return canUseRecordActions(record)
      && !options.isReadOnly.value
      && options.canDeleteRecords.value
      && !isDeleteBlockedByStatus(record.status)
  }

  function getSelectedRecords() {
    return options.selectedRowKeys.value
      .map((key) => options.selectedRowMap.value[key])
      .filter((record): record is ModuleRecord => Boolean(record))
      .filter((record) => canUseRecordActions(record))
  }

  function handleSelectedDeleteRecords() {
    if (!options.canUseBulkDeleteActions.value) {
      message.warning('暂无删除权限')
      return
    }
    const selectedRecords = getSelectedRecords()
    if (!selectedRecords.length) {
      message.warning('请先勾选需要删除的单据')
      return
    }

    const records = selectedRecords.filter((record) => validateDeleteRecord(record, false))
    const skippedCount = selectedRecords.length - records.length
    if (!records.length) {
      message.warning('勾选单据当前状态不支持删除')
      return
    }

    Modal.confirm({
      title: `确定删除选中的 ${records.length} 条单据吗?`,
      content: skippedCount > 0 ? `另有 ${skippedCount} 条单据因状态或类型限制不会删除。` : undefined,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        let successCount = 0
        let failedCount = 0
        let firstErrorMessage = ''
        for (const record of records) {
          try {
            await deleteRecord(record)
            successCount += 1
          } catch (error) {
            failedCount += 1
            if (!firstErrorMessage) {
              firstErrorMessage = getErrorMessage(error, '删除失败')
            }
          }
        }

        if (successCount > 0) {
          await options.refreshModuleQueries()
        }

        const skippedText = skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''
        if (failedCount > 0) {
          message.warning(`删除完成：成功 ${successCount} 条，失败 ${failedCount} 条${skippedText}${firstErrorMessage ? `；${firstErrorMessage}` : ''}`)
          return
        }
        message.success(`删除成功 ${successCount} 条${skippedText}`)
      },
    })
  }

  function hasAuditActionBase(record: ModuleRecord) {
    return Boolean(
      !options.isReadOnly.value
      && options.canAuditRecords.value
      && canUseRecordActions(record)
      && options.listAuditTarget.value
      && options.listReverseAuditTarget.value,
    )
  }

  function canAuditRecord(record: ModuleRecord) {
    if (!hasAuditActionBase(record)) {
      return false
    }
    const currentStatus = normalizeRecordStatus(record)
    const auditStatus = String(options.listAuditTarget.value?.value ?? '').trim()
    if (!auditStatus || currentStatus === auditStatus || TERMINAL_AUDIT_STATUSES.has(currentStatus)) {
      return false
    }
    return !currentStatus || options.listStatusOptions.value.includes(currentStatus)
  }

  function canReverseAuditRecord(record: ModuleRecord) {
    if (!hasAuditActionBase(record)) {
      return false
    }
    const currentStatus = normalizeRecordStatus(record)
    const auditStatus = String(options.listAuditTarget.value?.value ?? '').trim()
    return Boolean(auditStatus && currentStatus === auditStatus)
  }

  async function loadStatusChangeRecord(record: ModuleRecord) {
    const response = await getBusinessModuleDetail(options.moduleKey.value, String(record.id))
    if (!options.isSuccessCode(response.code) || !response.data) {
      throw new Error(response.message || '获取单据详情失败')
    }
    return response.data
  }

  function syncLocalRecordStatus(record: ModuleRecord, target: StatusChangeTarget) {
    const nextStatus = target.value
    record[target.key] = nextStatus
    if (options.selectedRowMap.value[String(record.id)]) {
      options.selectedRowMap.value = {
        ...options.selectedRowMap.value,
        [String(record.id)]: {
          ...options.selectedRowMap.value[String(record.id)],
          [target.key]: nextStatus,
        },
      }
    }
    if (options.activeRecord.value?.id === record.id) {
      options.activeRecord.value = {
        ...options.activeRecord.value,
        [target.key]: nextStatus,
      }
    }
  }

  async function saveRecordStatusChange(record: ModuleRecord, target: StatusChangeTarget, actionLabel: string) {
    const detailRecord = await loadStatusChangeRecord(record)
    const payload = {
      ...(cloneRecord(detailRecord) as ModuleRecord),
      [target.key]: target.value,
    }
    if (Array.isArray(detailRecord.items)) {
      payload.items = cloneLineItems(detailRecord.items as ModuleLineItem[])
    }
    const response = await saveBusinessModule(options.moduleKey.value, payload)
    if (!options.isSuccessCode(response.code)) {
      throw new Error(response.message || `${actionLabel}失败`)
    }
    syncLocalRecordStatus(record, target)
    return response
  }

  function validateStatusChangeTarget(target: StatusChangeTarget | null, actionLabel: string) {
    if (!target) {
      message.warning(`当前模块不支持${actionLabel}`)
      return false
    }
    if (!options.canAuditRecords.value) {
      message.warning('暂无审核权限')
      return false
    }
    if (options.isReadOnly.value) {
      message.warning('当前模块为只读模式')
      return false
    }
    return true
  }

  async function handleStatusChange(record: ModuleRecord, target: StatusChangeTarget | null, actionLabel: string) {
    if (!validateStatusChangeTarget(target, actionLabel) || !target) {
      return
    }
    if (!canUseRecordActions(record)) {
      message.warning(getRecordActionBlockedMessage(record, actionLabel))
      return
    }

    try {
      const response = await saveRecordStatusChange(record, target, actionLabel)
      await options.refreshModuleQueries()
      message.success(response.message || `${options.getPrimaryNo(record)} ${actionLabel}成功`)
    } catch (error) {
      options.showRequestError(error, `${actionLabel}失败`)
    }
  }

  async function handleSelectedStatusChange(
    target: StatusChangeTarget | null,
    actionLabel: string,
    canApply: (record: ModuleRecord) => boolean,
  ) {
    if (!validateStatusChangeTarget(target, actionLabel) || !target) {
      return
    }

    const selectedRecords = getSelectedRecords()
    if (!selectedRecords.length) {
      message.warning(`请先勾选需要${actionLabel}的单据`)
      return
    }

    const records = selectedRecords.filter(canApply)
    const skippedCount = selectedRecords.length - records.length
    if (!records.length) {
      message.warning(`勾选单据当前状态不支持${actionLabel}`)
      return
    }

    let successCount = 0
    let failedCount = 0
    let firstErrorMessage = ''
    for (const record of records) {
      try {
        await saveRecordStatusChange(record, target, actionLabel)
        successCount += 1
      } catch (error) {
        failedCount += 1
        if (!firstErrorMessage) {
          firstErrorMessage = getErrorMessage(error, `${actionLabel}失败`)
        }
      }
    }

    if (successCount > 0) {
      await options.refreshModuleQueries()
    }

    const skippedText = skippedCount > 0 ? `，跳过 ${skippedCount} 条状态不支持` : ''
    if (failedCount > 0) {
      message.warning(`${actionLabel}完成：成功 ${successCount} 条，失败 ${failedCount} 条${skippedText}${firstErrorMessage ? `；${firstErrorMessage}` : ''}`)
      return
    }
    message.success(`${actionLabel}成功 ${successCount} 条${skippedText}`)
  }

  async function handleAuditRecord(record: ModuleRecord) {
    await handleStatusChange(record, options.listAuditTarget.value, '审核')
  }

  async function handleReverseAuditRecord(record: ModuleRecord) {
    await handleStatusChange(record, options.listReverseAuditTarget.value, '反审核')
  }

  async function handleSelectedAuditRecords() {
    await handleSelectedStatusChange(options.listAuditTarget.value, '审核', canAuditRecord)
  }

  async function handleSelectedReverseAuditRecords() {
    await handleSelectedStatusChange(options.listReverseAuditTarget.value, '反审核', canReverseAuditRecord)
  }

  async function handlePrintSelectedRecords(preview: boolean) {
    await options.printRecords(getSelectedRecords(), preview)
  }

  return {
    canAuditRecord,
    canDeleteRecord,
    canReverseAuditRecord,
    getSelectedRecords,
    handleAuditRecord,
    handleDelete,
    handlePrintSelectedRecords,
    handleReverseAuditRecord,
    handleSelectedAuditRecords,
    handleSelectedDeleteRecords,
    handleSelectedReverseAuditRecords,
  }
}
