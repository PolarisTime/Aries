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
  Descriptions,
  Flex,
  Image,
  Typography,
  Avatar,
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
import { appPageDefinitions, getPageDefinition } from '@/config/page-registry'
import {
  buildVisibleLayoutMenuEntries,
  type LayoutMenuEntry,
} from '@/layouts/layout-menu'
import { resolveRoutePageContext } from '@/layouts/route-page-context'
import { usePersonalSettings } from '@/layouts/usePersonalSettings'
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
    if (!token) return
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
      const res = await fetch(`${apiBaseUrl}${ENDPOINTS.HEALTH}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)
      if (res.ok) {
        const body = (await res.json()) as { status?: string }
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
        const delay = Math.min(
          1000 * Math.pow(2, healthRetriesRef.current),
          30000,
        )
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
    modal.confirm({
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
          background:
            'linear-gradient(180deg, #ffffff 0%, var(--theme-sider-surface) 100%)',
          borderRight: '1px solid rgba(148,163,184,0.2)',
          boxShadow: '12px 0 28px rgba(15,23,42,0.06)',
        }}
      >
        <Flex
          align="center"
          gap={12}
          style={{
            height: 68,
            paddingInline: 16,
            overflow: 'hidden',
            color: 'var(--theme-sider-text)',
          }}
        >
          <Avatar
            shape="square"
            size={40}
            style={{
              background:
                'linear-gradient(135deg, var(--theme-primary), #60a5fa)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 1,
              boxShadow: '0 10px 20px rgba(37,99,235,0.3)',
            }}
          >
            {collapsed ? 'L' : 'LEO'}
          </Avatar>
          {!collapsed && (
            <Flex vertical style={{ minWidth: 0 }}>
              <Typography.Text
                strong
                ellipsis
                style={{
                  color: 'var(--theme-sider-text)',
                  fontSize: 'calc(var(--app-font-size) + 4px)',
                }}
              >
                {appTitle}
              </Typography.Text>
              <Typography.Text
                ellipsis
                style={{
                  color: 'var(--theme-sider-muted)',
                  fontSize: 'calc(var(--app-font-size) - 1px)',
                }}
              >
                钢材贸易业务中台
              </Typography.Text>
            </Flex>
          )}
        </Flex>

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

      <Layout
        style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}
      >
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
          <Flex
            align="center"
            gap={16}
            style={{
              height: 'var(--app-header-height)',
              paddingInline: 18,
            }}
          >
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              className="app-trigger"
            />

            <Flex vertical justify="center" style={{ minWidth: 0 }}>
              <Typography.Text
                strong
                ellipsis
                style={{
                  color: 'var(--theme-header-text)',
                  fontSize: 'calc(var(--app-font-size) + 4px)',
                  lineHeight: 1.2,
                }}
              >
                {routePageContext.title}
              </Typography.Text>
            </Flex>

            <Flex
              align="center"
              gap={8}
              style={{
                flex: '1 1 520px',
                maxWidth: 520,
                minWidth: 280,
                marginInline: 24,
              }}
            >
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
                onOpenChange={setSearchOpen}
              >
                <Input
                  placeholder="搜索单号、合同号、对账单号"
                  prefix={
                    <SearchOutlined style={{ color: 'rgba(0, 0, 0, 0.45)' }} />
                  }
                  onFocus={() => setSearchOpen(true)}
                  onBlur={handleGlobalSearchBlur}
                  onPressEnter={(event) =>
                    void handleGlobalSearchSubmit(event.currentTarget.value)
                  }
                />
              </AutoComplete>
              <Button
                type="primary"
                loading={globalSearchLoading}
                onClick={() =>
                  void handleGlobalSearchSubmit(globalSearchKeyword)
                }
              >
                搜索
              </Button>
            </Flex>

            <Flex align="center" gap={8} style={{ marginLeft: 'auto' }}>
              <Tag
                color={backendOnline ? 'green' : 'red'}
                style={{ fontSize: 10 }}
              >
                {backendOnline ? '在线' : '离线'}
              </Tag>

              <Typography.Text
                style={{
                  color: 'var(--theme-header-text)',
                  fontSize: 14,
                  fontVariantNumeric: 'tabular-nums',
                  marginInline: 8,
                }}
              >
                {clock.format('HH:mm:ss')}
              </Typography.Text>

              {companyName && (
                <Tag style={{ color: 'var(--theme-header-muted)' }}>
                  {companyName}
                </Tag>
              )}

              {user && (
                <Typography.Text
                  strong
                  style={{
                    color: 'var(--theme-header-text)',
                    marginInline: 4,
                  }}
                >
                  {user.userName || user.loginName}
                </Typography.Text>
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
            </Flex>
          </Flex>
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

        <Content
          className="leo-content"
          style={{ paddingTop: 'var(--app-top-offset)' }}
        >
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
  const [totpSetup, setTotpSetup] = useState<{
    qrCodeBase64: string
    secret: string
  } | null>(null)
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
  }, [open])

  useEffect(() => {
    if (open && tab === 'security') {
      pwForm.resetFields()
    }
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
    } catch (err) {
      message.error(err instanceof Error ? err.message : '修改失败')
    } finally {
      setPwSaving(false)
    }
  }

  const handleSetupTotp = async () => {
    setTotpLoading(true)
    try {
      const res = await http.post<
        ApiResponse<{ qrCodeBase64: string; secret: string }>
      >(ENDPOINTS.ACCOUNT_2FA_SETUP, {})
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
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, {
        totpCode: totpCode.trim(),
      })
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

  const footer =
    tab === 'display'
      ? [
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button key="save" type="primary" onClick={onSave}>
            保存
          </Button>,
        ]
      : [
          <Button key="close" onClick={onClose}>
            关闭
          </Button>,
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
        <Descriptions
          bordered
          column={1}
          size="small"
          items={[
            {
              key: 'font-size',
              label: '字号',
              children: (
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
              ),
            },
            {
              key: 'preview',
              label: '字体预览',
              children: (
                <Typography.Text style={{ fontSize }}>
                  Leo ERP 钢材贸易业务中台
                </Typography.Text>
              ),
            },
          ]}
        />
      ) : (
        <Flex vertical gap={16}>
          <Descriptions
            bordered
            column={1}
            size="small"
            items={[
              {
                key: 'login-name',
                label: '登录账号',
                children: (
                  <Typography.Text strong>
                    {user?.loginName || '--'}
                  </Typography.Text>
                ),
              },
              {
                key: 'totp',
                label: '二次验证',
                children: user?.totpEnabled ? (
                  <Tag color="green">已启用</Tag>
                ) : totpSetup ? (
                  <Flex vertical gap={12}>
                    <Image
                      src={toDataImageUrl(totpSetup.qrCodeBase64)}
                      alt="TOTP QR"
                      width={128}
                      height={128}
                      preview={false}
                      style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: 8,
                        background: '#fff',
                        padding: 8,
                      }}
                    />
                    <Typography.Text code>{totpSetup.secret}</Typography.Text>
                    <Flex align="center" gap={8}>
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
                    </Flex>
                  </Flex>
                ) : (
                  <Button
                    size="small"
                    loading={totpLoading}
                    onClick={handleSetupTotp}
                  >
                    设置二次验证
                  </Button>
                ),
              },
            ]}
          />
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
        </Flex>
      )}
    </Modal>
  )
}
