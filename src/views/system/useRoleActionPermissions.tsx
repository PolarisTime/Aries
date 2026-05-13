import { asString } from '@/utils/type-narrowing'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import Checkbox from 'antd/es/checkbox'
import { useCallback, useMemo, useState } from 'react'
import {
  getRoleActions,
  listSystemMenus,
  type MenuNode,
  type RoleRecord,
  updateRoleActions,
} from '@/api/role-actions'
import { useRequestError } from '@/hooks/useRequestError'
import {
  ALL_ROLE_ACTIONS,
  buildNormalizedRoleActionSet,
  buildRoleMatrixData,
  flattenRoleActionMenus,
  ROLE_ACTION_LABELS,
  type RoleMatrixRow,
} from '@/views/system/role-action-view-utils'
import { message } from '@/utils/antd-app'

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
  const { showError } = useRequestError()
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list')

  const { data: menuTree = [] } = useQuery({
    queryKey: ['role-permission-options'],
    queryFn: listSystemMenus,
    enabled: enabled && canEditPermissions,
  })

  const selectedRoleInfo = useMemo(
    () => roles.find((role) => role.id === selectedRoleId),
    [roles, selectedRoleId],
  )

  const flatMenus = useMemo(() => flattenRoleActionMenus(menuTree), [menuTree])

  const menuResourceLookup = useMemo(() => {
    const map = new Map<string, string>()
    for (const menu of flatMenus) {
      map.set(menu.menuCode, menu.resource)
    }
    return map
  }, [flatMenus])

  const matrixData = useMemo(
    () => buildRoleMatrixData(flatMenus, selectedActions),
    [flatMenus, selectedActions],
  )

  const selectRole = useCallback(
    async (role: RoleRecord) => {
      setSelectedRoleId(role.id)
      try {
        const actions = buildNormalizedRoleActionSet(
          await getRoleActions(role.id),
        )
        setSelectedActions(actions)
      } catch (error) {
        setSelectedActions(new Set())
        showError(error, '加载角色权限失败')
      }
    },
    [showError],
  )

  const isMenuChecked = useCallback(
    (menuCode: string) => {
      const resource = menuResourceLookup.get(menuCode) || menuCode
      for (const key of selectedActions) {
        if (key.startsWith(`${resource}:`)) return true
      }
      return false
    },
    [selectedActions, menuResourceLookup],
  )

  const isMenuFullyChecked = useCallback(
    (menu: MenuNode) => {
      const resource = menu.resourceCode || menu.menuCode
      return menu.actions.every((action) =>
        selectedActions.has(`${resource}:${action}`),
      )
    },
    [selectedActions],
  )

  const isMenuPartiallyChecked = useCallback(
    (menu: MenuNode) =>
      isMenuChecked(menu.menuCode) && !isMenuFullyChecked(menu),
    [isMenuChecked, isMenuFullyChecked],
  )

  const toggleAction = useCallback(
    (menuCode: string, action: string) => {
      if (!canEditPermissions) {
        message.warning('暂无权限配置编辑权限')
        return
      }
      const resource = menuResourceLookup.get(menuCode) || menuCode
      const key = `${resource}:${action}`
      const next = new Set(selectedActions)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      setSelectedActions(next)
    },
    [canEditPermissions, selectedActions, menuResourceLookup],
  )

  const isActionSelected = useCallback(
    (menuCode: string, action: string) => {
      const resource = menuResourceLookup.get(menuCode) || menuCode
      return selectedActions.has(`${resource}:${action}`)
    },
    [selectedActions, menuResourceLookup],
  )

  const toggleAllMenuActions = useCallback(
    (menu: MenuNode) => {
      if (!canEditPermissions) {
        message.warning('暂无权限配置编辑权限')
        return
      }
      const next = new Set(selectedActions)
      const resource = menu.resourceCode || menu.menuCode
      const allChecked = menu.actions.every((action) =>
        next.has(`${resource}:${action}`),
      )
      for (const action of menu.actions) {
        const key = `${resource}:${action}`
        if (allChecked) next.delete(key)
        else next.add(key)
      }
      setSelectedActions(next)
    },
    [canEditPermissions, selectedActions],
  )

  const selectAll = useCallback(() => {
    if (!canEditPermissions) {
      message.warning('暂无权限配置编辑权限')
      return
    }
    const next = new Set<string>()
    for (const menu of flatMenus) {
      for (const action of menu.actions) {
        next.add(`${menu.resource}:${action}`)
      }
    }
    setSelectedActions(next)
  }, [canEditPermissions, flatMenus])

  const deselectAll = useCallback(() => {
    if (!canEditPermissions) {
      message.warning('暂无权限配置编辑权限')
      return
    }
    setSelectedActions(new Set())
  }, [canEditPermissions])

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
      message.success('权限保存成功')
    },
    onError: (error: Error) => showError(error, '保存失败'),
  })

  const matrixColumns = useMemo<TableColumnsType<RoleMatrixRow>>(() => {
    const columns: TableColumnsType<RoleMatrixRow> = [
      {
        dataIndex: 'menuName',
        title: '菜单名称',
        width: 160,
        fixed: 'left',
      },
    ]

    for (const action of ALL_ROLE_ACTIONS) {
      if (!flatMenus.some((menu) => menu.actions.includes(action))) {
        continue
      }
      columns.push({
        dataIndex: action,
        title: ROLE_ACTION_LABELS[action] || action,
        width: 70,
        align: 'center',
        render: (checked: unknown, record: RoleMatrixRow) => {
          const supported =
            Array.isArray(record.actions) &&
            (record.actions as string[]).includes(action)
          if (!supported) {
            return <span style={{ color: '#d9d9d9' }}>-</span>
          }
          return (
            <Checkbox
              checked={Boolean(checked)}
              disabled={!canEditPermissions}
              onChange={() =>
                toggleAction(asString(record.menuCode), action)
              }
            />
          )
        },
      })
    }

    columns.push({
      dataIndex: '_count',
      title: '已授权',
      width: 70,
      align: 'center',
    })

    return columns
  }, [canEditPermissions, flatMenus, toggleAction])

  return {
    selectedRoleId,
    selectedRoleInfo,
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
    actionLabels: ROLE_ACTION_LABELS,
  }
}
