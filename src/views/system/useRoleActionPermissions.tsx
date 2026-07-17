import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Checkbox } from 'antd'
import i18next from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getRoleActions,
  listSystemMenus,
  type MenuNode,
  type RoleRecord,
  updateRoleActions,
} from '@/api/role-actions'
import { QUERY_KEYS } from '@/constants/query-keys'
import { useRequestError } from '@/hooks/useRequestError'
import { hasPermission, usePermissionStore } from '@/stores/permissionStore'
import { message } from '@/utils/antd-app'
import { asArray, asString } from '@/utils/type-narrowing'
import {
  buildNormalizedRoleActionSet,
  buildRoleMatrixData,
  flattenRoleActionMenus,
  ROLE_ACTION_LABELS,
  type RoleMatrixRow,
} from '@/views/system/role-action-view-utils'

interface UseRoleActionPermissionsOptions {
  roles: RoleRecord[]
  canEditPermissions: boolean
  enabled?: boolean
}

export function useRoleActionPermissions({
  roles,
  canEditPermissions,
  enabled = true,
}: UseRoleActionPermissionsOptions) {
  const { t } = useTranslation()
  const { showError } = useRequestError()
  const queryClient = useQueryClient()
  const permissionMap = usePermissionStore((state) => state.permissionMap)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list')

  const { data: menuTree = [] } = useQuery({
    queryKey: QUERY_KEYS.rolePermissionOptions,
    queryFn: listSystemMenus,
    enabled,
  })

  const selectedRoleInfo = roles.find((role) => role.id === selectedRoleId)
  const canEditSelectedRolePermissions = Boolean(
    canEditPermissions &&
      selectedRoleInfo &&
      selectedRoleInfo.roleCode.trim().toUpperCase() !== 'ADMIN' &&
      selectedRoleInfo.assignable !== false,
  )

  const flatMenus = flattenRoleActionMenus(menuTree)

  const menuResourceLookup = (() => {
    const map = new Map<string, string>()
    for (const menu of flatMenus) {
      map.set(menu.menuCode, menu.resource)
    }
    return map
  })()

  const canGrantAction = (resource: string, action: string) =>
    hasPermission(permissionMap, resource, action)

  const isActionEditable = (menuCode: string, action: string) => {
    const resource = menuResourceLookup.get(menuCode) || menuCode
    return canEditSelectedRolePermissions && canGrantAction(resource, action)
  }

  const matrixData = buildRoleMatrixData(flatMenus, selectedActions)

  const selectRole = async (role: RoleRecord) => {
    setSelectedRoleId(role.id)
    try {
      const actions = buildNormalizedRoleActionSet(
        await getRoleActions(role.id),
      )
      setSelectedActions(actions)
    } catch (error) {
      setSelectedActions(new Set())
      showError(error, i18next.t('system.rolePermissions.loadFailed'))
    }
  }

  const isMenuChecked = (menuCode: string) => {
    const resource = menuResourceLookup.get(menuCode) || menuCode
    for (const key of selectedActions) {
      if (key.startsWith(`${resource}:`)) return true
    }
    return false
  }

  const isMenuFullyChecked = (menu: MenuNode) => {
    const resource = menu.resourceCode || menu.menuCode
    const relevantActions = canEditSelectedRolePermissions
      ? menu.actions.filter((action) => canGrantAction(resource, action))
      : menu.actions
    return (
      relevantActions.length > 0 &&
      relevantActions.every((action) =>
        selectedActions.has(`${resource}:${action}`),
      )
    )
  }

  const isMenuPartiallyChecked = (menu: MenuNode) =>
    isMenuChecked(menu.menuCode) && !isMenuFullyChecked(menu)

  const toggleAction = (menuCode: string, action: string) => {
    if (!isActionEditable(menuCode, action)) {
      message.warning(i18next.t('system.rolePermissions.noEditPermission'))
      return
    }
    const resource = menuResourceLookup.get(menuCode) || menuCode
    const key = `${resource}:${action}`
    const next = new Set(selectedActions)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setSelectedActions(next)
  }

  const isActionSelected = (menuCode: string, action: string) => {
    const resource = menuResourceLookup.get(menuCode) || menuCode
    return selectedActions.has(`${resource}:${action}`)
  }

  const toggleAllMenuActions = (menu: MenuNode) => {
    if (!canEditSelectedRolePermissions) {
      message.warning(i18next.t('system.rolePermissions.noEditPermission'))
      return
    }
    const next = new Set(selectedActions)
    const resource = menu.resourceCode || menu.menuCode
    const editableActions = menu.actions.filter((action) =>
      canGrantAction(resource, action),
    )
    const allChecked = editableActions.every((action) =>
      next.has(`${resource}:${action}`),
    )
    for (const action of editableActions) {
      const key = `${resource}:${action}`
      if (allChecked) next.delete(key)
      else next.add(key)
    }
    setSelectedActions(next)
  }

  const selectAll = () => {
    if (!canEditSelectedRolePermissions) {
      message.warning(i18next.t('system.rolePermissions.noEditPermission'))
      return
    }
    const next = new Set<string>()
    for (const menu of flatMenus) {
      for (const action of menu.actions) {
        if (canGrantAction(menu.resource, action)) {
          next.add(`${menu.resource}:${action}`)
        }
      }
    }
    setSelectedActions(next)
  }

  const deselectAll = () => {
    if (!canEditSelectedRolePermissions) {
      message.warning(i18next.t('system.rolePermissions.noEditPermission'))
      return
    }
    setSelectedActions(new Set())
  }

  const saveRoleActionsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoleId) return
      const actions = Array.from(selectedActions).map((key) => {
        const [resource, action] = key.split(':')
        return { resource, action }
      })
      await updateRoleActions(selectedRoleId, actions)
    },
    onSuccess: () => {
      message.success(t('common.saveSuccess'))
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roleSettings,
      })
      void queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roleOptions,
      })
    },
    onError: (error: Error) =>
      showError(error, i18next.t('system.rolePermissions.saveFailed')),
  })

  const matrixColumns: TableColumnsType<RoleMatrixRow> = (() => {
    const columns: TableColumnsType<RoleMatrixRow> = [
      {
        dataIndex: 'menuName',
        title: i18next.t('system.rolePermissions.colMenuName'),
        width: 160,
        fixed: 'left',
      },
    ]

    const allMenuActionsSet = new Set(flatMenus.flatMap((m) => m.actions))
    for (const action of allMenuActionsSet) {
      columns.push({
        dataIndex: action,
        title: ROLE_ACTION_LABELS[action] || action,
        width: 70,
        align: 'center',
        render: (checked: unknown, record: RoleMatrixRow) => {
          const supported = new Set(asArray<string>(record.actions)).has(action)
          if (!supported) {
            return <span className="text-disabled">-</span>
          }
          return (
            <Checkbox
              checked={Boolean(checked)}
              disabled={
                !canEditSelectedRolePermissions ||
                !canGrantAction(asString(record.resource), action)
              }
              onChange={() => toggleAction(asString(record.menuCode), action)}
            />
          )
        },
      })
    }

    columns.push({
      dataIndex: '_count',
      title: i18next.t('system.rolePermissions.colAuthorized'),
      width: 70,
      align: 'center',
    })

    return columns
  })()

  return {
    selectedRoleId,
    selectedRoleInfo,
    canEditSelectedRolePermissions,
    viewMode,
    setViewMode,
    menuTree,
    matrixColumns,
    matrixData,
    savePending: saveRoleActionsMutation.isPending,
    selectRole,
    selectAll,
    deselectAll,
    saveRoleActions: () => saveRoleActionsMutation.mutate(),
    isMenuChecked,
    isMenuPartiallyChecked,
    isActionSelected,
    toggleAllMenuActions,
    toggleAction,
    isActionEditable,
    actionLabels: ROLE_ACTION_LABELS,
  }
}
