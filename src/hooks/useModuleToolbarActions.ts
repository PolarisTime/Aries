import { useMemo, useCallback } from 'react'
import { message } from '@/utils/antd-app'
import type {
  ModuleActionDefinition,
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import {
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
  type PermissionActionCode,
} from '@/views/modules/module-adapter-actions'

export const BULK_DELETE_LABEL = '删除'
export const BULK_AUDIT_LABEL = '审核'
export const BULK_REVERSE_AUDIT_LABEL = '反审核'
export const BULK_PRINT_PREVIEW_LABEL = '打印预览'
export const BULK_DIRECT_PRINT_LABEL = '直接打印'

interface Handlers {
  exportMaterialRows: () => Promise<void>
  exportRows: (mode: 'selected' | 'page' | 'filtered') => Promise<void>
  handlePrintSelectedRecords: (preview: boolean) => Promise<void>
  handleSelectedAuditRecords: () => Promise<void>
  handleSelectedDeleteRecords: () => void
  handleSelectedReverseAuditRecords: () => Promise<void>
  markSelectedFreightDelivered: () => Promise<void>
  navigateToRoleActionEditor: () => void
  openCreateEditor: () => Promise<void>
  openCustomerStatementGenerator: () => Promise<void>
  openFreightPickupList: () => Promise<void>
  openFreightStatementGenerator: () => Promise<void>
  openFreightSummary: () => Promise<void>
  openSupplierStatementGenerator: () => Promise<void>
}

interface Props {
  moduleKey: string
  config: ModulePageConfig
  formFields: ModuleFormFieldDefinition[]
  isMaterialModule: boolean
  selectedRowCount: number
  canUseBulkAuditActions: boolean
  canUseBulkDeleteActions: boolean
  canUseBulkPrintActions: boolean
  detailPrintLoading: boolean
  hasAnyModuleAction: (actionCodes: PermissionActionCode[]) => boolean
  handlers: Handlers
}

function isCreateToolbarAction(action: ModuleActionDefinition) {
  return action.label.includes('新增')
}

export function useModuleToolbarActions({
  moduleKey,
  config,
  formFields,
  isMaterialModule,
  selectedRowCount,
  canUseBulkAuditActions,
  canUseBulkDeleteActions,
  canUseBulkPrintActions,
  detailPrintLoading,
  hasAnyModuleAction,
  handlers,
}: Props) {
  const canUseAction = useCallback(
    (actionLabel: string) => hasAnyModuleAction(resolveModuleActionPermissionCodes(actionLabel)),
    [hasAnyModuleAction],
  )

  const bulkDeleteAction = useMemo<ModuleActionDefinition | null>(
    () =>
      canUseBulkDeleteActions
        ? {
            label: BULK_DELETE_LABEL,
            type: 'default',
            danger: true,
            disabled: selectedRowCount === 0,
          }
        : null,
    [canUseBulkDeleteActions, selectedRowCount],
  )

  const bulkToolbarActions = useMemo<ModuleActionDefinition[]>(() => {
    const disabled = selectedRowCount === 0
    const actions: ModuleActionDefinition[] = []
    if (canUseBulkAuditActions) {
      actions.push(
        { label: BULK_AUDIT_LABEL, type: 'default', disabled },
        { label: BULK_REVERSE_AUDIT_LABEL, type: 'default', disabled },
      )
    }
    if (canUseBulkPrintActions) {
      actions.push(
        { label: BULK_PRINT_PREVIEW_LABEL, type: 'default', disabled, loading: detailPrintLoading },
        { label: BULK_DIRECT_PRINT_LABEL, type: 'default', disabled, loading: detailPrintLoading },
      )
    }
    return actions
  }, [canUseBulkAuditActions, canUseBulkPrintActions, selectedRowCount, detailPrintLoading])

  const visibleToolbarActions = useMemo<ModuleActionDefinition[]>(() => {
    const remainingActions = [...(config.actions || [])]
    const createActionIndex = remainingActions.findIndex(isCreateToolbarAction)
    const orderedActions: ModuleActionDefinition[] = []
    if (createActionIndex >= 0) {
      orderedActions.push(remainingActions.splice(createActionIndex, 1)[0])
    }
    if (bulkDeleteAction) {
      orderedActions.push(bulkDeleteAction)
    }
    orderedActions.push(...bulkToolbarActions, ...remainingActions)
    return orderedActions.filter((action) => canUseAction(action.label))
  }, [config.actions, bulkDeleteAction, bulkToolbarActions, canUseAction])

  const handleAction = useCallback(
    async (actionLabel: string) => {
      if (!canUseAction(actionLabel)) {
        message.warning(`暂无${actionLabel}权限`)
        return
      }

      if (actionLabel === BULK_AUDIT_LABEL) {
        await handlers.handleSelectedAuditRecords()
        return
      }
      if (actionLabel === BULK_REVERSE_AUDIT_LABEL) {
        await handlers.handleSelectedReverseAuditRecords()
        return
      }
      if (actionLabel === BULK_PRINT_PREVIEW_LABEL) {
        await handlers.handlePrintSelectedRecords(true)
        return
      }
      if (actionLabel === BULK_DIRECT_PRINT_LABEL) {
        await handlers.handlePrintSelectedRecords(false)
        return
      }
      if (actionLabel === BULK_DELETE_LABEL) {
        handlers.handleSelectedDeleteRecords()
        return
      }

      switch (
        resolveModuleActionKind({
          moduleKey,
          actionLabel,
          hasFormFields: formFields.length > 0,
          isMaterialModule,
        })
      ) {
        case 'openSupplierStatementGenerator':
          await handlers.openSupplierStatementGenerator()
          return
        case 'openCustomerStatementGenerator':
          await handlers.openCustomerStatementGenerator()
          return
        case 'openFreightStatementGenerator':
          await handlers.openFreightStatementGenerator()
          return
        case 'openCreateEditor':
          await handlers.openCreateEditor()
          return
        case 'exportMaterialRows':
          await handlers.exportMaterialRows()
          return
        case 'exportRows':
          await handlers.exportRows('filtered')
          return
        case 'openFreightPickupList':
          await handlers.openFreightPickupList()
          return
        case 'markSelectedFreightDelivered':
          await handlers.markSelectedFreightDelivered()
          return
        case 'openFreightSummary':
          await handlers.openFreightSummary()
          return
        case 'navigateToRoleActionEditor':
          handlers.navigateToRoleActionEditor()
          return
        default:
          message.info(`${actionLabel} 当前没有额外处理逻辑。`)
      }
    },
    [canUseAction, moduleKey, formFields, isMaterialModule, handlers],
  )

  return {
    canUseAction,
    handleAction,
    visibleToolbarActions,
  }
}
