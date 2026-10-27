import { useLocation, useNavigate } from '@tanstack/react-router'
import { Layout, Menu } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DocumentFlowModal } from '@/components/DocumentFlowModal'
import { getPageDefinition, getPageRoutePath } from '@/config/page-registry'
import { useAuthAppSync } from '@/hooks/useAuthAppSync'
import { AppLayoutHeaderArea } from '@/layouts/AppLayoutHeaderArea'
import {
  buildAppLayoutStyles,
  buildAppLayoutUserInfo,
  buildClockDisplay,
} from '@/layouts/app-layout-utils'
import { EditorSessionGuard } from '@/layouts/editor-session/EditorSessionGuard'
import { LazyPersonalSettingsModal } from '@/layouts/LazyPersonalSettingsModal'
import { preloadMenuTarget } from '@/layouts/layout-menu-items'
import { resolveRoutePageContext } from '@/layouts/route-page-context'
import { AppTabContainer } from '@/layouts/tabs/AppTabContainer'
import { useLayoutTabsHydration } from '@/layouts/tabs/use-layout-tabs-hydration'
import { useTabOpen } from '@/layouts/tabs/use-tab-open'
import { useAppLayoutClock } from '@/layouts/useAppLayoutClock'
import { useAppLayoutMenuState } from '@/layouts/useAppLayoutMenuState'
import { useAppLayoutSessionGuards } from '@/layouts/useAppLayoutSessionGuards'
import { useBackendStatus } from '@/layouts/useBackendStatus'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'
import {
  type LayoutMode,
  usePersonalSettings,
} from '@/layouts/usePersonalSettings'
import type { DocumentFlowNode } from '@/shared/schemas/document-flow'
import { useAuthStore } from '@/stores/authStore'
import type { GlobalSearchResult } from '@/types/global-search'
import { message, modal } from '@/utils/antd-app'
import { appTitle } from '@/utils/env'
import type { ThemeMode } from '@/utils/storage'

const { Sider } = Layout

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
      onMouseOverCapture={preloadMenuTarget}
      onFocusCapture={preloadMenuTarget}
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

