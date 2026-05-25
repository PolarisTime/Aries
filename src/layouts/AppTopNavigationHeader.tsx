import { DownOutlined, ReloadOutlined } from '@ant-design/icons'
import Dropdown from 'antd/es/dropdown'
import type { MenuProps } from 'antd/es/menu'
import Menu from 'antd/es/menu'
import { useEffect, useState, type CSSProperties } from 'react'
import {
  LazyAppHeaderSearch,
  type LazyAppHeaderSearchProps,
} from '@/layouts/LazyAppHeaderSearch'

type LayoutHeaderSearchProps = Omit<LazyAppHeaderSearchProps, 'className'>

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
  topMenuItems,
  userMenuItems,
}: Props) {
  const [devTimeString, setDevTimeString] = useState('')
  useEffect(() => {
    setDevTimeString(new Date().toLocaleTimeString())
  }, [])

  return (
    <div className="app-header-bar app-header-bar-top">
      <div className="app-top-nav-left">
        <button
          type="button"
          className="app-top-brand"
          onClick={onDashboardClick}
        >
          <span className="app-top-brand-mark">{topBrandMark}</span>
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
        {import.meta.env.DEV ? (
          <button
            type="button"
            className="app-dev-refresh-btn"
            title={devTimeString}
            onClick={() => {
              if ('caches' in window) {
                void caches.keys().then((keys) => {
                  void Promise.all(keys.map((k) => caches.delete(k)))
                })
              }
              window.location.reload()
            }}
          >
            <ReloadOutlined />刷新
          </button>
        ) : null}
        <LazyAppHeaderSearch
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
