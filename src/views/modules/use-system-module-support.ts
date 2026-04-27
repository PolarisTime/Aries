import { computed, watch, type Ref } from 'vue'
import { keepPreviousData, useQuery } from '@tanstack/vue-query'
import { listAllBusinessModuleRows } from '@/api/business'
import { roleTypeValues } from '@/constants/module-options'
import type { ModuleFormFieldDefinition } from '@/types/module-page'
import {
  buildRoleTreeData,
  defaultRoleCatalog,
  getRolePermissionLabels,
  getSystemHelperTitle,
  isSystemHelperVisible,
  syncSystemEditorState,
} from './module-adapter-system'
import { normalizeStringArray } from './module-adapter-shared'

interface UseSystemModuleSupportOptions {
  moduleKey: Ref<string>
  editorVisible: Ref<boolean>
  editorForm: Record<string, unknown>
  canViewModuleRecords: (moduleKey: string) => boolean
}

function normalizeTreeCheckedKeys(
  checkedKeys: Array<string | number> | { checked: Array<string | number>; halfChecked?: Array<string | number> },
) {
  const rawKeys = Array.isArray(checkedKeys) ? checkedKeys : checkedKeys.checked
  return rawKeys.map((item) => String(item))
}

function filterLeafTreeKeys(keys: string[], leafKeySet: Set<string>) {
  return Array.from(new Set(keys.filter((key) => leafKeySet.has(key))))
}

export function useSystemModuleSupport(options: UseSystemModuleSupportOptions) {
  const roleListQuery = useQuery({
    queryKey: ['business-grid-all', 'role-settings', 'role-catalog'],
    queryFn: () => listAllBusinessModuleRows('role-settings', {}),
    enabled: computed(() =>
      options.editorVisible.value
      && options.moduleKey.value === 'user-accounts'
      && options.canViewModuleRecords('role-settings'),
    ),
    placeholderData: keepPreviousData,
  })

  const roleRows = computed(() => roleListQuery.data.value || [])
  const dynamicRoleCatalog = computed(() => {
    if (roleRows.value.length > 0) {
      return roleRows.value
        .map((record) => ({
          roleName: String(record.roleName || ''),
          roleType: String(record.roleType || roleTypeValues[1]),
        }))
        .filter((item) => item.roleName)
    }

    return defaultRoleCatalog
  })
  const roleLeafKeySet = computed(() => new Set(dynamicRoleCatalog.value.map((item) => item.roleName)))

  const checkedRoleNames = computed(() => normalizeStringArray(options.editorForm.roleNames))
  const roleTreeData = computed(() => buildRoleTreeData(dynamicRoleCatalog.value))
  const selectedRolePermissionLabels = computed(() => getRolePermissionLabels(checkedRoleNames.value))
  const systemHelperVisible = computed(() => isSystemHelperVisible(options.moduleKey.value))
  const systemHelperTitle = computed(() => getSystemHelperTitle(options.moduleKey.value))

  function syncEditorState() {
    syncSystemEditorState(options.moduleKey.value, options.editorForm)
  }

  function isRoleTreeField(field: ModuleFormFieldDefinition) {
    return options.moduleKey.value === 'user-accounts' && field.key === 'roleNames'
  }

  function handleRoleTreeCheck(
    checkedKeys: Array<string | number> | { checked: Array<string | number>; halfChecked?: Array<string | number> },
  ) {
    options.editorForm.roleNames = filterLeafTreeKeys(
      normalizeTreeCheckedKeys(checkedKeys),
      roleLeafKeySet.value,
    )
  }

  watch(
    () => options.editorForm.permissionCodes,
    () => {
      syncEditorState()
    },
    { deep: true },
  )

  watch(
    () => options.editorForm.roleNames,
    () => {
      syncEditorState()
    },
    { deep: true },
  )

  watch(
    () => [options.editorForm.moduleName, options.editorForm.permissionType, options.editorForm.actionName] as const,
    () => {
      syncEditorState()
    },
  )

  return {
    checkedRoleNames,
    handleRoleTreeCheck,
    isRoleTreeField,
    roleTreeData,
    selectedRolePermissionLabels,
    syncEditorState,
    systemHelperTitle,
    systemHelperVisible,
  }
}
