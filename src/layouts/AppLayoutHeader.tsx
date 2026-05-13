import { LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd/es/menu'
import type { CSSProperties } from 'react'
import type { AppHeaderSearchProps } from '@/layouts/AppHeaderSearch'
import { AppSideNavigationHeader } from '@/layouts/AppSideNavigationHeader'
import { AppTopNavigationHeader } from '@/layouts/AppTopNavigationHeader'

type LayoutHeaderSearchProps = Omit<AppHeaderSearchProps, 'className'>

interface SharedHeaderProps {
  currentUserName: string
  onOpenPersonalSettings: () => void
  onSignOut: () => void
  search: LayoutHeaderSearchProps
  shellFontStyle: CSSProperties
}

interface TopNavigationHeaderProps extends SharedHeaderProps {
  currentUserLoginName: string
  kind: 'top'
  clockText: string
  onDashboardClick: () => void
  onMenuClick: MenuProps['onClick']
  selectedKeys: string[]
  topBrandMark: string
  topMenuItems: NonNullable<MenuProps['items']>
}

interface SideNavigationHeaderProps extends SharedHeaderProps {
  backendOnline: boolean
  clockText: string
  collapsed: boolean
  kind: 'side'
  onToggleCollapsed: () => void
  title: string
}

type AppLayoutHeaderProps = TopNavigationHeaderProps | SideNavigationHeaderProps

function buildUserMenuItems(
  onOpenPersonalSettings: () => void,
  onSignOut: () => void,
): NonNullable<MenuProps['items']> {
  return [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
      onClick: onOpenPersonalSettings,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: onSignOut,
    },
  ]
}

export function AppLayoutHeader(props: AppLayoutHeaderProps) {
  const userMenuItems = buildUserMenuItems(
    props.onOpenPersonalSettings,
    props.onSignOut,
  )

  if (props.kind === 'top') {
    return <AppTopNavigationHeader {...props} userMenuItems={userMenuItems} />
  }

  return <AppSideNavigationHeader {...props} userMenuItems={userMenuItems} />
}
