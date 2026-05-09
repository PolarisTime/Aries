import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import type { MenuProps } from 'antd'
import { ConfigProvider, Layout, Menu } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthHeartbeat } from '@/hooks/useAuthHeartbeat'
import { useAuthRefreshTimer } from '@/hooks/useAuthRefreshTimer'
import { useOpenPages } from '@/hooks/useOpenPages'
import { AppLayoutHeader } from '@/layouts/AppLayoutHeader'
import { AppPageTabs } from '@/layouts/AppPageTabs'
import {
  buildAppLayoutStyles,
  buildAppLayoutUserInfo,
  buildClockText,
} from '@/layouts/app-layout-utils'
import type { GlobalSearchResult } from '@/layouts/global-search'
import { PersonalSettingsModal } from '@/layouts/PersonalSettingsModal'
import { resolveRoutePageContext } from '@/layouts/route-page-context'
import { useAppLayoutClock } from '@/layouts/useAppLayoutClock'
import { useAppLayoutMenuState } from '@/layouts/useAppLayoutMenuState'
import { useAppLayoutSessionGuards } from '@/layouts/useAppLayoutSessionGuards'
import { useBackendStatus } from '@/layouts/useBackendStatus'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'
import { usePersonalSettings } from '@/layouts/usePersonalSettings'
import { useAuthStore } from '@/stores/authStore'
import { getPageDefinition } from '@/config/page-registry'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSystemMenuStore } from '@/stores/systemMenuStore'
import { message, modal } from '@/utils/antd-app'
import { appTitle } from '@/utils/env'

const { Header, Sider, Content } = Layout

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const can = usePermissionStore((state) => state.can)
  const menus = useSystemMenuStore((state) => state.menus)

  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const clock = useAppLayoutClock()

  const routePageContext = useMemo(
    () => resolveRoutePageContext(location.pathname),
    [location.pathname],
  )
  const { backendOnline, companyName } = useBackendStatus(token)

  const {
    visible: personalSettingsOpen,
    fontSize,
    appliedFontSize,
    setFontSize,
    layoutMode,
    appliedLayoutMode,
    setLayoutMode,
    open: openPersonalSettings,
    close: closePersonalSettings,
    reset: resetPersonalSettings,
    save: savePersonalSettings,
    load: loadPersonalSettings,
  } = usePersonalSettings()

  const isTopNavigationLayout = appliedLayoutMode === 'top'

  const resolveOpenPage = useCallback((pathname: string) => {
    const context = resolveRoutePageContext(pathname)
    return {
      key: context.openPageKey,
      path: pathname,
      title: context.title,
    }
  }, [])

  const { pages, closePage } = useOpenPages(
    '/dashboard',
    '未命名页面',
    '工作台',
    resolveOpenPage,
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

  const handleJumpToSearchResult = useCallback(
    (result: GlobalSearchResult) => {
      setSearchOpen(false)
      const query = new URLSearchParams({
        docNo: result.primaryNo,
        openDetail: '1',
      })
      if (result.trackId) {
        query.set('trackId', result.trackId)
      }
      navigate({ to: `/${result.moduleKey}?${query.toString()}` as '/' })
    },
    [navigate],
  )

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

  const handleRefreshSession = useCallback(() => {
    void useAuthStore.getState().restoreSession()
  }, [])
  useAuthRefreshTimer(handleRefreshSession)
  useAppLayoutSessionGuards({
    locationPathname: location.pathname,
    navigate,
    token,
    user,
  })

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetPath = resolveMenuPath(String(key))
    if (targetPath) {
      navigate({ to: targetPath as '/' })
    }
  }

  const activeTabKey = routePageContext.openPageKey

  const handleSignOut = async () => {
    modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      okText: '确认退出',
      cancelText: '取消',
      onOk: async () => {
        await signOut()
        navigate({ to: '/login' })
      },
    })
  }

  const handleOpenPersonalSettings = useCallback(() => {
    loadPersonalSettings()
    openPersonalSettings()
  }, [loadPersonalSettings, openPersonalSettings])

  const handleSavePersonalSettings = useCallback(() => {
    savePersonalSettings()
    message.success('显示设置已保存')
  }, [savePersonalSettings])

  const { currentUserLoginName, currentUserName } = useMemo(
    () => buildAppLayoutUserInfo(user),
    [user],
  )
  const clockText = useMemo(() => buildClockText(clock), [clock])
  const {
    antdTheme,
    fixedWidthStyle,
    headerClassName,
    mainStyle,
    rootClassName,
    shellFontStyle,
    topBrandMark,
    topBrandName,
  } = useMemo(
    () =>
      buildAppLayoutStyles({
        appliedFontSize,
        clockText,
        collapsed,
        companyName,
        currentUserLoginName,
        currentUserName,
        isTopNavigationLayout,
      }),
    [
      appliedFontSize,
      clockText,
      collapsed,
      companyName,
      currentUserLoginName,
      currentUserName,
      isTopNavigationLayout,
    ],
  )

  return (
    <ConfigProvider theme={antdTheme}>
      <Layout className={rootClassName} style={shellFontStyle}>
        <div className="leo-page-loader" />

        {!isTopNavigationLayout ? (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
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
                  <span>钢贸业务中台</span>
                </div>
              ) : null}
            </div>

            <Menu
              mode="inline"
              selectedKeys={selectedKeys}
              openKeys={collapsed ? [] : siderOpenKeys}
              onOpenChange={setSiderOpenKeys}
              items={sideMenuItems}
              onClick={handleMenuClick}
              className="leo-menu"
            />
          </Sider>
        ) : null}

        <Layout
          className={`leo-main${isTopNavigationLayout ? ' leo-main-top-nav' : ''}`}
          style={mainStyle}
        >
          <Header className={headerClassName} style={fixedWidthStyle}>
            {isTopNavigationLayout ? (
              <AppLayoutHeader
                kind="top"
                selectedKeys={selectedKeys}
                topMenuItems={topMenuItems}
                onMenuClick={handleMenuClick}
                onDashboardClick={() => navigate({ to: '/dashboard' as '/' })}
                topBrandMark={topBrandMark}
                topBrandName={topBrandName}
                shellFontStyle={shellFontStyle}
                clockText={clockText}
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
                companyName={companyName}
                backendOnline={backendOnline}
                shellFontStyle={shellFontStyle}
                clockText={clockText}
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

          <AppPageTabs
            activeKey={activeTabKey}
            pages={pages}
            isTopNavigationLayout={isTopNavigationLayout}
            shellFontStyle={{ ...fixedWidthStyle, ...shellFontStyle }}
            closePage={closePage}
            onNavigateToPath={(path) => navigate({ to: path as '/' })}
          />

          <Content className="leo-content">
            <div className="leo-content-inner">
              <Outlet />
            </div>
          </Content>
        </Layout>

        <PersonalSettingsModal
          open={personalSettingsOpen}
          onClose={closePersonalSettings}
          onSaveDisplay={handleSavePersonalSettings}
          onResetDisplay={resetPersonalSettings}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
          layoutMode={layoutMode}
          onLayoutModeChange={setLayoutMode}
        />
      </Layout>
    </ConfigProvider>
  )
}
