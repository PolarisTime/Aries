import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocation, useNavigate, Outlet } from '@tanstack/react-router'
import {
  Layout,
  Button,
  Menu,
  Tabs,
  Dropdown,
  Modal,
  Select,
  AutoComplete,
  Tag,
  Form,
  Input,
  Divider,
  message,
} from 'antd'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SearchOutlined,
  SettingOutlined,
  LogoutOutlined,
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
import {
  appPageDefinitions,
  getPageDefinition,
} from '@/config/page-registry'
import { buildVisibleLayoutMenuEntries, type LayoutMenuEntry } from '@/layouts/layout-menu'
import { resolveRoutePageContext } from '@/layouts/route-page-context'
import { usePersonalSettings } from '@/layouts/usePersonalSettings'
import { useGlobalSearchSupport } from '@/layouts/useGlobalSearchSupport'
import type { GlobalSearchResult } from '@/layouts/global-search'
import { setStoredUser } from '@/utils/storage'
import { toDataImageUrl } from '@/utils/data-url'
import type { ApiResponse } from '@/types/api'
import type { MenuProps } from 'antd'
import dayjs from 'dayjs'

const { Header, Sider, Content } = Layout
const menuEntriesByGroup = buildMenuEntriesByGroup(appPageDefinitions)

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

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const signOut = useAuthStore((s) => s.signOut)
  const canAccessMenuKey = usePermissionStore((s) => s.canAccessMenuKey)
  const menus = useSystemMenuStore((s) => s.menus)
  const loadMenus = useSystemMenuStore((s) => s.loadMenus)
  const clearMenus = useSystemMenuStore((s) => s.clearMenus)

  const [collapsed, setCollapsed] = useState(false)
  const [clock, setClock] = useState(dayjs())
  const [companyName, setCompanyName] = useState('')
  const [backendOnline, setBackendOnline] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

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
    open: openPersonalSettings,
    close: closePersonalSettings,
    reset: resetPersonalSettings,
    save: savePersonalSettings,
  } = usePersonalSettings()

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
    resolveOpenPage,
  )

  const visibleMenuEntries = useMemo(() => {
    return buildVisibleLayoutMenuEntries({
      appPageDefinitions,
      defaultIcon: 'AppstoreOutlined',
      getMenuEntriesByGroup: (groupKey) => menuEntriesByGroup.get(groupKey) || [],
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

  const handleJumpToSearchResult = useCallback((result: GlobalSearchResult) => {
    setSearchOpen(false)
    const query = new URLSearchParams({
      docNo: result.primaryNo,
      openDetail: '1',
    })
    if (result.trackId) {
      query.set('trackId', result.trackId)
    }
    navigate({ to: `/${result.moduleKey}?${query.toString()}` as '/' })
  }, [navigate])

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

    void loadMenus().catch(() => {
      // local registry fallback is handled by buildVisibleLayoutMenuEntries
    })
  }, [clearMenus, loadMenus, user])

  useEffect(() => {
    if (!token) return
    http.get<{ data: { companyName?: string } }>(ENDPOINTS.COMPANY_SETTINGS_CURRENT)
      .then((res) => setCompanyName(res.data?.companyName || ''))
      .catch(() => {})
  }, [token])

  const checkBackendHealth = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.HEALTH}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)
      if (res.ok) {
        const body = await res.json() as { status?: string }
        setBackendOnline(body.status === 'UP')
        healthRetriesRef.current = 0
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
      healthRetriesRef.current++
      const maxRetries = 5
      if (healthRetriesRef.current <= maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, healthRetriesRef.current), 30000)
        window.setTimeout(checkBackendHealth, delay)
      }
    }
  }, [])

  useEffect(() => {
    if (!token) return
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

  const selectedKeys = [routePageContext.activeMenuKey]
  const activeTabKey = routePageContext.openPageKey

  const menuItems = visibleMenuEntries.map((entry) => {
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
  })

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    const targetPath = menuPathByKey[String(key)]
    if (targetPath) {
      navigate({ to: targetPath as '/' })
    }
  }

  const tabItems = pages.map((page) => ({
    key: page.key,
    label: page.title,
    closable: page.closable,
  }))

  const handleTabChange = (key: string) => {
    const page = pages.find((item) => item.key === key)
    if (page) {
      navigate({ to: page.path as '/' })
    }
  }

  const handleTabEdit = (
    event: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'remove' && typeof event === 'string') {
      closePage(event, (path: string) => navigate({ to: path as '/' }))
    }
  }

  const handleSignOut = async () => {
    Modal.confirm({
      title: '确认退出',
      content: '确定要退出登录吗？',
      onOk: async () => {
        await signOut()
        navigate({ to: '/login' })
      },
    })
  }

  const handleOpenPersonalSettings = useCallback(() => {
    resetPersonalSettings()
    openPersonalSettings()
  }, [openPersonalSettings, resetPersonalSettings])

  const siderWidth = collapsed ? 60 : 220

  return (
    <Layout className="app-shell leo-shell" style={{ minHeight: '100vh' }}>
      <div className="leo-page-loader" />

      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        width={220}
        collapsedWidth={60}
        className="leo-sider"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 100,
          height: '100vh',
          background: 'linear-gradient(180deg, #ffffff 0%, var(--theme-sider-surface) 100%)',
          borderRight: '1px solid rgba(148,163,184,0.2)',
          boxShadow: '12px 0 28px rgba(15,23,42,0.06)',
        }}
      >
        <div
          className="flex items-center gap-3 h-[68px] px-4 overflow-hidden"
          style={{ color: 'var(--theme-sider-text)' }}
        >
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--theme-primary)] to-blue-400 text-white font-bold text-lg tracking-wider shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
            {collapsed ? 'L' : 'LEO'}
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <strong className="text-[var(--theme-sider-text)] text-[calc(var(--app-font-size)+4px)] font-semibold">
                {appTitle}
              </strong>
              <span className="mt-0.5 text-[var(--theme-sider-muted)] text-[calc(var(--app-font-size)-1px)]">
                钢材贸易业务中台
              </span>
            </div>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={selectedKeys}
          items={menuItems}
          onClick={handleMenuClick}
          className="leo-menu"
          style={{
            height: 'calc(100vh - 68px)',
            overflowY: 'auto',
            borderInlineEnd: 'none',
            borderTop: 'none',
            background: 'transparent',
          }}
        />
      </Sider>

      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
        <Header
          className="leo-header"
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            zIndex: 90,
            width: `calc(100% - ${siderWidth}px)`,
            transition: 'width 0.2s',
            backdropFilter: 'blur(14px)',
            height: 'var(--app-header-height)',
            padding: 0,
            lineHeight: 'var(--app-header-height)',
            background: 'var(--theme-header-bg)',
            borderBottom: '1px solid rgba(219,227,238,0.9)',
          }}
        >
          <div className="flex items-center h-[var(--app-header-height)] px-[18px] gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              className="app-trigger"
            />

            <div className="flex flex-col justify-center">
              <span className="text-[var(--theme-header-text)] text-[calc(var(--app-font-size)+4px)] font-semibold leading-tight">
                {routePageContext.title}
              </span>
            </div>

            <div className="flex-1 flex items-center gap-2 max-w-[520px] min-w-[280px] mx-6">
              <AutoComplete
                className="w-full"
                value={globalSearchKeyword}
                options={globalSearchOptions}
                open={searchOpen && globalSearchOptions.length > 0}
                onSearch={(value) => {
                  setSearchOpen(true)
                  void handleGlobalSearch(value)
                }}
                onChange={(value) => setGlobalSearchKeyword(String(value))}
                onSelect={(value) => handleGlobalSearchSelect(String(value))}
                onDropdownVisibleChange={setSearchOpen}
              >
                <Input
                  placeholder="搜索单号、合同号、对账单号"
                  prefix={<SearchOutlined className="text-gray-400" />}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={handleGlobalSearchBlur}
                  onPressEnter={(event) =>
                    void handleGlobalSearchSubmit(event.currentTarget.value)}
                />
              </AutoComplete>
              <Button
                type="primary"
                loading={globalSearchLoading}
                onClick={() => void handleGlobalSearchSubmit(globalSearchKeyword)}
              >
                搜索
              </Button>
            </div>

            <div className="flex items-center ml-auto gap-1">
              <Tag color={backendOnline ? 'green' : 'red'} className="text-[10px]">
                {backendOnline ? '在线' : '离线'}
              </Tag>

              <span className="text-[var(--theme-header-text)] text-sm tabular-nums mx-2">
                {clock.format('HH:mm:ss')}
              </span>

              {companyName && (
                <Tag className="text-[var(--theme-header-muted)]">{companyName}</Tag>
              )}

              {user && (
                <span className="action user-name text-[var(--theme-header-text)] font-medium mx-1">
                  {user.userName || user.loginName}
                </span>
              )}

              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'settings',
                      icon: <SettingOutlined />,
                      label: '个人设置',
                      onClick: handleOpenPersonalSettings,
                    },
                    { type: 'divider' as const },
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
                <Button type="text" icon={<SettingOutlined />} />
              </Dropdown>
            </div>
          </div>
        </Header>

        <div
          className="tab-layout-tabs"
          style={{
            position: 'fixed',
            top: 'var(--app-header-height)',
            right: 0,
            zIndex: 80,
            width: `calc(100% - ${siderWidth}px)`,
            transition: 'width 0.2s',
            padding: '0 12px',
            background: 'rgba(255,255,255,0.94)',
            borderBottom: '1px solid var(--theme-card-border)',
            backdropFilter: 'blur(14px)',
          }}
        >
          <Tabs
            type="editable-card"
            hideAdd
            activeKey={activeTabKey}
            items={tabItems}
            onChange={handleTabChange}
            onEdit={handleTabEdit}
            size="small"
            style={{ marginBottom: 0 }}
          />
        </div>

        <Content className="leo-content" style={{ paddingTop: 'var(--app-top-offset)' }}>
          <div
            className="leo-content-inner"
            style={{
              minHeight: 'calc(100vh - var(--app-top-offset))',
              padding: 'var(--app-content-padding)',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>

      <PersonalSettingsModal
        open={personalSettingsOpen}
        onClose={closePersonalSettings}
        onSave={savePersonalSettings}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
      />
    </Layout>
  )
}

