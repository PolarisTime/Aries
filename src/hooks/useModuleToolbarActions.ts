import { useTranslation } from 'react-i18next'
import {
  type PermissionActionCode,
  resolveModuleActionKind,
  resolveModuleActionPermissionCodes,
} from '@/module-system/module-adapter-actions'
import type {
  ModuleActionDefinition,
  ModuleFormFieldDefinition,
  ModulePageConfig,
} from '@/types/module-page'
import { message } from '@/utils/antd-app'

interface Handlers {
  exportMaterialRows: () => Promise<void>
  exportRows: (mode: 'selected' | 'page' | 'filtered') => Promise<void>
  handleSelectedAuditRecords: () => void
  handleSelectedDeleteRecords: () => void
  handleSelectedReverseAuditRecords: () => void
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
  hasAnyModuleAction: (actionCodes: PermissionActionCode[]) => boolean
  handlers: Handlers
}

function isCreateToolbarAction(action: ModuleActionDefinition) {
  return action.key === 'create' || action.key?.startsWith('create_')
}

export function useModuleToolbarActions({
  moduleKey,
  config,
  formFields,
  isMaterialModule,
  selectedRowCount,
  canUseBulkAuditActions,
  canUseBulkDeleteActions,
  hasAnyModuleAction,
  handlers,
}: Props) {
  const { t } = useTranslation()

  const canUseAction = (action: ModuleActionDefinition) =>
    hasAnyModuleAction(
      resolveModuleActionPermissionCodes({
        moduleKey,
        actionKey: action.key,
        actionLabel: action.label,
      }),
    )

  const bulkDeleteAction: ModuleActionDefinition | null =
    canUseBulkDeleteActions && selectedRowCount > 0
      ? {
          label: t('hooks.toolbarActions.delete'),
          type: 'default',
          danger: true,
        }
      : null

  const bulkToolbarActions = (() => {
    const actions: ModuleActionDefinition[] = []
    if (canUseBulkAuditActions && selectedRowCount > 0) {
      actions.push(
        { label: t('hooks.toolbarActions.audit'), type: 'default' },
        {
          label: t('hooks.toolbarActions.reverseAudit'),
          type: 'default',
        },
      )
    }
    return actions
  })() satisfies ModuleActionDefinition[]

  const visibleToolbarActions = (() => {
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
    return orderedActions.flatMap((action) => {
      if (!canUseAction(action)) {
        return []
      }
      if (action.key === 'generate_pickup_list' && selectedRowCount === 0) {
        return []
      }
      return [action]
    })
  })() satisfies ModuleActionDefinition[]

  const handleAction = async (action: ModuleActionDefinition) => {
    if (!canUseAction(action)) {
      message.warning(
        t('hooks.toolbarActions.noPermission', { label: action.label }),
      )
      return
    }

    const auditLabel = t('hooks.toolbarActions.audit')
    const reverseAuditLabel = t('hooks.toolbarActions.reverseAudit')
    const deleteLabel = t('hooks.toolbarActions.delete')

    if (action.label === auditLabel) {
      handlers.handleSelectedAuditRecords()
      return
    }
    if (action.label === reverseAuditLabel) {
      handlers.handleSelectedReverseAuditRecords()
      return
    }
    if (action.label === deleteLabel) {
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
      case 'openFreightSummary':
        await handlers.openFreightSummary()
        return
      case 'navigateToRoleActionEditor':
        handlers.navigateToRoleActionEditor()
        return
      default:
        message.info(
          t('hooks.toolbarActions.noExtraLogic', { label: action.label }),
        )
    }
  }

  return {
    canUseAction,
    handleAction,
    visibleToolbarActions,
  }
}
