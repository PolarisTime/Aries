import Tabs from 'antd/es/tabs'
import type { CSSProperties, MouseEvent } from 'react'
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
  const handleTabDoubleClick = (
    event: MouseEvent<HTMLSpanElement>,
    page: OpenPage,
  ) => {
    event.stopPropagation()
    if (!page.closable) {
      return
    }
    closePage(page.key, onNavigateToPath)
  }

  const tabItems = pages.map((page) => ({
    key: page.key,
    label: (
      <span
        className="app-page-tab-label"
        onDoubleClick={(event) => handleTabDoubleClick(event, page)}
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
