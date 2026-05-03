import { computed, type Ref } from 'vue'
import { resolveResourceKey } from '@/constants/resource-permissions'
import { usePermissionStore } from '@/stores/permission'
import type { PermissionActionCode } from './module-adapter-actions'

export function useModulePermissions(moduleKey: Ref<string>) {
  const permissionStore = usePermissionStore()
  const moduleResource = computed(() => resolveResourceKey(moduleKey.value))
  const canViewRecords = computed(() => permissionStore.can(moduleResource.value, 'read'))
  const canCreateRecords = computed(() => permissionStore.can(moduleResource.value, 'create'))
  const canEditRecords = computed(() => permissionStore.can(moduleResource.value, 'update'))
  const canDeleteRecords = computed(() => permissionStore.can(moduleResource.value, 'delete'))
  const canAuditRecords = computed(() => permissionStore.can(moduleResource.value, 'audit'))
  const canExportRecords = computed(() => permissionStore.can(moduleResource.value, 'export'))
  const canPrintRecords = computed(() => permissionStore.can(moduleResource.value, 'print'))

  function hasAnyModuleAction(actionCodes: PermissionActionCode[]) {
    return actionCodes.some((actionCode) => permissionStore.can(moduleResource.value, actionCode))
  }

  function canViewModuleRecords(targetModuleKey: string | null | undefined) {
    return Boolean(targetModuleKey) && permissionStore.can(resolveResourceKey(String(targetModuleKey)), 'read')
  }

  return {
    canAuditRecords,
    canCreateRecords,
    canDeleteRecords,
    canEditRecords,
    canExportRecords,
    canPrintRecords,
    canViewModuleRecords,
    canViewRecords,
    hasAnyModuleAction,
    moduleResource,
  }
}