type PersonalSettingsHostProps = {
  fontSize: number
  layoutMode: LayoutMode
  onClose: () => void
  onFontSizeChange: (value: number) => void
  onLayoutModeChange: (value: LayoutMode) => void
  onResetDisplay: () => void
  onSaveDisplay: () => void
  onThemeModeChange: (value: ThemeMode) => void
  onShowBreadcrumbChange: (value: boolean) => void
  open: boolean
  showBreadcrumb: boolean
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
  onShowBreadcrumbChange,
  open,
  showBreadcrumb,
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
      showBreadcrumb={showBreadcrumb}
      onShowBreadcrumbChange={onShowBreadcrumbChange}
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

  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [flowDocumentNo, setFlowDocumentNo] = useState('')
  const [flowOpen, setFlowOpen] = useState(false)
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
    showBreadcrumb,
    setShowBreadcrumb,
    open: openPersonalSettings,
    close: closePersonalSettings,
    reset: resetPersonalSettings,
    save: savePersonalSettings,
    load: loadPersonalSettings,
  } = usePersonalSettings()

  const isTopNavigationLayout = appliedLayoutMode === 'top'

  const openTab = useTabOpen()

  // 登录用户就绪后恢复其持久化的标签页清单。
  // 必须在**布局阶段**完成：AppTabContainer 是子节点，它的定位 effect 会先于父组件的被动
  // effect 运行，恢复若放在 useLayoutEffect 之外就会造成"子先建标签、父后覆盖"的竞态。
  const userId = user?.id ?? ''
  useLayoutTabsHydration({
    authReady,
    userId,
    location: { pathname: location.pathname, searchStr: location.searchStr },
  })

  const {
    sideMenuItems,
    siderOpenKeys,
    selectedKeys,
    setSiderOpenKeys,
    topMenuItems,
    resolveMenuPath,
  } = useAppLayoutMenuState({
    activeMenuKey: routePageContext.activeMenuKey,
    collapsed,
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
    // 外部意图：强制更新既有 Tab 的查询串，触发子路由内自动打开详情
    openTab({
      pathname: `/${getPageRoutePath(targetPage)}`,
      search: query.toString(),
      forceSearch: true,
    })
  }

  const {
    keyword: globalSearchKeyword,
    setKeyword: setGlobalSearchKeyword,
    loading: globalSearchLoading,
    results: globalSearchResults,
    resultOptions: globalSearchOptions,
    handleBlur: handleGlobalSearchBlur,
    handleSearch: handleGlobalSearch,
    handleSelect: handleGlobalSearchSelect,
    handleSubmit: handleGlobalSearchSubmit,
  } = useGlobalSearchSupport({
    onJump: handleJumpToSearchResult,
  })

  /** 在搜索结果项上打开该单号的单据流向弹窗（不跳转详情）。 */
  const handleOpenSearchResultFlow = (value: string) => {
    const target = globalSearchResults.find((item) => item.value === value)
    if (!target) return
    setSearchOpen(false)
    setFlowDocumentNo(target.primaryNo)
    setFlowOpen(true)
  }

  /** 点击流向图节点：跳转到对应模块并自动打开单据详情。 */
  const handleOpenFlowNode = (node: DocumentFlowNode) => {
    const targetPage = getPageDefinition(node.type)
    if (!targetPage) {
      message.warning(t('layouts.routePage.businessPageNotFound'))
      return
    }
    const query = new URLSearchParams({ docNo: node.no ?? '', openDetail: '1' })
    if (node.id) {
      query.set('trackId', node.id)
    }
    openTab({
      pathname: `/${getPageRoutePath(targetPage)}`,
      search: query.toString(),
      forceSearch: true,
    })
    setFlowOpen(false)
  }

  useEffect(() => {
    document.title = routePageContext.title
      ? `${routePageContext.title} | ${appTitle}`
      : appTitle
  }, [routePageContext.title])

  useAppLayoutSessionGuards({
    locationPathname: location.pathname,
    navigate,
    authReady,
    token,
  })

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetPath = resolveMenuPath(String(key))
    if (targetPath) {
      openTab({ pathname: targetPath })
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

  // 顶栏搜索框的受控属性: 顶部/侧边两种布局共用同一份对象(改造前两侧各写一遍)。
  const headerSearch = {
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
    onOpenFlow: handleOpenSearchResultFlow,
  }

  const layoutShell = (
    <Layout className={rootClassName} style={shellFontStyle}>
      <div className="leo-page-loader" />
      {/*
       * Skip link（WCAG 2.4.1 Bypass Blocks）：此前从页眉到正文要按 7 次 Tab
       * （品牌按钮 → 顶栏菜单 → 刷新 → 搜索框 → 搜索按钮 → 用户菜单 → 页签）。
       * 这是全站第一个可聚焦元素，平时视觉隐藏、聚焦时显形。
       */}
      <a className="skip-to-content-link" href="#main-content">
        {t('common.skipToContent')}
      </a>

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
        className={`leo-main${isTopNavigationLayout ? ' leo-main-top-nav' : ''}`}
        style={mainStyle}
      >
        <AppLayoutHeaderArea
          backendOnline={backendOnline}
          clockDisplay={clockDisplay}
          collapsed={collapsed}
          currentUserLoginName={currentUserLoginName}
          currentUserName={currentUserName}
          fixedWidthStyle={fixedWidthStyle}
          headerClassName={headerClassName}
          isTopNavigationLayout={isTopNavigationLayout}
          onDashboardClick={() => openTab({ pathname: '/dashboard' })}
          onMenuClick={handleMenuClick}
          onOpenPersonalSettings={handleOpenPersonalSettings}
          onSignOut={handleSignOut}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
          search={headerSearch}
          selectedKeys={selectedKeys}
          shellFontStyle={shellFontStyle}
          topBrandMark={topBrandMark}
          topMenuItems={topMenuItems}
        />

        <AppTabContainer />
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
        showBreadcrumb={showBreadcrumb}
        onShowBreadcrumbChange={setShowBreadcrumb}
      />

      <DocumentFlowModal
        open={flowOpen}
        documentNo={flowDocumentNo}
        onClose={() => setFlowOpen(false)}
        onOpenNode={handleOpenFlowNode}
      />
    </Layout>
  )

  // antd App/ConfigProvider 已由 main.tsx 的根级 AppAntdProvider 提供。
  return <EditorSessionGuard>{layoutShell}</EditorSessionGuard>
}
