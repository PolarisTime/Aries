import { Tabs } from 'antd'
import type { CSSProperties, MouseEvent } from 'react'
import type { ClosePageOptions, OpenPage } from '@/hooks/useOpenPages'

interface AppPageTabsProps {
  activeKey: string
  isTopNavigationLayout: boolean
  onNavigateToPath: (path: string) => void
  pages: OpenPage[]
  shellFontStyle: CSSProperties
  closePage: (
    key: string,
    navigate: (path: string) => void,
    options?: ClosePageOptions,
  ) => void
}

export function AppPageTabs({
  activeKey,
  isTopNavigationLayout,
  onNavigateToPath,
  pages,
  shellFontStyle,
  closePage,
}: AppPageTabsProps) {
  const resolveCloseFallbackPath = (page: OpenPage) => {
    const activePage = pages.find(
      (item) => item.key === activeKey && item.key !== page.key,
    )
    if (activePage?.path) {
      return activePage.path
    }

    const pageIndex = pages.findIndex((item) => item.key === page.key)
    const previousPage = pages[pageIndex - 1]
    if (previousPage?.path && previousPage.key !== page.key) {
      return previousPage.path
    }

    return pages.find((item) => item.key !== page.key)?.path
  }

  const handleTabDoubleClick = (
    event: MouseEvent<HTMLSpanElement>,
    page: OpenPage,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (!page.closable) {
      return
    }
    closePage(page.key, onNavigateToPath, {
      fallbackPath: resolveCloseFallbackPath(page),
    })
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
