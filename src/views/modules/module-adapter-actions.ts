import { getBehaviorValue } from './module-behavior-registry'

export type ModuleActionKind =
  | 'openSupplierStatementGenerator'
  | 'openCustomerStatementGenerator'
  | 'openFreightStatementGenerator'
  | 'openCreateEditor'
  | 'exportMaterialRows'
  | 'exportRows'
  | 'openFreightPickupList'
  | 'markSelectedFreightDelivered'
  | 'openFreightSummary'
  | 'navigateToRoleActionEditor'
  | 'none'

export type PermissionActionCode =
  | 'read'
  | 'create'
  | 'update'
  | 'delete'
  | 'audit'
  | 'export'
  | 'print'
  | 'manage_permissions'

export function resolveModuleActionKind(options: {
  moduleKey: string
  actionLabel: string
  hasFormFields: boolean
  isMaterialModule: boolean
}): ModuleActionKind {
  const { moduleKey, actionLabel, hasFormFields, isMaterialModule } = options

  const actionKindsByLabel = getBehaviorValue(moduleKey, 'actionKindsByLabel') as Record<string, ModuleActionKind> | undefined
  const mappedActionKind = actionKindsByLabel?.[actionLabel]
  if (mappedActionKind) {
    return mappedActionKind
  }

  if ((actionLabel.includes('新增') || actionLabel.includes('生成')) && hasFormFields) {
    return 'openCreateEditor'
  }

  if (actionLabel.includes('导出')) {
    return isMaterialModule ? 'exportMaterialRows' : 'exportRows'
  }

  return 'none'
}

export function resolveModuleActionPermissionCodes(actionLabel: string): PermissionActionCode[] {
  if (actionLabel === '配置权限') {
    return ['manage_permissions']
  }

  if (actionLabel === '页面上传命名规则') {
    return ['update']
  }

  if (actionLabel === '标记送达') {
    return ['audit']
  }

  if (actionLabel === '生成提货清单') {
    return ['export']
  }

  if (actionLabel === '模板下载') {
    return ['export']
  }

  if (actionLabel.includes('导出')) {
    return ['export']
  }

  if (actionLabel.includes('打印')) {
    return ['print']
  }

  if (actionLabel.includes('删除')) {
    return ['delete']
  }

  if (actionLabel.includes('审核')) {
    return ['audit']
  }

  if (actionLabel.includes('编辑') || actionLabel.includes('附件')) {
    return ['update']
  }

  if (actionLabel.includes('导入')) {
    return ['create', 'update']
  }

  if (actionLabel.includes('新增') || actionLabel.includes('生成')) {
    return ['create']
  }

  if (actionLabel.includes('查看')) {
    return ['read']
  }

  return ['read']
}

export function buildEditorAuditTarget(
  moduleKey: string,
  statusOptions: string[],
  lineItemsLocked: boolean,
) {
  const lockedAuditStatus = getBehaviorValue(moduleKey, 'lockedAuditStatus')
  if (lineItemsLocked && typeof lockedAuditStatus === 'string') {
    return { key: 'status', value: lockedAuditStatus }
  }

  const auditStatus = getBehaviorValue(moduleKey, 'auditStatus')
  if (typeof auditStatus === 'string') {
    return { key: 'status', value: auditStatus }
  }

  if (statusOptions.includes('已审核')) {
    return { key: 'status', value: '已审核' }
  }
  if (statusOptions.includes('已核准')) {
    return { key: 'status', value: '已核准' }
  }

  return null
}
