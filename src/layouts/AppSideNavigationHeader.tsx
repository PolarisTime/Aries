import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { Button, Dropdown, Tag } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { AppLayoutClockDisplay } from '@/layouts/app-layout-utils'
import {
  LazyAppHeaderSearch,
  type LazyAppHeaderSearchProps,
} from '@/layouts/LazyAppHeaderSearch'

type LayoutHeaderSearchProps = Omit<LazyAppHeaderSearchProps, 'className'>

interface Props {
  backendOnline: boolean
  clockDisplay: AppLayoutClockDisplay
  collapsed: boolean
  currentUserName: string
  onToggleCollapsed: () => void
  search: LayoutHeaderSearchProps
  shellFontStyle: CSSProperties
  title: string
  userMenu: MenuProps
}

export function AppSideNavigationHeader({
  backendOnline,
  clockDisplay,
  collapsed,
  currentUserName,
  onToggleCollapsed,
  search,
  shellFontStyle,
  title,
  userMenu,
}: Props) {
  const { t } = useTranslation()
  const devTimeString = new Date().toLocaleTimeString()

  return (
    <div className="app-header-bar">
      <button type="button" className="app-trigger" onClick={onToggleCollapsed}>
        {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      </button>

      <div className="header-page-meta">
        <div className="header-page-title">{title}</div>
        <div className="header-page-desc">
          {t('layouts.sideNav.breadcrumbPrefix')}
          {title}
        </div>
      </div>

      <LazyAppHeaderSearch className="header-global-search" {...search} />

      <div className="user-wrapper" style={shellFontStyle}>
        <span className="action action-tag">
          <Tag color={backendOnline ? 'green' : 'red'}>
            {backendOnline
              ? t('layouts.sideNav.apiOnline')
              : t('layouts.sideNav.apiOffline')}
          </Tag>
          <Tag color="default">{clockDisplay.timeText}</Tag>
        </span>
        <span className="action user-name">{currentUserName}</span>
        <span className="action">
          <Dropdown menu={userMenu} trigger={['click']}>
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
            <ReloadOutlined />
            {t('common.refresh')}
          </button>
        ) : null}
      </div>
    </div>
  )
}
