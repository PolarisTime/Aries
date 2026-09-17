/**
 * 前端权限判定工具（与后端 RBAC 权限码语义一致）。
 *
 * 权限码格式为 `资源:动作`（如 `user-accounts:read`），支持两种通配：
 * - 全局通配 `*`：拥有全部权限；
 * - 资源通配 `资源:*`：拥有该资源下所有动作。
 *
 * 说明：前端权限仅用于菜单/按钮的可见性与可操作性控制，服务端每次请求
 * 仍会实时解析权限并作为最终权威；前端不据此做安全承诺。
 */
export const PERMISSION_WILDCARD = '*'

export function hasPermission(
  permissions: readonly string[] | null | undefined,
  code: string | null | undefined,
): boolean {
  if (!code) {
    return true
  }
  if (!permissions || permissions.length === 0) {
    return false
  }
  if (permissions.includes(PERMISSION_WILDCARD)) {
    return true
  }
  if (permissions.includes(code)) {
    return true
  }
  const resource = code.split(':')[0]
  return Boolean(resource) && permissions.includes(`${resource}:*`)
}

export function hasAnyPermission(
  permissions: readonly string[] | null | undefined,
  codes: readonly string[],
): boolean {
  return codes.some((code) => hasPermission(permissions, code))
}

export function hasAllPermissions(
  permissions: readonly string[] | null | undefined,
  codes: readonly string[],
): boolean {
  return codes.every((code) => hasPermission(permissions, code))
}
