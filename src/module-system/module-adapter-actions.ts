import type {
  ModuleFilterDefinition,
  ModuleFilterOptionEntry,
  ModuleFormFieldDefinition,
  ModuleFormFieldOption,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'
import { getBehaviorValue } from './module-behavior-registry'

export type ModuleActionKind =
  | 'openSupplierStatementGenerator'
  | 'openCustomerStatementGenerator'
  | 'openFreightStatementGenerator'
  | 'openCreateEditor'
  | 'exportMaterialRows'
  | 'exportRows'
  | 'openFreightPickupList'
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
  actionKey?: string
  actionLabel: string
  hasFormFields: boolean
  isMaterialModule: boolean
}): ModuleActionKind {
  const { moduleKey, actionKey, actionLabel, hasFormFields, isMaterialModule } =
    options

  if (actionKey) {
    const actionKindsByKey = getBehaviorValue(moduleKey, 'actionKindsByKey') as
      | Record<string, ModuleActionKind>
      | undefined
    const mappedByKey = actionKindsByKey?.[actionKey]
    if (mappedByKey) {
      return mappedByKey
    }
  }

  const actionKindsByLabel = getBehaviorValue(
    moduleKey,
    'actionKindsByLabel',
  ) as Record<string, ModuleActionKind> | undefined
  const mappedActionKind = actionKindsByLabel?.[actionLabel]
  if (mappedActionKind) {
    return mappedActionKind
  }

  if (
    (actionLabel.includes('新增') || actionLabel.includes('生成')) &&
    hasFormFields
  ) {
    return 'openCreateEditor'
  }

  if (actionLabel.includes('导出')) {
    return isMaterialModule ? 'exportMaterialRows' : 'exportRows'
  }

  return 'none'
}

