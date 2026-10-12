import type { TFunction } from 'i18next'
import type {
  RoleFormValues,
  RoleResponse,
  RoleUpdatePayload,
} from '@/shared/schemas'
import {
  buildRolePayload,
  emptyRoleFormValues,
  roleToFormValues,
} from '@/views/system/role-form-utils'
import { isWildcardPermission } from '@/views/system/role-permission-utils'

export interface RoleWizardSubmit {
  id?: string
  payload: RoleUpdatePayload
  permissions: string[]
}

/** 向导标题的 i18n key：克隆 > 编辑 > 新建。 */
export function resolveRoleWizardTitleKey(
  cloning: boolean,
  editing: boolean,
): string {
  if (cloning) return 'system.role.cloneRole'
  if (editing) return 'system.role.editRole'
  return 'system.role.newRole'
}

/** 权限来源角色 id：克隆时取克隆源，否则取编辑目标；都没有则为空（新建）。 */
export function resolveRoleWizardSourceId(
  role: RoleResponse | null,
  cloneFrom: RoleResponse | null,
): string {
  const source = cloneFrom ?? role
  return source?.id ?? ''
}

/** 基本信息步骤的表单初值：克隆以源角色为初值，编辑回填，新建留空。 */
export function buildRoleWizardInitialValues(options: {
  cloning: boolean
  role: RoleResponse | null
  cloneFrom: RoleResponse | null
  t: TFunction
}): RoleFormValues {
  const { cloning, role, cloneFrom, t } = options
  if (cloning) {
    return {
      code: `${cloneFrom?.code ?? ''}_copy`,
      name: `${cloneFrom?.name ?? ''}${t('system.role.cloneNameSuffix')}`,
      description: cloneFrom?.description ?? '',
    }
  }
  return role ? roleToFormValues(role) : emptyRoleFormValues()
}

/**
 * 组装向导提交结果。
 *
 * <p>权限以「用户是否动过权限选择」为准：动过就用本次选择，没动过则沿用角色已有权限
 * （权限列表还没加载完时用户直接保存，不能把已有权限清空）。通配 `*` 不下发。</p>
 */
export function buildRoleWizardSubmit(options: {
  cloning: boolean
  roleId?: string
  builtin: boolean
  values: RoleFormValues
  permissionsTouched: boolean
  selectedPermissions: string[]
  rolePermissions?: string[]
}): RoleWizardSubmit {
  const {
    cloning,
    roleId,
    builtin,
    values,
    permissionsTouched,
    selectedPermissions,
    rolePermissions,
  } = options
  const effectivePermissions = permissionsTouched
    ? selectedPermissions
    : (rolePermissions ?? [])
  return {
    id: cloning ? undefined : roleId,
    payload: buildRolePayload(values, builtin),
    permissions: effectivePermissions.filter(
      (code) => !isWildcardPermission(code),
    ),
  }
}
