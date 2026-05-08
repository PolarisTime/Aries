import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from '@tanstack/react-router'
import {
  Alert,
  AutoComplete,
  Button,
  Descriptions,
  Divider,
  Dropdown,
  Flex,
  Form,
  Image,
  Input,
  Layout,
  Menu,
  Modal,
  Radio,
  Select,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { usePermissionStore } from '@/stores/permissionStore'
import { useSystemMenuStore } from '@/stores/systemMenuStore'
import { useOpenPages } from '@/hooks/useOpenPages'
import { useAuthHeartbeat } from '@/hooks/useAuthHeartbeat'
import { useAuthRefreshTimer } from '@/hooks/useAuthRefreshTimer'
import { apiBaseUrl, appTitle } from '@/utils/env'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { resolveAppIcon, isKnownAppIconKey } from '@/config/app-icons'
import {
  buildMenuEntriesByGroup,
  menuGroupDefinitions,
  menuGroupOrder,
} from '@/config/navigation-registry'
import { appPageDefinitions, getPageDefinition } from '@/config/page-registry'
import {
  buildVisibleLayoutMenuEntries,
  type LayoutMenuEntry,
} from '@/layouts/layout-menu'
import { resolveRoutePageContext } from '@/layouts/route-page-context'
import {
  usePersonalSettings,
  type LayoutMode,
} from '@/layouts/usePersonalSettings'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'
import type { GlobalSearchResult } from '@/layouts/global-search'
import { setStoredUser } from '@/utils/storage'
import { toDataImageUrl } from '@/utils/data-url'
import { isApiKeyToken } from '@/utils/auth-token'
import { message, modal } from '@/utils/antd-app'
import type { ApiResponse } from '@/types/api'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'

const { Header, Sider, Content } = Layout
const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)
const fontSizeOptions = [11, 12, 13, 14, 16, 18]
const layoutModeOptions: Array<{
  value: LayoutMode
  label: string
  description: string
}> = [
  {
    value: 'sider',
    label: '左侧导航',
    description: '保留侧边菜单，更适合高频表格录入和多模块切换。',
  },
  {
    value: 'top',
    label: '顶部导航',
    description: '采用顶部菜单栏，整体风格与当前 Vue 版保持一致。',
  },
]

function canAccessEntry(
  entry: (typeof appPageDefinitions)[number],
  canAccessMenuKey: (menuCode: string) => boolean,
) {
  if (Array.isArray(entry.accessMenuKeys) && entry.accessMenuKeys.length > 0) {
    return entry.accessMenuKeys.some((menuKey) => canAccessMenuKey(menuKey))
  }
  return canAccessMenuKey(entry.key)
}

function buildMenuPathMap(entries: LayoutMenuEntry[]) {
  const pathMap: Record<string, string> = {}

  const visit = (entry: LayoutMenuEntry) => {
    if (entry.path) {
      pathMap[entry.path] = entry.path
    }
    entry.children.forEach(visit)
  }

  entries.forEach(visit)
  return pathMap
}

function findMenuParentKeys(
  entries: LayoutMenuEntry[],
  targetKey: string,
  parents: string[] = [],
): string[] | null {
  for (const entry of entries) {
    const currentKeys = [entry.menuCode, entry.path].filter(
      (value): value is string => Boolean(value),
    )
    if (currentKeys.includes(targetKey)) {
      return parents
    }
    if (entry.children.length > 0) {
      const matched = findMenuParentKeys(entry.children, targetKey, [
        ...parents,
        entry.menuCode,
      ])
      if (matched) {
        return matched
      }
    }
  }
  return null
}

