import { useCallback, useMemo } from 'react'
import type {
  ModuleActionDefinition,
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'
import {
  type PermissionActionCode,
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
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
  handleSelectedAuditRecords: () => void
  handleSelectedDeleteRecords: () => void
  handleSelectedReverseAuditRecords: () => void
  markSelectedFreightDelivered: () => void
  navigateToRoleActionEditor: () => void
  openCreateEditor: () => Promise<void>
  openCustomerStatementGenerator: () => void
  openFreightPickupList: () => void
  openFreightStatementGenerator: () => void
  openFreightSummary: () => Promise<void>
  openSupplierStatementGenerator: () => void
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
  return (
    action.key === 'create' ||
    action.label.includes('新增') ||
    action.label.includes('生成')
  )
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
    (action: ModuleActionDefinition) =>
      hasAnyModuleAction(
        resolveModuleActionPermissionCodes({
          moduleKey,
          actionKey: action.key,
          actionLabel: action.label,
        }),
      ),
    [hasAnyModuleAction, moduleKey],
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
        {
          label: BULK_PRINT_PREVIEW_LABEL,
          type: 'default',
          disabled,
          loading: detailPrintLoading,
        },
        {
          label: BULK_DIRECT_PRINT_LABEL,
          type: 'default',
          disabled,
          loading: detailPrintLoading,
        },
      )
    }
    return actions
  }, [
    canUseBulkAuditActions,
    canUseBulkPrintActions,
    selectedRowCount,
    detailPrintLoading,
  ])

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
    return orderedActions.filter((action) => canUseAction(action))
  }, [config.actions, bulkDeleteAction, bulkToolbarActions, canUseAction])

  const handleAction = useCallback(
    async (action: ModuleActionDefinition) => {
      if (!canUseAction(action)) {
        message.warning(`暂无${action.label}权限`)
        return
      }

      if (action.label === BULK_AUDIT_LABEL) {
        handlers.handleSelectedAuditRecords()
        return
      }
      if (action.label === BULK_REVERSE_AUDIT_LABEL) {
        handlers.handleSelectedReverseAuditRecords()
        return
      }
      if (action.label === BULK_PRINT_PREVIEW_LABEL) {
        await handlers.handlePrintSelectedRecords(true)
        return
      }
      if (action.label === BULK_DIRECT_PRINT_LABEL) {
        await handlers.handlePrintSelectedRecords(false)
        return
      }
      if (action.label === BULK_DELETE_LABEL) {
        handlers.handleSelectedDeleteRecords()
        return
      }

      switch (
        resolveModuleActionKind({
          moduleKey,
          actionKey: action.key,
          actionLabel: action.label,
          hasFormFields: formFields.length > 0,
          isMaterialModule,
        })
      ) {
        case 'openSupplierStatementGenerator':
          handlers.openSupplierStatementGenerator()
          return
        case 'openCustomerStatementGenerator':
          handlers.openCustomerStatementGenerator()
          return
        case 'openFreightStatementGenerator':
          handlers.openFreightStatementGenerator()
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
          handlers.openFreightPickupList()
          return
        case 'markSelectedFreightDelivered':
          handlers.markSelectedFreightDelivered()
          return
        case 'openFreightSummary':
          await handlers.openFreightSummary()
          return
        case 'navigateToRoleActionEditor':
          handlers.navigateToRoleActionEditor()
          return
        default:
          message.info(`${action.label} 当前没有额外处理逻辑。`)
      }
    },
    [canUseAction, formFields, handlers, isMaterialModule, moduleKey],
  )

  return {
    canUseAction,
    handleAction,
    visibleToolbarActions,
  }
}
