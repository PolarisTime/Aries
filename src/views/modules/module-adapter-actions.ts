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

const actionKindByModuleAndLabel: Record<string, ModuleActionKind> = {
  'supplier-statements:生成对账单': 'openSupplierStatementGenerator',
  'customer-statements:生成对账单': 'openCustomerStatementGenerator',
  'freight-statements:生成物流对账单': 'openFreightStatementGenerator',
  'freight-bills:生成提货清单': 'openFreightPickupList',
  'freight-bills:标记送达': 'markSelectedFreightDelivered',
  'freight-statements:查看运费对账汇总': 'openFreightSummary',
  'role-settings:配置权限': 'navigateToRoleActionEditor',
}

const auditStatusByModuleKey: Record<string, string> = {
  'purchase-orders': '已审核',
  'purchase-inbounds': '已审核',
  'sales-outbounds': '已审核',
  'freight-bills': '已审核',
}

export function resolveModuleActionKind(options: {
  moduleKey: string
  actionLabel: string
  hasFormFields: boolean
  isMaterialModule: boolean
}): ModuleActionKind {
  const { moduleKey, actionLabel, hasFormFields, isMaterialModule } = options

  const mappedActionKind = actionKindByModuleAndLabel[`${moduleKey}:${actionLabel}`]
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
  salesOrderLineLocked: boolean,
) {
  if (moduleKey === 'sales-orders') {
    return {
      key: 'status',
      value: salesOrderLineLocked ? '完成销售' : '已审核',
    }
  }

  if (auditStatusByModuleKey[moduleKey]) {
    return { key: 'status', value: auditStatusByModuleKey[moduleKey] }
  }

  if (statusOptions.includes('已审核')) {
    return { key: 'status', value: '已审核' }
  }
  if (statusOptions.includes('已核准')) {
    return { key: 'status', value: '已核准' }
  }

  return null
}
