import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { Layout, Menu } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore } from 'zustand'
import { AppAntdProvider } from '@/components/AppAntdProvider'
import { AppErrorBoundary } from '@/components/AppErrorBoundary'
import { getPageDefinition, getPageRoutePath } from '@/config/page-registry'
import { useAuthAppSync } from '@/hooks/useAuthAppSync'
import { useAuthHeartbeat } from '@/hooks/useAuthHeartbeat'
import { useAuthRefreshTimer } from '@/hooks/useAuthRefreshTimer'
import { AppLayoutHeader } from '@/layouts/AppLayoutHeader'
import {
  buildAppLayoutStyles,
  buildAppLayoutUserInfo,
  buildClockDisplay,
} from '@/layouts/app-layout-utils'
import { EditorWorkspaceTabs } from '@/layouts/editor-workspace/EditorWorkspaceTabs'
import { editorTaskStore } from '@/layouts/editor-workspace/editor-task-store'
import type { GlobalSearchResult } from '@/layouts/global-search'
import { LazyPersonalSettingsModal } from '@/layouts/LazyPersonalSettingsModal'
import { resolveRoutePageContext } from '@/layouts/route-page-context'
import { useAppLayoutClock } from '@/layouts/useAppLayoutClock'
import { useAppLayoutMenuState } from '@/layouts/useAppLayoutMenuState'
import { useAppLayoutSessionGuards } from '@/layouts/useAppLayoutSessionGuards'
import { useBackendStatus } from '@/layouts/useBackendStatus'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'
import {
  type LayoutMode,
  usePersonalSettings,
} from '@/layouts/usePersonalSettings'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSystemMenuStore } from '@/stores/systemMenuStore'
import { message, modal } from '@/utils/antd-app'
import { appTitle } from '@/utils/env'
import type { ThemeMode } from '@/utils/storage'

const { Header, Sider, Content } = Layout

function handleRefreshSession() {
  void useAuthStore.getState().restoreSession()
}

type SideNavigationProps = {
  collapsed: boolean
  onCollapse: (collapsed: boolean) => void
  onMenuClick: MenuProps['onClick']
  onOpenChange: (keys: string[]) => void
  openKeys: string[]
  selectedKeys: string[]
  sideMenuItems: MenuProps['items']
  t: (key: string) => string
}

function SideNavigation({
  collapsed,
  onCollapse,
  onMenuClick,
  onOpenChange,
  openKeys,
  selectedKeys,
  sideMenuItems,
  t,
}: SideNavigationProps) {
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      trigger={null}
      width={180}
      collapsedWidth={60}
      className="leo-sider"
    >
      <div className="leo-brand">
        <div className="leo-brand-mark">{collapsed ? 'L' : 'LEO'}</div>
        {!collapsed ? (
          <div className="leo-brand-copy">
            <strong>{appTitle}</strong>
            <span>{t('common.brandSubtitle')}</span>
          </div>
        ) : null}
      </div>

      <Menu
        mode="inline"
        selectedKeys={selectedKeys}
        openKeys={collapsed ? [] : openKeys}
        onOpenChange={onOpenChange}
        items={sideMenuItems}
        onClick={onMenuClick}
        className="leo-menu"
      />
    </Sider>
  )
}

type AppContentOutletProps = {
  openPageKey: string
}

function AppContentOutlet({ openPageKey }: AppContentOutletProps) {
  return (
    <Content className="leo-content">
      <div className="leo-content-inner">
        <AppErrorBoundary resetKey={openPageKey}>
          <Outlet key={openPageKey} />
        </AppErrorBoundary>
      </div>
    </Content>
  )
}

type PersonalSettingsHostProps = {
  fontSize: number
  layoutMode: LayoutMode
  onClose: () => void
  onFontSizeChange: (value: number) => void
  onLayoutModeChange: (value: LayoutMode) => void
  onResetDisplay: () => void
  onSaveDisplay: () => void
  onThemeModeChange: (value: ThemeMode) => void
  open: boolean
  themeMode: ThemeMode
}

function PersonalSettingsHost({
  fontSize,
  layoutMode,
  onClose,
  onFontSizeChange,
  onLayoutModeChange,
  onResetDisplay,
  onSaveDisplay,
  onThemeModeChange,
  open,
  themeMode,
}: PersonalSettingsHostProps) {
  return (
    <LazyPersonalSettingsModal
      open={open}
      onClose={onClose}
      onSaveDisplay={onSaveDisplay}
      onResetDisplay={onResetDisplay}
      fontSize={fontSize}
      onFontSizeChange={onFontSizeChange}
      layoutMode={layoutMode}
      onLayoutModeChange={onLayoutModeChange}
      themeMode={themeMode}
      onThemeModeChange={onThemeModeChange}
    />
  )
}

