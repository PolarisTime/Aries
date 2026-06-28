import { CloseOutlined } from '@ant-design/icons'
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

  const handlePageClose = (
    event: MouseEvent<HTMLButtonElement>,
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

  return (
    <div
      className={`tab-layout-tabs open-page-strip${isTopNavigationLayout ? ' tab-layout-tabs-top-nav' : ''}`}
      style={shellFontStyle}
    >
      <ul className="open-page-strip-list">
        {pages.map((page) => {
          const active = page.key === activeKey
          return (
            <li
              className={`open-page-strip-item${active ? ' is-active' : ''}`}
              key={page.key}
            >
              <button
                type="button"
                className="open-page-strip-trigger"
                aria-current={active ? 'page' : undefined}
                onClick={() => onNavigateToPath(page.path)}
                onDoubleClick={(event) => handlePageClose(event, page)}
              >
                {page.title}
              </button>
              {page.closable ? (
                <button
                  type="button"
                  className="open-page-strip-close"
                  aria-label={`关闭 ${page.title}`}
                  onClick={(event) => handlePageClose(event, page)}
                >
                  <CloseOutlined />
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
