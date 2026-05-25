import Tabs from 'antd/es/tabs'
import type { CSSProperties } from 'react'
import type { OpenPage } from '@/hooks/useOpenPages'

interface AppPageTabsProps {
  activeKey: string
  isTopNavigationLayout: boolean
  onNavigateToPath: (path: string) => void
  pages: OpenPage[]
  shellFontStyle: CSSProperties
  closePage: (key: string, navigate: (path: string) => void) => void
}

export function AppPageTabs({
  activeKey,
  isTopNavigationLayout,
  onNavigateToPath,
  pages,
  shellFontStyle,
  closePage,
}: AppPageTabsProps) {
  const tabItems = pages.map((page) => ({
    key: page.key,
    label: (
      <span
        onDoubleClick={(e) => {
          e.stopPropagation()
          closePage(page.key, onNavigateToPath)
        }}
      >
        {page.title}
      </span>
    ),
  }))

  const handleTabChange = (key: string) => {
    const page = pages.find((item) => item.key === key)
    if (page) {
      onNavigateToPath(page.path)
    }
  }

  return (
    <div
      className={`tab-layout-tabs${isTopNavigationLayout ? ' tab-layout-tabs-top-nav' : ''}`}
      style={shellFontStyle}
    >
      <Tabs
        activeKey={activeKey}
        items={tabItems}
        onChange={handleTabChange}
        size="small"
      />
    </div>
  )
}
