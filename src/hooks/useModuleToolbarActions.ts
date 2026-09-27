import { useTranslation } from 'react-i18next'
import {
  resolveModuleActionKind,
  resolveStatusChangeActionLabelKey,
  type StatusChangeActionKind,
} from '@/module-system/adapter/module-adapter-actions'
import { limitsBulkAuditToSingleSelection } from '@/module-system/behavior/module-page-behaviors'
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
  openCreateEditor: () => Promise<void>
  openFreightSummary: () => Promise<void>
  openCustomerSummary: () => Promise<void>
  openCustomerProjects: () => void
}

interface Props {
  moduleKey: string
  config: ModulePageConfig
  formFields: ModuleFormFieldDefinition[]
  isMaterialModule: boolean
  selectedRowCount: number
  canUseBulkAuditAction: boolean
  canUseBulkReverseAuditAction: boolean
  canUseBulkDeleteActions: boolean
  listAuditActionKind: StatusChangeActionKind | null
  listReverseAuditActionKind: StatusChangeActionKind | null
  handlers: Handlers
}

const BULK_DELETE_ACTION_KEY = 'bulk_delete'
const BULK_AUDIT_ACTION_KEY = 'bulk_audit'
const BULK_REVERSE_AUDIT_ACTION_KEY = 'bulk_reverse_audit'
const EXPORT_SELECTED_ACTION_KEY = 'export_selected'

function isCreateToolbarAction(action: ModuleActionDefinition) {
  return action.key === 'create' || action.key?.startsWith('create_')
}

export function useModuleToolbarActions({
  moduleKey,
  config,
  formFields,
  isMaterialModule,
  selectedRowCount,
  canUseBulkAuditAction,
  canUseBulkReverseAuditAction,
  canUseBulkDeleteActions,
  listAuditActionKind,
  listReverseAuditActionKind,
  handlers,
}: Props) {
  const { t } = useTranslation()

  const bulkDeleteAction: ModuleActionDefinition | null =
    canUseBulkDeleteActions && selectedRowCount > 0
      ? {
          key: BULK_DELETE_ACTION_KEY,
          label: t('hooks.toolbarActions.delete'),
          type: 'default',
          danger: true,
        }
      : null

  /** 有勾选时才出现的「导出选中 N 条」：只导出勾选记录。 */
  const exportSelectedAction: ModuleActionDefinition | null =
    selectedRowCount > 0
      ? {
          key: EXPORT_SELECTED_ACTION_KEY,
          label: t('hooks.toolbarActions.exportSelected', {
            count: selectedRowCount,
          }),
          type: 'default',
        }
      : null

  const bulkToolbarActions = (() => {
    const actions: ModuleActionDefinition[] = []
    const auditSelectionSupported =
      selectedRowCount > 0 &&
      (!limitsBulkAuditToSingleSelection(moduleKey) || selectedRowCount === 1)
    if (
      canUseBulkAuditAction &&
      auditSelectionSupported &&
      listAuditActionKind
    ) {
      actions.push({
        key: BULK_AUDIT_ACTION_KEY,
        label: t(resolveStatusChangeActionLabelKey(listAuditActionKind)),
        type: 'default',
      })
    }
    if (
      canUseBulkReverseAuditAction &&
      auditSelectionSupported &&
      listReverseAuditActionKind
    ) {
      actions.push({
        key: BULK_REVERSE_AUDIT_ACTION_KEY,
        label: t(resolveStatusChangeActionLabelKey(listReverseAuditActionKind)),
        type: 'default',
      })
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
    if (exportSelectedAction) {
      orderedActions.push(exportSelectedAction)
    }
    orderedActions.push(...bulkToolbarActions, ...remainingActions)
    return orderedActions.flatMap((action) => {
      if (action.key === 'manage_customer_projects') {
        return [{ ...action, disabled: selectedRowCount !== 1 }]
      }
      return [action]
    })
  })() satisfies ModuleActionDefinition[]

  const handleAction = async (action: ModuleActionDefinition) => {
    switch (action.key) {
      case BULK_AUDIT_ACTION_KEY:
        handlers.handleSelectedAuditRecords()
        return
      case BULK_REVERSE_AUDIT_ACTION_KEY:
        handlers.handleSelectedReverseAuditRecords()
        return
      case BULK_DELETE_ACTION_KEY:
        handlers.handleSelectedDeleteRecords()
        return
      case EXPORT_SELECTED_ACTION_KEY:
        await handlers.exportRows('selected')
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
      case 'openCreateEditor':
        await handlers.openCreateEditor()
        return
      case 'exportMaterialRows':
        await handlers.exportMaterialRows()
        return
      case 'exportRows':
        await handlers.exportRows('filtered')
        return
      case 'openFreightSummary':
        await handlers.openFreightSummary()
        return
      case 'openCustomerSummary':
        await handlers.openCustomerSummary()
        return
      case 'openCustomerProjects':
        handlers.openCustomerProjects()
        return
      default:
        message.info(
          t('hooks.toolbarActions.noExtraLogic', { label: action.label }),
        )
    }
  }

  return {
    handleAction,
    visibleToolbarActions,
  }
}
