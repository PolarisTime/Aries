import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Button, Dropdown, Tag } from 'antd'
import type { CSSProperties } from 'react'
import {
  AppHeaderSearch,
  type AppHeaderSearchProps,
} from '@/layouts/AppHeaderSearch'

type LayoutHeaderSearchProps = Omit<AppHeaderSearchProps, 'className'>

interface Props {
  backendOnline: boolean
  clockText: string
  collapsed: boolean
  companyName: string
  currentUserName: string
  onToggleCollapsed: () => void
  search: LayoutHeaderSearchProps
  shellFontStyle: CSSProperties
  title: string
  userMenuItems: NonNullable<MenuProps['items']>
}

export function AppSideNavigationHeader({
  backendOnline,
  clockText,
  collapsed,
  companyName,
  currentUserName,
  onToggleCollapsed,
  search,
  shellFontStyle,
  title,
  userMenuItems,
}: Props) {
  return (
    <div className="app-header-bar">
      <span className="app-trigger" onClick={onToggleCollapsed}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </span>

      <div className="header-page-meta">
        <div className="header-page-title">{title}</div>
        <div className="header-page-desc">业务中心 / {title}</div>
      </div>

      <AppHeaderSearch className="header-global-search" {...search} />

      <div className="user-wrapper" style={shellFontStyle}>
        <span className="action action-tag">
          {companyName ? <Tag color="blue">{companyName}</Tag> : null}
          <Tag color={backendOnline ? 'green' : 'red'}>
            {backendOnline ? 'API 正常' : 'API 离线'}
          </Tag>
          <Tag color="default">{clockText}</Tag>
        </span>
        <span className="action user-name">{currentUserName}</span>
        <span className="action">
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Button
              type="text"
              className="app-user-settings-trigger"
              icon={<SettingOutlined />}
            />
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
