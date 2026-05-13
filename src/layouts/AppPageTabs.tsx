import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react'
import Tabs from 'antd/es/tabs'
import type { OpenPage } from '@/hooks/useOpenPages'

type AppPageTabsProps = {
  activeKey: string
  isTopNavigationLayout: boolean
  onNavigateToPath: (path: string) => void
  pages: OpenPage[]
  shellFontStyle: CSSProperties
  closePage: (key: string, navigate: (path: string) => void) => void
}

function buildPageTabLabel(page: OpenPage, onClose: (key: string) => void) {
  return (
    <span
      className="app-page-tab-label"
      onDoubleClick={() => {
        if (page.closable) {
          onClose(page.key)
        }
      }}
    >
      {page.title}
    </span>
  )
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
    label: buildPageTabLabel(page, (key) => closePage(key, onNavigateToPath)),
    closable: page.closable,
  }))

  const handleTabChange = (key: string) => {
    const page = pages.find((item) => item.key === key)
    if (page) {
      onNavigateToPath(page.path)
    }
  }

  const handleTabEdit = (
    event: ReactMouseEvent | ReactKeyboardEvent | string,
    action: 'add' | 'remove',
  ) => {
    if (action === 'remove' && typeof event === 'string') {
      closePage(event, onNavigateToPath)
    }
  }

  return (
    <div
      className={`tab-layout-tabs${isTopNavigationLayout ? ' tab-layout-tabs-top-nav' : ''}`}
      style={shellFontStyle}
    >
      <Tabs
        type="editable-card"
        hideAdd
        activeKey={activeKey}
        items={tabItems}
        onChange={handleTabChange}
        onEdit={handleTabEdit}
        size="small"
      />
    </div>
  )
}
