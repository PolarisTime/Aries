import { computed, type Ref } from 'vue'
import { message } from 'ant-design-vue'
import type {
  ModuleActionDefinition,
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import {
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
  type PermissionActionCode,
} from './module-adapter-actions'

export const BULK_DELETE_LABEL = '删除'
export const BULK_AUDIT_LABEL = '审核'
export const BULK_REVERSE_AUDIT_LABEL = '反审核'
export const BULK_PRINT_PREVIEW_LABEL = '打印预览'
export const BULK_DIRECT_PRINT_LABEL = '直接打印'

interface UseModuleToolbarActionsOptions {
  moduleKey: Ref<string>
  config: Ref<ModulePageConfig>
  formFields: Ref<ModuleFormFieldDefinition[]>
  isMaterialModule: Ref<boolean>
  selectedRowCount: Ref<number>
  canUseBulkAuditActions: Ref<boolean>
  canUseBulkDeleteActions: Ref<boolean>
  canUseBulkPrintActions: Ref<boolean>
  detailPrintLoading: Ref<boolean>
  hasAnyModuleAction: (actionCodes: PermissionActionCode[]) => boolean
  handlers: {
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
}

function isCreateToolbarAction(action: ModuleActionDefinition) {
  return action.label.includes('新增')
}

export function useModuleToolbarActions(options: UseModuleToolbarActionsOptions) {
  function canUseAction(actionLabel: string) {
    return options.hasAnyModuleAction(resolveModuleActionPermissionCodes(actionLabel))
  }

  const bulkDeleteAction = computed<ModuleActionDefinition | null>(() =>
    options.canUseBulkDeleteActions.value
      ? {
          label: BULK_DELETE_LABEL,
          type: 'default',
          danger: true,
          disabled: options.selectedRowCount.value === 0,
        }
      : null,
  )

  const bulkToolbarActions = computed<ModuleActionDefinition[]>(() => {
    const disabled = options.selectedRowCount.value === 0
    const actions: ModuleActionDefinition[] = []
    if (options.canUseBulkAuditActions.value) {
      actions.push(
        { label: BULK_AUDIT_LABEL, type: 'default', disabled },
        { label: BULK_REVERSE_AUDIT_LABEL, type: 'default', disabled },
      )
    }
    if (options.canUseBulkPrintActions.value) {
      actions.push(
        { label: BULK_PRINT_PREVIEW_LABEL, type: 'default', disabled, loading: options.detailPrintLoading.value },
        { label: BULK_DIRECT_PRINT_LABEL, type: 'default', disabled, loading: options.detailPrintLoading.value },
      )
    }
    return actions
  })

  function buildVisibleToolbarActions(actions: ModuleActionDefinition[]) {
    const remainingActions = [...actions]
    const createActionIndex = remainingActions.findIndex(isCreateToolbarAction)
    const orderedActions: ModuleActionDefinition[] = []
    if (createActionIndex >= 0) {
      orderedActions.push(remainingActions.splice(createActionIndex, 1)[0])
    }
    if (bulkDeleteAction.value) {
      orderedActions.push(bulkDeleteAction.value)
    }
    orderedActions.push(...bulkToolbarActions.value, ...remainingActions)
    return orderedActions
  }

  const visibleToolbarActions = computed<ModuleActionDefinition[]>(() =>
    buildVisibleToolbarActions((options.config.value.actions || []).filter((action) => canUseAction(action.label))),
  )

  async function handleAction(actionLabel: string) {
    if (!canUseAction(actionLabel)) {
      message.warning(`暂无${actionLabel}权限`)
      return
    }

    if (actionLabel === BULK_AUDIT_LABEL) {
      await options.handlers.handleSelectedAuditRecords()
      return
    }
    if (actionLabel === BULK_REVERSE_AUDIT_LABEL) {
      await options.handlers.handleSelectedReverseAuditRecords()
      return
    }
    if (actionLabel === BULK_PRINT_PREVIEW_LABEL) {
      await options.handlers.handlePrintSelectedRecords(true)
      return
    }
    if (actionLabel === BULK_DIRECT_PRINT_LABEL) {
      await options.handlers.handlePrintSelectedRecords(false)
      return
    }
    if (actionLabel === BULK_DELETE_LABEL) {
      options.handlers.handleSelectedDeleteRecords()
      return
    }

    switch (resolveModuleActionKind({
      moduleKey: options.moduleKey.value,
      actionLabel,
      hasFormFields: options.formFields.value.length > 0,
      isMaterialModule: options.isMaterialModule.value,
    })) {
      case 'openSupplierStatementGenerator':
        await options.handlers.openSupplierStatementGenerator()
        return
      case 'openCustomerStatementGenerator':
        await options.handlers.openCustomerStatementGenerator()
        return
      case 'openFreightStatementGenerator':
        await options.handlers.openFreightStatementGenerator()
        return
      case 'openCreateEditor':
        await options.handlers.openCreateEditor()
        return
      case 'exportMaterialRows':
        await options.handlers.exportMaterialRows()
        return
      case 'exportRows':
        await options.handlers.exportRows('filtered')
        return
      case 'openFreightPickupList':
        await options.handlers.openFreightPickupList()
        return
      case 'markSelectedFreightDelivered':
        await options.handlers.markSelectedFreightDelivered()
        return
      case 'openFreightSummary':
        await options.handlers.openFreightSummary()
        return
      case 'navigateToRoleActionEditor':
        options.handlers.navigateToRoleActionEditor()
        return
      default:
        message.info(`${actionLabel} 当前没有额外处理逻辑。`)
    }
  }

  return {
    canUseAction,
    handleAction,
    visibleToolbarActions,
  }
}
