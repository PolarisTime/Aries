import { Layout } from 'antd'
import type { MenuProps } from 'antd/es/menu'
import type { CSSProperties } from 'react'
import { AppLayoutHeader } from '@/layouts/AppLayoutHeader'
import type { AppLayoutClockDisplay } from '@/layouts/app-layout-utils'

const { Header } = Layout

/**
 * 顶栏容器：按布局模式渲染顶部导航或侧边导航的头部。
 *
 * <p>从 AppLayout 抽出：一是 AppLayout 超出 no-giant-component 的 300 行阈值，
 * 顶栏是其中最大的一块纯展示 JSX；二是两种布局的 Header 属性几乎相同，收在一处
 * 后搜索框回调只在一处透传（改造前同一份 search 对象在两侧各写一遍）。
 * Header 类名/样式与 AppLayoutHeader 的 props 保持逐字不变。</p>
 */

interface Props {
  backendOnline: boolean
  clockDisplay: AppLayoutClockDisplay
  collapsed: boolean
  currentUserLoginName: string
  currentUserName: string
  fixedWidthStyle: CSSProperties
  headerClassName: string
  isTopNavigationLayout: boolean
  onDashboardClick: () => void
  onMenuClick: MenuProps['onClick']
  onOpenPersonalSettings: () => void
  onSignOut: () => void
  onToggleCollapsed: () => void
  search: React.ComponentProps<typeof AppLayoutHeader>['search']
  selectedKeys: string[]
  shellFontStyle: CSSProperties
  topBrandMark: string
  topMenuItems: NonNullable<MenuProps['items']>
}

export function AppLayoutHeaderArea({
  backendOnline,
  clockDisplay,
  collapsed,
  currentUserLoginName,
  currentUserName,
  fixedWidthStyle,
  headerClassName,
  isTopNavigationLayout,
  onDashboardClick,
  onMenuClick,
  onOpenPersonalSettings,
  onSignOut,
  onToggleCollapsed,
  search,
  selectedKeys,
  shellFontStyle,
  topBrandMark,
  topMenuItems,
}: Props) {
  return (
    <Header className={headerClassName} style={fixedWidthStyle}>
      {isTopNavigationLayout ? (
        <AppLayoutHeader
          kind="top"
          selectedKeys={selectedKeys}
          topMenuItems={topMenuItems}
          onMenuClick={onMenuClick}
          onDashboardClick={onDashboardClick}
          topBrandMark={topBrandMark}
          shellFontStyle={shellFontStyle}
          clockDisplay={clockDisplay}
          currentUserName={currentUserName}
          currentUserLoginName={currentUserLoginName}
          onOpenPersonalSettings={onOpenPersonalSettings}
          onSignOut={onSignOut}
          search={search}
        />
      ) : (
        <AppLayoutHeader
          kind="side"
          collapsed={collapsed}
          onToggleCollapsed={onToggleCollapsed}
          backendOnline={backendOnline}
          shellFontStyle={shellFontStyle}
          clockDisplay={clockDisplay}
          currentUserName={currentUserName}
          onOpenPersonalSettings={onOpenPersonalSettings}
          onSignOut={onSignOut}
          search={search}
        />
      )}
    </Header>
  )
}