export function resolveModuleActionPermissionCodes(options: {
  moduleKey?: string
  actionKey?: string
  actionLabel: string
}): PermissionActionCode[] {
  const { moduleKey, actionKey, actionLabel } = options

  if (moduleKey && actionKey) {
    const permissionCodesByActionKey = getBehaviorValue(
      moduleKey,
      'permissionCodesByActionKey',
    ) as Record<string, PermissionActionCode[]> | undefined
    const mappedByKey = permissionCodesByActionKey?.[actionKey]
    if (mappedByKey?.length) {
      return mappedByKey
    }
  }

  if (actionLabel === '配置权限') {
    return ['manage_permissions']
  }

  if (actionLabel === '页面上传命名规则') {
    return ['update']
  }

  if (actionLabel === '生成提货清单') {
    return ['export']
  }

  if (actionLabel === '模板下载') {
    return ['export']
  }

  if (actionLabel === '确认' || actionLabel === '反确认') {
    return ['audit']
  }

  if (actionLabel === '核准' || actionLabel === '反核准') {
    return ['audit']
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

export function resolveStatusChangeActionLabel(
  targetValue: unknown,
  reverse = false,
) {
  const normalizedTarget = String(targetValue ?? '').trim()
  if (normalizedTarget === '已确认' || normalizedTarget === '待确认') {
    return reverse ? '反确认' : '确认'
  }
  if (normalizedTarget === '已核准' || normalizedTarget === '未核准') {
    return reverse ? '反核准' : '核准'
  }
  return reverse ? '反审核' : '审核'
}

export function buildEditorAuditTarget(
  moduleKey: string,
  statusOptions: string[],
  currentStatus?: string,
) {
  const auditStatus = getBehaviorValue(moduleKey, 'auditStatus')
  if (typeof auditStatus === 'string') {
    if (currentStatus === auditStatus) return null
    return { key: 'status', value: auditStatus }
  }

  if (statusOptions.includes('已审核')) {
    if (currentStatus === '已审核') return null
    return { key: 'status', value: '已审核' }
  }
  if (statusOptions.includes('已核准')) {
    if (currentStatus === '已核准') return null
    return { key: 'status', value: '已核准' }
  }

  return null
}

export function buildReverseAuditTarget(
  moduleKey: string,
  statusOptions: string[],
  preferredStatus?: unknown,
) {
  const preferred = asString(preferredStatus).trim()
  if (preferred && statusOptions.includes(preferred)) {
    return { key: 'status', value: preferred }
  }

  const defaultStatus = getBehaviorValue(moduleKey, 'defaultStatus')
  if (typeof defaultStatus === 'string' && defaultStatus.trim()) {
    if (statusOptions.length > 0 && !statusOptions.includes(defaultStatus)) {
      return null
    }
    return { key: 'status', value: defaultStatus }
  }

  const fallbackStatuses = ['草稿', '未审核', '待审核', '待确认', '未核准']
  const fallback = fallbackStatuses.find((status) =>
    statusOptions.includes(status),
  )
  return fallback ? { key: 'status', value: fallback } : null
}

function normalizeOptions(values: unknown[]) {
  return Array.from(
    new Set(
      values.flatMap((value) => {
        const normalized = asString(value).trim()
        return normalized ? [normalized] : []
      }),
    ),
  )
}

function extractFilterOptionValues(options: ModuleFilterOptionEntry[]) {
  return normalizeOptions(
    options.flatMap((option) =>
      'options' in option
        ? option.options.map((entry) => entry.value)
        : option.value,
    ),
  )
}

function extractFormOptionValues(options: ModuleFormFieldOption[]) {
  return normalizeOptions(options.map((option) => option.value))
}

export function resolveStatusOptions(options: {
  fields?: Array<ModuleFormFieldDefinition | ModuleFilterDefinition>
}) {
  const statusField = options.fields?.find((field) => field.key === 'status')
  if (!statusField || !Array.isArray(statusField.options)) return []
  if (statusField.type === 'select') {
    const entries = statusField.options
    if (entries.some((option) => 'options' in option)) {
      return extractFilterOptionValues(entries as ModuleFilterOptionEntry[])
    }
    return extractFormOptionValues(entries as ModuleFormFieldOption[])
  }
  return []
}

export function buildListAuditTargets(options: {
  moduleKey: string
  statusOptions: string[]
  preferredStatus?: unknown
}) {
  const { moduleKey, statusOptions, preferredStatus } = options
  const auditSourceStatuses = getBehaviorValue(moduleKey, 'auditSourceStatuses')
  return {
    auditTarget: buildEditorAuditTarget(moduleKey, statusOptions),
    reverseAuditTarget: buildReverseAuditTarget(
      moduleKey,
      statusOptions,
      preferredStatus,
    ),
    auditSourceStatuses: Array.isArray(auditSourceStatuses)
      ? normalizeOptions(auditSourceStatuses)
      : undefined,
  }
}

export function canAuditFromStatus(
  currentStatus: unknown,
  auditTarget?: { value: string } | null,
  reverseAuditTarget?: { value: string } | null,
  auditSourceStatuses?: unknown[],
) {
  const status = asString(currentStatus).trim()
  const auditStatus = asString(auditTarget?.value).trim()
  const reverseStatus = asString(reverseAuditTarget?.value).trim()
  const sourceStatuses = normalizeOptions(auditSourceStatuses || [])
  if (auditStatus && sourceStatuses.length > 0) {
    return status !== auditStatus && sourceStatuses.includes(status)
  }
  return Boolean(
    auditStatus &&
      reverseStatus &&
      status !== auditStatus &&
      status === reverseStatus,
  )
}

export function canReverseAuditFromStatus(
  currentStatus: unknown,
  auditTarget?: { value: string } | null,
  reverseAuditTarget?: { value: string } | null,
) {
  const status = asString(currentStatus).trim()
  const auditStatus = asString(auditTarget?.value).trim()
  const reverseStatus = asString(reverseAuditTarget?.value).trim()
  return Boolean(auditStatus && reverseStatus && status === auditStatus)
}

export function resolveReverseAuditTargetForStatus(
  moduleKey: string,
  currentStatus: unknown,
  auditTarget?: { value: string } | null,
  reverseAuditTarget?: { value: string } | null,
): string | null {
  const status = asString(currentStatus).trim()
  const configuredTargets = getBehaviorValue(
    moduleKey,
    'reverseAuditTargetsByStatus',
  )
  const configuredTarget = configuredTargets?.[status]?.trim()
  if (configuredTarget) return configuredTarget

  return canReverseAuditFromStatus(status, auditTarget, reverseAuditTarget)
    ? asString(reverseAuditTarget?.value).trim()
    : null
}
