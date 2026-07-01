import { LogoutOutlined, SettingOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd/es/menu'
import type { TFunction } from 'i18next'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppHeaderSearchProps } from '@/layouts/AppHeaderSearch'
import { AppSideNavigationHeader } from '@/layouts/AppSideNavigationHeader'
import { AppTopNavigationHeader } from '@/layouts/AppTopNavigationHeader'
import type { AppLayoutClockDisplay } from '@/layouts/app-layout-utils'

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
  clockDisplay: AppLayoutClockDisplay
  onDashboardClick: () => void
  onMenuClick: MenuProps['onClick']
  selectedKeys: string[]
  topBrandMark: string
  topMenuItems: NonNullable<MenuProps['items']>
}

interface SideNavigationHeaderProps extends SharedHeaderProps {
  backendOnline: boolean
  clockDisplay: AppLayoutClockDisplay
  collapsed: boolean
  kind: 'side'
  onToggleCollapsed: () => void
  title: string
}

type AppLayoutHeaderProps = TopNavigationHeaderProps | SideNavigationHeaderProps

function buildUserMenuItems(
  t: TFunction,
  onOpenPersonalSettings: () => void,
  onSignOut: () => void,
): NonNullable<MenuProps['items']> {
  return [
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: t('layouts.userMenu.personalSettings'),
      onClick: onOpenPersonalSettings,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('layouts.userMenu.logout'),
      danger: true,
      onClick: onSignOut,
    },
  ]
}

export function AppLayoutHeader(props: AppLayoutHeaderProps) {
  const { t } = useTranslation()
  const userMenuItems = buildUserMenuItems(
    t,
    props.onOpenPersonalSettings,
    props.onSignOut,
  )

  if (props.kind === 'top') {
    return <AppTopNavigationHeader {...props} userMenuItems={userMenuItems} />
  }

  return <AppSideNavigationHeader {...props} userMenuItems={userMenuItems} />
}
