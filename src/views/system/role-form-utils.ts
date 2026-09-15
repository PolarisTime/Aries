import type {
  RoleFormValues,
  RoleResponse,
  RoleUpdatePayload,
} from '@/shared/schemas'
import { roleFormSchema } from '@/shared/schemas/role'

export function emptyRoleFormValues(): RoleFormValues {
  return { code: '', name: '', description: '' }
}

export function roleToFormValues(role: RoleResponse): RoleFormValues {
  return {
    code: role.code,
    name: role.name,
    description: role.description ?? '',
  }
}

/**
 * 校验并组装角色保存载荷：内置角色不允许提交 code（保持只读）。
 */
export function buildRolePayload(
  values: RoleFormValues,
  builtin: boolean,
): RoleUpdatePayload {
  const parsed = roleFormSchema.parse(values)
  const payload: RoleUpdatePayload = {
    name: parsed.name,
    description: parsed.description || undefined,
  }
  if (!builtin) {
    payload.code = parsed.code
  }
  return payload
}