function buildPageTabLabel(
  page: { key: string; title: string; closable: boolean },
  onClose: (key: string) => void,
) {
  return (
    <span
      onDoubleClick={() => {
        if (page.closable) {
          onClose(page.key)
        }
      }}
    >
      {page.title}
    </span>
  )
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)
  const canAccessMenuKey = usePermissionStore((state) => state.canAccessMenuKey)
  const menus = useSystemMenuStore((state) => state.menus)
  const loadMenus = useSystemMenuStore((state) => state.loadMenus)
  const clearMenus = useSystemMenuStore((state) => state.clearMenus)

  const [collapsed, setCollapsed] = useState(false)
  const [clock, setClock] = useState(dayjs())
  const [companyName, setCompanyName] = useState('')
  const [backendOnline, setBackendOnline] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [siderOpenKeys, setSiderOpenKeys] = useState<string[]>([])

  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const healthRetriesRef = useRef(0)

  const routePageContext = useMemo(
    () => resolveRoutePageContext(location.pathname),
    [location.pathname],
  )

  const {
    visible: personalSettingsOpen,
    fontSize,
    setFontSize,
    layoutMode,
    setLayoutMode,
    open: openPersonalSettings,
    close: closePersonalSettings,
    reset: resetPersonalSettings,
    save: savePersonalSettings,
    load: loadPersonalSettings,
  } = usePersonalSettings()

  const isTopNavigationLayout = layoutMode === 'top'
  const siderWidth = collapsed ? 60 : 180

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

  const visibleMenuEntries = useMemo(() => {
    return buildVisibleLayoutMenuEntries({
      appPageDefinitions,
      defaultIcon: 'AppstoreOutlined',
      getMenuEntriesByGroup: (groupKey) =>
        menuEntriesByGroup.get(groupKey) || [],
      getPageDefinition,
      isKnownIconKey: isKnownAppIconKey,
      menuGroupDefinitions,
      menuGroupOrder,
      systemMenuTree: menus,
      userCanAccessEntry: (entry) => canAccessEntry(entry, canAccessMenuKey),
      userCanAccessMenuCode: canAccessMenuKey,
    })
  }, [canAccessMenuKey, menus])

  const menuPathByKey = useMemo(
    () => buildMenuPathMap(visibleMenuEntries),
    [visibleMenuEntries],
  )

  const selectedKeys = useMemo(
    () => [routePageContext.activeMenuKey],
    [routePageContext.activeMenuKey],
  )

  const resolvedSiderOpenKeys = useMemo(
    () =>
      findMenuParentKeys(visibleMenuEntries, routePageContext.activeMenuKey) ||
      [],
    [routePageContext.activeMenuKey, visibleMenuEntries],
  )

  useEffect(() => {
    if (collapsed) {
      setSiderOpenKeys([])
      return
    }
    setSiderOpenKeys(resolvedSiderOpenKeys)
  }, [collapsed, resolvedSiderOpenKeys])

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
    canAccessModule: canAccessMenuKey,
    onJump: handleJumpToSearchResult,
  })

  useEffect(() => {
    const timer = setInterval(() => setClock(dayjs()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    document.title = routePageContext.title
      ? `${routePageContext.title} | ${appTitle}`
      : appTitle
  }, [routePageContext.title])

  useEffect(() => {
    if (!user) {
      clearMenus()
      return
    }

    if (isApiKeyToken(token)) {
      clearMenus()
      return
    }

    void loadMenus().catch(() => {
      // local registry fallback is handled by buildVisibleLayoutMenuEntries
    })
  }, [clearMenus, loadMenus, token, user])

  useEffect(() => {
    if (!token) {
      return
    }
    http
      .get<{ data: { companyName?: string } }>(
        ENDPOINTS.COMPANY_SETTINGS_CURRENT,
      )
      .then((res) => setCompanyName(res.data?.companyName || ''))
      .catch(() => {})
  }, [token])

  const checkBackendHealth = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const response = await fetch(`${apiBaseUrl}${ENDPOINTS.HEALTH}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)

      if (response.ok) {
        const body = (await response.json()) as { status?: string }
        setBackendOnline(body.status === 'UP')
        healthRetriesRef.current = 0
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
      healthRetriesRef.current += 1
      const maxRetries = 5
      if (healthRetriesRef.current <= maxRetries) {
        const delay = Math.min(
          1000 * Math.pow(2, healthRetriesRef.current),
          30000,
        )
        window.setTimeout(checkBackendHealth, delay)
      }
    }
  }, [])

  useEffect(() => {
    if (!token) {
      return
    }
    void checkBackendHealth()
    healthTimerRef.current = setInterval(() => {
      if (healthRetriesRef.current === 0) {
        void checkBackendHealth()
      }
    }, 30000)
    return () => {
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current)
      }
    }
  }, [checkBackendHealth, token])

  useAuthHeartbeat()

  const handleRefreshSession = useCallback(() => {
    void useAuthStore.getState().restoreSession()
  }, [])
  useAuthRefreshTimer(handleRefreshSession)

  useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate({ to: '/login' })
    }
  }, [location.pathname, navigate, token])

  useEffect(() => {
    if (!user || user.totpEnabled === true || user.forceTotpSetup !== true) {
      return
    }

    const redirectTarget = `${location.pathname}${window.location.search || ''}`
    navigate({
      to: `/setup-2fa?redirect=${encodeURIComponent(redirectTarget)}` as '/',
    })
  }, [location.pathname, navigate, user])

  const sideMenuItems = useMemo<NonNullable<MenuProps['items']>>(
    () =>
      visibleMenuEntries.map((entry) => {
        const Icon = isKnownAppIconKey(entry.icon)
          ? resolveAppIcon(entry.icon)
          : null

        if (entry.children.length > 0) {
          return {
            key: entry.menuCode,
            icon: Icon ? <Icon /> : undefined,
            label: entry.title,
            children: entry.children.map((child) => {
              const ChildIcon = isKnownAppIconKey(child.icon)
                ? resolveAppIcon(child.icon)
                : null
              return {
                key: child.path || child.menuCode,
                icon: ChildIcon ? <ChildIcon /> : undefined,
                label: child.title,
              }
            }),
          }
        }

        return {
          key: entry.path || entry.menuCode,
          icon: Icon ? <Icon /> : undefined,
          label: entry.title,
        }
      }),
    [visibleMenuEntries],
  )

  const topMenuItems = useMemo<NonNullable<MenuProps['items']>>(
    () =>
      visibleMenuEntries.map((entry) => ({
        key: entry.path || entry.menuCode,
        label: entry.title,
        children: entry.children.length
          ? entry.children.map((child) => ({
              key: child.path || child.menuCode,
              label: child.title,
            }))
          : undefined,
      })),
    [visibleMenuEntries],
  )

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetPath = menuPathByKey[String(key)]
    if (targetPath) {
      navigate({ to: targetPath as '/' })
    }
  }

  const activeTabKey = routePageContext.openPageKey
  const tabItems = useMemo(
    () =>
      pages.map((page) => ({
        key: page.key,
        label: buildPageTabLabel(page, (key) =>
          closePage(key, (path: string) => navigate({ to: path as '/' })),
        ),
        closable: page.closable,
      })),
    [closePage, navigate, pages],
  )

  const handleTabChange = (key: string) => {
    const page = pages.find((item) => item.key === key)
    if (page) {
      navigate({ to: page.path as '/' })
    }
  }

  const handleTabEdit = (
    event: ReactMouseEvent | ReactKeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'remove' && typeof event === 'string') {
      closePage(event, (path: string) => navigate({ to: path as '/' }))
    }
  }

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

  const rootClassName = [
    'app-shell',
    'leo-shell',
    isTopNavigationLayout ? 'app-shell-top-nav' : 'app-shell-side-nav',
  ].join(' ')

  const headerClassName = [
    'leo-header',
    'app-fixed-header',
    isTopNavigationLayout
      ? 'app-top-header'
      : collapsed
        ? 'app-side-closed'
        : 'app-side-opened',
  ].join(' ')

  const mainStyle = isTopNavigationLayout
    ? undefined
    : { paddingLeft: `${siderWidth}px` }
  const fixedWidthStyle = isTopNavigationLayout
    ? { width: '100%' }
    : { width: `calc(100% - ${siderWidth}px)` }

  return (
    <Layout className={rootClassName}>
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
            <div className="app-header-bar app-header-bar-top">
              <div className="app-top-nav-left">
                <Menu
                  selectedKeys={selectedKeys}
                  items={topMenuItems}
                  mode="horizontal"
                  className="leo-top-menu"
                  onClick={handleMenuClick}
                />
              </div>

              <div className="app-top-nav-right">
                <div className="header-global-search header-global-search-top">
                  <div className="header-global-search-group">
                    <AutoComplete
                      className="header-global-search-box"
                      value={globalSearchKeyword}
                      options={globalSearchOptions}
                      open={searchOpen && globalSearchOptions.length > 0}
                      onSearch={(value) => {
                        setSearchOpen(true)
                        void handleGlobalSearch(value)
                      }}
                      onChange={(value) => setGlobalSearchKeyword(String(value))}
                      onSelect={(value) =>
                        handleGlobalSearchSelect(String(value))
                      }
                      onOpenChange={setSearchOpen}
                    >
                      <Input
                        aria-label="搜索单号、合同号、对账单号"
                        className="header-global-search-input"
                        placeholder="搜索单号、合同号、对账单号"
                        onFocus={() => setSearchOpen(true)}
                        onBlur={handleGlobalSearchBlur}
                        onPressEnter={(event) =>
                          void handleGlobalSearchSubmit(
                            event.currentTarget.value,
                          )
                        }
                      />
                    </AutoComplete>
                    <Button
                      type="primary"
                      className="header-global-search-button"
                      loading={globalSearchLoading}
                      icon={<SearchOutlined />}
                      onClick={() =>
                        void handleGlobalSearchSubmit(globalSearchKeyword)
                      }
                    />
                  </div>
                </div>

                <div className="user-wrapper user-wrapper-top">
                  <span className="action">{clock.format('HH:mm:ss')}</span>
                  <span className="action user-name">
                    {user?.userName || user?.loginName || '未登录'}
                  </span>
                  <span className="action">
                    <Button
                      type="text"
                      className="settings-link app-user-settings-trigger"
                      icon={<SettingOutlined />}
                      onClick={handleOpenPersonalSettings}
                    >
                      个人设置
                    </Button>
                  </span>
                  <span className="action">
                    <Button
                      type="text"
                      className="logout-link"
                      onClick={handleSignOut}
                    >
                      退出登录
                    </Button>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="app-header-bar">
              <span className="app-trigger" onClick={() => setCollapsed((value) => !value)}>
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </span>

              <div className="header-page-meta">
                <div className="header-page-title">{routePageContext.title}</div>
                <div className="header-page-desc">
                  业务中心 / {routePageContext.title}
                </div>
              </div>

              <div className="header-global-search">
                <div className="header-global-search-group">
                  <AutoComplete
                    className="header-global-search-box"
                    value={globalSearchKeyword}
                    options={globalSearchOptions}
                    open={searchOpen && globalSearchOptions.length > 0}
                    onSearch={(value) => {
                      setSearchOpen(true)
                      void handleGlobalSearch(value)
                    }}
                    onChange={(value) => setGlobalSearchKeyword(String(value))}
                    onSelect={(value) =>
                      handleGlobalSearchSelect(String(value))
                    }
                    onOpenChange={setSearchOpen}
                  >
                    <Input
                      aria-label="搜索单号、合同号、对账单号"
                      className="header-global-search-input"
                      placeholder="搜索单号、合同号、对账单号"
                      onFocus={() => setSearchOpen(true)}
                      onBlur={handleGlobalSearchBlur}
                      onPressEnter={(event) =>
                        void handleGlobalSearchSubmit(
                          event.currentTarget.value,
                        )
                      }
                    />
                  </AutoComplete>
                  <Button
                    type="primary"
                    className="header-global-search-button"
                    loading={globalSearchLoading}
                    icon={<SearchOutlined />}
                    onClick={() =>
                      void handleGlobalSearchSubmit(globalSearchKeyword)
                    }
                  />
                </div>
              </div>

              <div className="user-wrapper">
                <span className="action action-tag">
                  {companyName ? <Tag color="blue">{companyName}</Tag> : null}
                  <Tag color={backendOnline ? 'green' : 'red'}>
                    {backendOnline ? 'API 正常' : 'API 离线'}
                  </Tag>
                  <Tag color="default">{clock.format('HH:mm:ss')}</Tag>
                </span>
                <span className="action user-name">
                  {user?.userName || user?.loginName || '未登录'}
                </span>
                <span className="action">
                  <Dropdown
                    menu={{
                      items: [
                        {
                          key: 'settings',
                          icon: <SettingOutlined />,
                          label: '个人设置',
                          onClick: handleOpenPersonalSettings,
                        },
                        {
                          key: 'logout',
                          icon: <LogoutOutlined />,
                          label: '退出登录',
                          danger: true,
                          onClick: handleSignOut,
                        },
                      ],
                    }}
                    trigger={['click']}
                  >
                    <Button
                      type="text"
                      className="app-user-settings-trigger"
                      icon={<SettingOutlined />}
                    />
                  </Dropdown>
                </span>
              </div>
            </div>
          )}
        </Header>

        <div
          className={`tab-layout-tabs${isTopNavigationLayout ? ' tab-layout-tabs-top-nav' : ''}`}
          style={fixedWidthStyle}
        >
          <Tabs
            type="editable-card"
            hideAdd
            activeKey={activeTabKey}
            items={tabItems}
            onChange={handleTabChange}
            onEdit={handleTabEdit}
            size="small"
          />
        </div>

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
  )
}

function PersonalSettingsModal({
  open,
  onClose,
  onSaveDisplay,
  onResetDisplay,
  fontSize,
  onFontSizeChange,
  layoutMode,
  onLayoutModeChange,
}: {
  open: boolean
  onClose: () => void
  onSaveDisplay: () => void
  onResetDisplay: () => void
  fontSize: number
  onFontSizeChange: (value: number) => void
  layoutMode: LayoutMode
  onLayoutModeChange: (value: LayoutMode) => void
}) {
  const [tab, setTab] = useState('display')
  const [pwForm] = Form.useForm()
  const [pwSaving, setPwSaving] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpSetup, setTotpSetup] = useState<{
    qrCodeBase64: string
    secret: string
  } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpEnabling, setTotpEnabling] = useState(false)
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    if (!open) {
      return
    }
    setTab('display')
    setTotpSetup(null)
    setTotpCode('')
  }, [open])

  useEffect(() => {
    if (!open || tab !== 'security') {
      return
    }
    pwForm.resetFields()
  }, [open, pwForm, tab])

  const updateCurrentUserSecurity = useCallback((enabled: boolean) => {
    useAuthStore.setState((state) => {
      if (!state.user) {
        return state
      }
      const nextUser = {
        ...state.user,
        totpEnabled: enabled,
        forceTotpSetup: false,
      }
      setStoredUser(nextUser)
      return { ...state, user: nextUser }
    })
  }, [])

  const handleChangePassword = async (values: {
    oldPassword: string
    newPassword: string
  }) => {
    setPwSaving(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_PASSWORD, values)
      message.success('密码修改成功')
      pwForm.resetFields()
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改失败')
    } finally {
      setPwSaving(false)
    }
  }

  const handleSetupTotp = async () => {
    setTotpLoading(true)
    try {
      const response = await http.post<
        ApiResponse<{ qrCodeBase64: string; secret: string }>
      >(ENDPOINTS.ACCOUNT_2FA_SETUP, {})
      setTotpSetup(response.data)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '获取失败')
    } finally {
      setTotpLoading(false)
    }
  }

  const handleEnableTotp = async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error('请输入 6 位验证码')
      return
    }

    setTotpEnabling(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, {
        totpCode: totpCode.trim(),
      })
      updateCurrentUserSecurity(true)
      message.success('二次验证已启用')
      setTotpSetup(null)
      setTotpCode('')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '启用失败')
    } finally {
      setTotpEnabling(false)
    }
  }

  return (
    <Modal
      title="个人设置"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      mask={{ closable: false }}
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'display', label: '显示偏好' },
          { key: 'security', label: '账户安全' },
        ]}
      />

      {tab === 'display' ? (
        <div className="personal-setting-panel">
          <div className="personal-setting-row">
            <span className="personal-setting-label">系统字体</span>
            <span className="personal-setting-value">苹方</span>
          </div>
          <div className="personal-setting-row">
            <span className="personal-setting-label">字体大小</span>
            <Select
              value={fontSize}
              style={{ width: 160 }}
              onChange={onFontSizeChange}
              options={fontSizeOptions.map((value) => ({
                value,
                label: `${value}px`,
                title: `${value}px`,
              }))}
            />
          </div>
          <div className="personal-setting-row personal-setting-layout-row">
            <span className="personal-setting-label">导航布局</span>
            <Radio.Group
              className="personal-layout-mode-group"
              optionType="button"
              buttonStyle="solid"
              value={layoutMode}
              onChange={(event) =>
                onLayoutModeChange(event.target.value as LayoutMode)
              }
            >
              {layoutModeOptions.map((item) => (
                <Radio.Button key={item.value} value={item.value}>
                  {item.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
          <div className="personal-layout-mode-desc">
            {
              layoutModeOptions.find((item) => item.value === layoutMode)
                ?.description
            }
          </div>
          <div className="personal-setting-actions">
            <Button onClick={onResetDisplay}>恢复默认</Button>
            <Button type="primary" onClick={onSaveDisplay}>
              保存显示设置
            </Button>
          </div>
        </div>
      ) : (
        <Flex vertical gap={16}>
          <Alert
            showIcon
            type="info"
            message={`当前账号：${user?.userName || user?.loginName || '--'}（${user?.loginName || '--'}）`}
            description={
              user?.totpEnabled
                ? '已启用 2FA，高风险操作会要求二次验证。'
                : '未启用 2FA，建议立即绑定认证器。'
            }
          />

          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="登录账号">
              <Typography.Text strong>
                {user?.loginName || '--'}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="当前状态">
              {user?.totpEnabled ? (
                <Tag color="green">已启用</Tag>
              ) : (
                <Tag>未启用</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="两步验证">
              {user?.totpEnabled ? (
                <Typography.Text type="secondary">
                  当前账号已启用两步验证。
                </Typography.Text>
              ) : totpSetup ? (
                <Flex vertical gap={12}>
                  <Image
                    src={toDataImageUrl(totpSetup.qrCodeBase64)}
                    alt="TOTP QR"
                    width={128}
                    height={128}
                    preview={false}
                    className="two-factor-qr-image"
                  />
                  <Typography.Text code>{totpSetup.secret}</Typography.Text>
                  <Flex align="center" gap={8} wrap="wrap">
                    <Input
                      size="small"
                      placeholder="输入 6 位验证码"
                      maxLength={6}
                      value={totpCode}
                      onChange={(event) => setTotpCode(event.target.value)}
                      style={{ width: 132 }}
                    />
                    <Button
                      size="small"
                      type="primary"
                      loading={totpEnabling}
                      onClick={handleEnableTotp}
                    >
                      验证启用
                    </Button>
                  </Flex>
                </Flex>
              ) : (
                <Button
                  size="small"
                  loading={totpLoading}
                  onClick={handleSetupTotp}
                >
                  生成绑定二维码
                </Button>
              )}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Form form={pwForm} onFinish={handleChangePassword} layout="vertical">
            <Form.Item
              name="oldPassword"
              label="当前密码"
              rules={[{ required: true, message: '请输入当前密码' }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="新密码"
              rules={[{ required: true, min: 6, message: '至少 6 位' }]}
            >
              <Input.Password />
            </Form.Item>
            <Flex justify="space-between" align="center" gap={12} wrap="wrap">
              <Typography.Text type="secondary">
                修改密码后，下次登录将使用新密码。
              </Typography.Text>
              <Button
                type="primary"
                htmlType="submit"
                loading={pwSaving}
              >
                更新密码
              </Button>
            </Flex>
          </Form>
        </Flex>
      )}
    </Modal>
  )
}
