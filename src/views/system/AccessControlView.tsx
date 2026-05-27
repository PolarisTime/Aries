import { useLocation, useNavigate } from '@tanstack/react-router'
import Empty from 'antd/es/empty'
import Tabs from 'antd/es/tabs'
import { lazy, Suspense, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppPageDefinition } from '@/config/page-registry'
import { usePermissionStore } from '@/stores/permissionStore'
import { BusinessGridPageSkeleton } from '@/views/modules/components/BusinessGridPageSkeleton'

type TabKey = 'users' | 'roles' | 'permissions'

function parseTabKey(raw: string | null): TabKey {
  if (raw === 'roles' || raw === 'permissions') return raw
  return 'users'
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
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const permissionStore = usePermissionStore()

  const permPageDef: AppPageDefinition = {
    key: 'permission',
    title: t('system.accessControl.title'),
    menuKey: '/permission',
    view: 'business-grid',
    icon: 'TeamOutlined',
    menuParent: 'system',
    moduleKey: 'permission',
    resourceKey: 'permission',
  }

  const canViewUsers = permissionStore.can('user-account', 'read')
  const canViewRoles = permissionStore.can('role', 'read')
  const canViewPermissions = permissionStore.can('permission', 'read')

  const tabItems = useMemo(() => {
    const items: Array<{
      key: TabKey
      label: string
    }> = []
    if (canViewUsers) {
      items.push({
        key: 'users',
        label: t('system.accessControl.tabUsers'),
      })
    }
    if (canViewRoles) {
      items.push({
        key: 'roles',
        label: t('system.accessControl.tabRoles'),
      })
    }
    if (canViewPermissions) {
      items.push({
        key: 'permissions',
        label: t('system.accessControl.tabPermissions'),
      })
    }
    return items
  }, [canViewUsers, canViewRoles, canViewPermissions])

  const searchParams = useMemo(
    () => new URLSearchParams(location.searchStr),
    [location],
  )
  const requestedTab = parseTabKey(searchParams.get('tab'))
  const activeTab = useMemo(() => {
    if (tabItems.length === 0) return null as unknown as TabKey
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
          description={t('system.accessControl.noModules')}
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
