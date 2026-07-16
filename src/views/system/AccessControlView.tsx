import { useLocation, useNavigate } from '@tanstack/react-router'
import { Empty, Tabs } from 'antd'
import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { AppProPage } from '@/components/AppProPage'
import type { AppPageDefinition } from '@/config/page-registry'
import { useResourcePermissions } from '@/hooks/useResourcePermissions'
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
  const { canRead: canViewUsers } = useResourcePermissions('user-account')
  const { canRead: canViewRoles } = useResourcePermissions('role')
  const { canRead: canViewPermissions } = useResourcePermissions('permission')

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

  const tabItems: Array<{
    key: TabKey
    label: string
  }> = []
  if (canViewUsers) {
    tabItems.push({
      key: 'users',
      label: t('system.accessControl.tabUsers'),
    })
  }
  if (canViewRoles) {
    tabItems.push({
      key: 'roles',
      label: t('system.accessControl.tabRoles'),
    })
  }
  if (canViewPermissions) {
    tabItems.push({
      key: 'permissions',
      label: t('system.accessControl.tabPermissions'),
    })
  }

  const searchParams = new URLSearchParams(location.searchStr)
  const requestedTab = parseTabKey(searchParams.get('tab'))
  const activeTab = (() => {
    if (tabItems.length === 0) return null as unknown as TabKey
    const keys = tabItems.map((item) => item.key)
    return keys.includes(requestedTab) ? requestedTab : keys[0]
  })()

  const handleTabChange = (key: string) => {
    void navigate({ to: `/access-control?tab=${key}` as '/' })
  }

  if (tabItems.length === 0) {
    return (
      <AppProPage
        className="access-control-page"
        title={t('system.accessControl.title')}
        description={t('system.accessControl.description')}
      >
        <Empty
          description={t('system.accessControl.noModules')}
          className="mt-120"
        />
      </AppProPage>
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
    <AppProPage
      className="access-control-page"
      title={t('system.accessControl.title')}
      description={t('system.accessControl.description')}
    >
      <div className="page-stack settings-tabbed-page">
        <Tabs
          className="settings-navigation-tabs"
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 0 }}
        />
        <div className="settings-page-content">{activeContent}</div>
      </div>
    </AppProPage>
  )
}
