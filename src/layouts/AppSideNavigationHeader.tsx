import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Dropdown from 'antd/es/dropdown'
import type { MenuProps } from 'antd/es/menu'
import Tag from 'antd/es/tag'
import { useEffect, useState, type CSSProperties } from 'react'
import {
  LazyAppHeaderSearch,
  type LazyAppHeaderSearchProps,
} from '@/layouts/LazyAppHeaderSearch'

type LayoutHeaderSearchProps = Omit<LazyAppHeaderSearchProps, 'className'>

interface Props {
  backendOnline: boolean
  clockText: string
  collapsed: boolean
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
  currentUserName,
  onToggleCollapsed,
  search,
  shellFontStyle,
  title,
  userMenuItems,
}: Props) {
  const [devTimeString, setDevTimeString] = useState('')
  useEffect(() => {
    setDevTimeString(new Date().toLocaleTimeString())
  }, [])

  return (
    <div className="app-header-bar">
      <span className="app-trigger" onClick={onToggleCollapsed}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </span>

      <div className="header-page-meta">
        <div className="header-page-title">{title}</div>
        <div className="header-page-desc">业务中心 / {title}</div>
      </div>

      <LazyAppHeaderSearch className="header-global-search" {...search} />

      <div className="user-wrapper" style={shellFontStyle}>
        <span className="action action-tag">
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
            强制刷新
          </button>
        ) : null}
      </div>
    </div>
  )
}