export function AppLayout() {
  useAuthAppSync()

  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const authReady = useAuthStore((state) => state.authReady)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const can = usePermissionStore((state) => state.can)
  const menus = useSystemMenuStore((state) => state.menus)

  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const clock = useAppLayoutClock()

  const routePageContext = resolveRoutePageContext(location.pathname, t)
  const { backendOnline } = useBackendStatus(token)

  const {
    visible: personalSettingsOpen,
    fontSize,
    appliedFontSize,
    setFontSize,
    layoutMode,
    appliedLayoutMode,
    setLayoutMode,
    themeMode,
    setThemeMode,
    open: openPersonalSettings,
    close: closePersonalSettings,
    reset: resetPersonalSettings,
    save: savePersonalSettings,
    load: loadPersonalSettings,
  } = usePersonalSettings()

  const isTopNavigationLayout = appliedLayoutMode === 'top'

  const editorTasks = useStore(editorTaskStore, (state) => state.tasks)
  const activeEditorTaskKey = useStore(
    editorTaskStore,
    (state) => state.activeKey,
  )

  const {
    sideMenuItems,
    siderOpenKeys,
    selectedKeys,
    setSiderOpenKeys,
    topMenuItems,
    resolveMenuPath,
  } = useAppLayoutMenuState({
    activeMenuKey: routePageContext.activeMenuKey,
    can,
    collapsed,
    menus,
  })

  const handleJumpToSearchResult = (result: GlobalSearchResult) => {
    setSearchOpen(false)
    const targetPage = getPageDefinition(result.moduleKey)
    if (!targetPage) {
      message.warning(t('layouts.routePage.businessPageNotFound'))
      return
    }
    const query = new URLSearchParams({
      docNo: result.primaryNo,
      openDetail: '1',
    })
    if (result.trackId) {
      query.set('trackId', result.trackId)
    }
    void navigate({
      to: `/${getPageRoutePath(targetPage)}?${query.toString()}` as '/',
    })
  }

  const {
    keyword: globalSearchKeyword,
    setKeyword: setGlobalSearchKeyword,
    loading: globalSearchLoading,
    resultOptions: globalSearchOptions,
    handleBlur: handleGlobalSearchBlur,
    handleSearch: handleGlobalSearch,
    handleSelect: handleGlobalSearchSelect,
    handleSubmit: handleGlobalSearchSubmit,
  } = useGlobalSearchSupport({
    canAccessModule: (moduleKey: string) => {
      const resourceKey = getPageDefinition(moduleKey)?.resourceKey || moduleKey
      return can(resourceKey, 'read')
    },
    onJump: handleJumpToSearchResult,
  })

  useEffect(() => {
    document.title = routePageContext.title
      ? `${routePageContext.title} | ${appTitle}`
      : appTitle
  }, [routePageContext.title])

  useAuthHeartbeat()

  useAuthRefreshTimer(handleRefreshSession)
  useAppLayoutSessionGuards({
    locationPathname: location.pathname,
    navigate,
    authReady,
    token,
    user,
  })

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetPath = resolveMenuPath(String(key))
    if (targetPath) {
      void navigate({ to: targetPath as '/' })
    }
  }

  const handleSignOut = () => {
    modal.confirm({
      title: t('common.confirmLogout'),
      content: t('common.confirmLogoutContent'),
      okText: t('common.confirmLogout'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        await signOut()
        void navigate({ to: '/login' })
      },
    })
  }

  const handleOpenPersonalSettings = () => {
    loadPersonalSettings()
    openPersonalSettings()
  }

  const handleSavePersonalSettings = () => {
    savePersonalSettings()
    message.success(t('common.displaySettingsSaved'))
  }

  const { currentUserLoginName, currentUserName } = buildAppLayoutUserInfo(
    t,
    user,
  )
  const currentUserKey = String(user?.id || user?.loginName || '').trim()
  const currentUserEditorTasks = editorTasks.filter(
    (task) => task.userKey === currentUserKey,
  )
  const clockDisplay = buildClockDisplay(clock)
  const {
    fixedWidthStyle,
    headerClassName,
    mainStyle,
    rootClassName,
    shellFontStyle,
    topBrandMark,
  } = buildAppLayoutStyles({
    appliedFontSize,
    collapsed,
    isTopNavigationLayout,
  })

  const layoutShell = (
    <Layout className={rootClassName} style={shellFontStyle}>
      <div className="leo-page-loader" />

      {!isTopNavigationLayout ? (
        <SideNavigation
          collapsed={collapsed}
          onCollapse={setCollapsed}
          onMenuClick={handleMenuClick}
          onOpenChange={setSiderOpenKeys}
          openKeys={siderOpenKeys}
          selectedKeys={selectedKeys}
          sideMenuItems={sideMenuItems}
          t={t}
        />
      ) : null}

      <Layout
        className={`leo-main${isTopNavigationLayout ? ' leo-main-top-nav' : ''}${currentUserEditorTasks.length ? ' leo-main-with-editor-tabs' : ' leo-main-without-editor-tabs'}`}
        style={mainStyle}
      >
        <Header className={headerClassName} style={fixedWidthStyle}>
          {isTopNavigationLayout ? (
            <AppLayoutHeader
              kind="top"
              selectedKeys={selectedKeys}
              topMenuItems={topMenuItems}
              onMenuClick={handleMenuClick}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises -- Antd Modal onOk pattern
              onDashboardClick={() => navigate({ to: '/dashboard' as '/' })}
              topBrandMark={topBrandMark}
              shellFontStyle={shellFontStyle}
              clockDisplay={clockDisplay}
              currentUserName={currentUserName}
              currentUserLoginName={currentUserLoginName}
              onOpenPersonalSettings={handleOpenPersonalSettings}
              onSignOut={handleSignOut}
              search={{
                keyword: globalSearchKeyword,
                options: globalSearchOptions,
                open: searchOpen,
                loading: globalSearchLoading,
                onBlur: handleGlobalSearchBlur,
                onKeywordChange: setGlobalSearchKeyword,
                onOpen: () => setSearchOpen(true),
                onOpenChange: setSearchOpen,
                onSearch: handleGlobalSearch,
                onSelect: handleGlobalSearchSelect,
                onSubmit: handleGlobalSearchSubmit,
              }}
            />
          ) : (
            <AppLayoutHeader
              kind="side"
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((value) => !value)}
              title={routePageContext.title}
              backendOnline={backendOnline}
              shellFontStyle={shellFontStyle}
              clockDisplay={clockDisplay}
              currentUserName={currentUserName}
              onOpenPersonalSettings={handleOpenPersonalSettings}
              onSignOut={handleSignOut}
              search={{
                keyword: globalSearchKeyword,
                options: globalSearchOptions,
                open: searchOpen,
                loading: globalSearchLoading,
                onBlur: handleGlobalSearchBlur,
                onKeywordChange: setGlobalSearchKeyword,
                onOpen: () => setSearchOpen(true),
                onOpenChange: setSearchOpen,
                onSearch: handleGlobalSearch,
                onSelect: handleGlobalSearchSelect,
                onSubmit: handleGlobalSearchSubmit,
              }}
            />
          )}
        </Header>

        <EditorWorkspaceTabs
          activeKey={activeEditorTaskKey}
          tasks={currentUserEditorTasks}
          style={{ ...fixedWidthStyle, ...shellFontStyle }}
          onActivate={(key) => {
            const task = editorTaskStore
              .getState()
              .tasks.find((item) => item.key === key)
            if (!task || !editorTaskStore.getState().requestResume(key)) {
              return
            }
            void navigate({ to: task.path as '/' })
          }}
          onClose={(key) => {
            const task = editorTaskStore
              .getState()
              .tasks.find((item) => item.key === key)
            if (task?.status === 'dirty' || task?.status === 'error') {
              modal.confirm({
                title: '关闭编辑任务',
                content: '关闭后未保存的修改将丢失，确定继续吗？',
                okText: '关闭',
                cancelText: t('common.cancel'),
                onOk: () => {
                  editorTaskStore.getState().close(key)
                },
              })
              return
            }
            editorTaskStore.getState().close(key)
          }}
        />

        <AppContentOutlet openPageKey={routePageContext.openPageKey} />
      </Layout>

      <PersonalSettingsHost
        open={personalSettingsOpen}
        onClose={closePersonalSettings}
        onSaveDisplay={handleSavePersonalSettings}
        onResetDisplay={resetPersonalSettings}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        themeMode={themeMode}
        onThemeModeChange={setThemeMode}
      />
    </Layout>
  )

  return <AppAntdProvider>{layoutShell}</AppAntdProvider>
}