function PersonalSettingsModal({
  open,
  onClose,
  onSave,
  fontSize,
  onFontSizeChange,
}: {
  open: boolean
  onClose: () => void
  onSave: () => void
  fontSize: number
  onFontSizeChange: (value: number) => void
}) {
  const [tab, setTab] = useState('display')
  const [pwForm] = Form.useForm()
  const [pwSaving, setPwSaving] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [totpSetup, setTotpSetup] = useState<{ qrCodeBase64: string; secret: string } | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [totpEnabling, setTotpEnabling] = useState(false)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!open) {
      return
    }
    setTab('display')
    setTotpSetup(null)
    setTotpCode('')
    pwForm.resetFields()
  }, [open, pwForm])

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

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string }) => {
    setPwSaving(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_PASSWORD, values)
      message.success('密码修改成功')
      pwForm.resetFields()
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改失败')
    } finally {
      setPwSaving(false)
    }
  }

  const handleSetupTotp = async () => {
    setTotpLoading(true)
    try {
      const res = await http.post<ApiResponse<{ qrCodeBase64: string; secret: string }>>(
        ENDPOINTS.ACCOUNT_2FA_SETUP,
        {},
      )
      setTotpSetup(res.data)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '获取失败')
    } finally {
      setTotpLoading(false)
    }
  }

  const handleEnableTotp = async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error('请输入6位验证码')
      return
    }

    setTotpEnabling(true)
    try {
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, { totpCode: totpCode.trim() })
      updateCurrentUserSecurity(true)
      message.success('二次验证已启用')
      setTotpSetup(null)
      setTotpCode('')
    } catch (err) {
      message.error(err instanceof Error ? err.message : '启用失败')
    } finally {
      setTotpEnabling(false)
    }
  }

  const footer = tab === 'display'
    ? [
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" onClick={onSave}>保存</Button>,
      ]
    : [
        <Button key="close" onClick={onClose}>关闭</Button>,
      ]

  return (
    <Modal
      title="个人设置"
      open={open}
      onCancel={onClose}
      footer={footer}
      width={520}
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'display', label: '显示设置' },
          { key: 'security', label: '账户安全' },
        ]}
      />

      {tab === 'display' ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#595959]">字号</span>
            <Select
              value={fontSize}
              onChange={onFontSizeChange}
              options={[11, 12, 13, 14, 16, 18].map((value) => ({
                value,
                label: `${value}px`,
                title: `${value}px`,
              }))}
              style={{ width: 100 }}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#595959]">字体预览</span>
            <span style={{ fontSize }}>Leo ERP 钢材贸易业务中台</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#595959]">登录账号</span>
            <span className="font-medium">{user?.loginName || '--'}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <span className="text-[#595959]">二次验证</span>
            {user?.totpEnabled ? (
              <Tag color="green">已启用</Tag>
            ) : totpSetup ? (
              <div className="flex flex-col items-end gap-2">
                <img
                  src={toDataImageUrl(totpSetup.qrCodeBase64)}
                  alt="TOTP QR"
                  className="w-32 h-32 rounded border border-gray-100 bg-white p-2"
                />
                <code className="text-xs">{totpSetup.secret}</code>
                <div className="flex gap-2">
                  <Input
                    size="small"
                    placeholder="6位验证码"
                    maxLength={6}
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                    style={{ width: 100 }}
                  />
                  <Button
                    size="small"
                    type="primary"
                    loading={totpEnabling}
                    onClick={handleEnableTotp}
                  >
                    验证启用
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="small" loading={totpLoading} onClick={handleSetupTotp}>
                设置二次验证
              </Button>
            )}
          </div>
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
              rules={[{ required: true, min: 6, message: '至少6位' }]}
            >
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={pwSaving} block>
              修改密码
            </Button>
          </Form>
        </div>
      )}
    </Modal>
  )
}
