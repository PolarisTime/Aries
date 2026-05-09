import { useLocation, useNavigate } from '@tanstack/react-router'
import { Empty, Tabs } from 'antd'
import { useCallback, useMemo } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { usePermissionStore } from '@/stores/permissionStore'
import { BusinessGridPage } from '@/views/modules/BusinessGridPage'
import { RoleActionEditor } from '@/views/system/RoleActionEditor'
import { UserAccountManagementView } from '@/views/system/UserAccountManagementView'

type TabKey = 'users' | 'roles' | 'permissions'

function parseTabKey(raw: string | null): TabKey {
  if (raw === 'roles' || raw === 'permissions') return raw
  return 'users'
}

const permPageDef: AppPageDefinition = {
  key: 'permission',
  title: '权限管理',
  menuKey: '/permission',
  view: 'business-grid',
  icon: 'TeamOutlined',
  menuParent: 'system',
  moduleKey: 'permission',
  resourceKey: 'permission',
}

export function AccessControlView() {
  const location = useLocation()
  const navigate = useNavigate()
  const permissionStore = usePermissionStore()

  const canViewUsers = permissionStore.can('user-account', 'read')
  const canViewRoles = permissionStore.can('role', 'manage_permissions')
  const canViewPermissions = permissionStore.can('permission', 'read')

  const tabItems = useMemo(() => {
    const items: Array<{
      key: TabKey
      label: string
      children: React.ReactNode
    }> = []
    if (canViewUsers) {
      items.push({
        key: 'users',
        label: '用户账户',
        children: <UserAccountManagementView />,
      })
    }
    if (canViewRoles) {
      items.push({
        key: 'roles',
        label: '角色权限',
        children: <RoleActionEditor />,
      })
    }
    if (canViewPermissions) {
      items.push({
        key: 'permissions',
        label: '权限目录',
        children: <BusinessGridPage pageDef={permPageDef} />,
      })
    }
    return items
  }, [canViewUsers, canViewRoles, canViewPermissions])

  const searchParams = useMemo(
    () => new URLSearchParams(location.searchStr),
    [location.searchStr],
  )
  const requestedTab = parseTabKey(searchParams.get('tab'))
  const activeTab = useMemo(() => {
    if (tabItems.length === 0) return 'users'
    const keys = tabItems.map((item) => item.key)
    return keys.includes(requestedTab) ? requestedTab : keys[0]
  }, [requestedTab, tabItems])

  const handleTabChange = useCallback(
    (key: string) => {
      navigate({ to: `/access-control?tab=${key}` as '/' })
    },
    [navigate],
  )

  if (tabItems.length === 0) {
    return (
      <div className="page-stack">
        <Empty
          description="暂无可用模块，请联系管理员分配权限"
          style={{ marginTop: 120 }}
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 0 }}
      />
    </div>
  )
}
