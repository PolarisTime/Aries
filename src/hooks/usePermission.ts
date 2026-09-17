import { useAuthStore } from '@/stores/authStore'
import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
} from '@/utils/permission'

const EMPTY_PERMISSIONS: readonly string[] = []

/** 当前登录用户的权限码集合（登录/刷新时由后端返回，存于 user.permissions）。 */
export function usePermissions(): readonly string[] {
  return useAuthStore((state) => state.user?.permissions ?? EMPTY_PERMISSIONS)
}

/** 是否拥有指定权限（支持 `*` 与 `资源:*` 通配）。 */
export function useHasPermission(code: string): boolean {
  return hasPermission(usePermissions(), code)
}

/** 是否拥有其中任意一个权限。 */
export function useHasAnyPermission(codes: readonly string[]): boolean {
  return hasAnyPermission(usePermissions(), codes)
}

/** 是否同时拥有全部权限。 */
export function useHasAllPermissions(codes: readonly string[]): boolean {
  return hasAllPermissions(usePermissions(), codes)
}
