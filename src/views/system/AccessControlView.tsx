import { useLocation, useNavigate } from '@tanstack/react-router'
import Empty from 'antd/es/empty'
import Tabs from 'antd/es/tabs'
import { lazy, Suspense, useCallback, useMemo } from 'react'
import type { AppPageDefinition } from '@/config/page-registry'
import { usePermissionStore } from '@/stores/permissionStore'
import { BusinessGridPageSkeleton } from '@/views/modules/components/BusinessGridPageSkeleton'

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

const LazyPermissionGridPage = lazy(() =>
  import('@/views/modules/BusinessGridPage').then((m) => ({
    default: m.BusinessGridPage,
  })),
)

const LazyRoleActionEditor = lazy(() =>
  import('@/views/system/RoleActionEditor').then((m) => ({
    default: m.RoleActionEditor,
  })),
)

const LazyUserAccountManagementView = lazy(() =>
  import('@/views/system/UserAccountManagementView').then((m) => ({
    default: m.UserAccountManagementView,
  })),
)

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
    }> = []
    if (canViewUsers) {
      items.push({
        key: 'users',
        label: '用户账户',
      })
    }
    if (canViewRoles) {
      items.push({
        key: 'roles',
        label: '角色权限',
      })
    }
    if (canViewPermissions) {
      items.push({
        key: 'permissions',
        label: '权限目录',
      })
    }
    return items
  }, [canViewUsers, canViewRoles, canViewPermissions])

  const searchParams = useMemo(
    () => new URLSearchParams(location.searchStr),
    // react-doctor: TanStack Router useLocation() returns reactive state that triggers re-renders on navigation
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
      void navigate({ to: `/access-control?tab=${key}` as '/' })
    },
    [navigate],
  )

  if (tabItems.length === 0) {
    return (
      <div className="page-stack">
        <Empty
          description="暂无可用模块，请联系管理员分配权限"
          className="mt-120"
        />
      </div>
    )
  }

  const activeContent = (() => {
    if (activeTab === 'users') {
      return (
        <Suspense fallback={<BusinessGridPageSkeleton />}>
          <LazyUserAccountManagementView active />
        </Suspense>
      )
    }
    if (activeTab === 'roles') {
      return (
        <Suspense fallback={<BusinessGridPageSkeleton />}>
          <LazyRoleActionEditor active />
        </Suspense>
      )
    }
    if (activeTab === 'permissions') {
      return (
        <Suspense fallback={<BusinessGridPageSkeleton />}>
          <LazyPermissionGridPage pageDef={permPageDef} />
        </Suspense>
      )
    }
    return null
  })()

  return (
    <div className="page-stack">
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        tabBarStyle={{ marginBottom: 0 }}
      />
      {activeContent}
    </div>
  )
}
