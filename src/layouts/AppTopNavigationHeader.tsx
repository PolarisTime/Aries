import { DownOutlined } from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Dropdown, Menu } from 'antd'
import type { CSSProperties } from 'react'
import {
  AppHeaderSearch,
  type AppHeaderSearchProps,
} from '@/layouts/AppHeaderSearch'

type LayoutHeaderSearchProps = Omit<AppHeaderSearchProps, 'className'>

interface Props {
  clockText: string
  currentUserLoginName: string
  currentUserName: string
  onDashboardClick: () => void
  onMenuClick: MenuProps['onClick']
  search: LayoutHeaderSearchProps
  selectedKeys: string[]
  shellFontStyle: CSSProperties
  topBrandMark: string
  topBrandName: string
  topMenuItems: NonNullable<MenuProps['items']>
  userMenuItems: NonNullable<MenuProps['items']>
}

export function AppTopNavigationHeader({
  clockText,
  currentUserLoginName,
  currentUserName,
  onDashboardClick,
  onMenuClick,
  search,
  selectedKeys,
  shellFontStyle,
  topBrandMark,
  topBrandName,
  topMenuItems,
  userMenuItems,
}: Props) {
  return (
    <div className="app-header-bar app-header-bar-top">
      <div className="app-top-nav-left">
        <button
          type="button"
          className="app-top-brand"
          onClick={onDashboardClick}
        >
          <span className="app-top-brand-mark">{topBrandMark}</span>
          <span className="app-top-brand-copy">
            <strong>{topBrandName}</strong>
            <small>业务工作台</small>
          </span>
        </button>

        <div className="app-top-menu-shell">
          <Menu
            selectedKeys={selectedKeys}
            items={topMenuItems}
            mode="horizontal"
            className="leo-top-menu"
            onClick={onMenuClick}
          />
        </div>
      </div>

      <div className="app-top-nav-right" style={shellFontStyle}>
        <AppHeaderSearch
          className="header-global-search header-global-search-top"
          {...search}
        />

        <div className="user-wrapper user-wrapper-top" style={shellFontStyle}>
          <div className="app-top-header-meta">
            <span className="app-top-header-meta-label">服务器时间</span>
            <strong>{clockText}</strong>
          </div>
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <button type="button" className="app-top-user-trigger">
              <span className="app-top-user-avatar">
                {currentUserName.trim().charAt(0).toUpperCase() || 'U'}
              </span>
              <span className="app-top-user-copy">
                <strong>{currentUserName}</strong>
                <small>{currentUserLoginName}</small>
              </span>
              <DownOutlined className="app-top-user-caret" />
            </button>
          </Dropdown>
        </div>
      </div>
    </div>
  )
}
