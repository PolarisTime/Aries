import { useLocation } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface OpenPage {
  key: string
  path: string
  title: string
  closable: boolean
}

export interface OpenPageDescriptor {
  key: string
  path: string
  title: string
}

function resolveOpenPageKey(
  path: string,
  meta?: Record<string, unknown>,
): string {
  return String(meta?.openPageKey || meta?.menuKey || path)
}

export function useOpenPages(
  defaultPath = '/dashboard',
  defaultTitle?: string,
  homeTitle?: string,
  resolvePage?: (pathname: string) => OpenPageDescriptor,
) {
  const { t } = useTranslation()
  const resolvedDefaultTitle = defaultTitle ?? t('hooks.openPages.unnamedPage')
  const resolvedHomeTitle = homeTitle ?? t('hooks.openPages.workbench')

  const location = useLocation()
  const [storedPages, setStoredPages] = useState<OpenPage[]>([
    {
      key: defaultPath,
      path: defaultPath,
      title: resolvedHomeTitle,
      closable: false,
    },
  ])

  const currentPage = resolvePage
    ? resolvePage(location.pathname)
    : {
        key: resolveOpenPageKey(location.pathname),
        path: location.pathname,
        title: resolvedDefaultTitle,
      }
  const currentOpenPage: OpenPage = {
    key: currentPage.key,
    path: currentPage.path,
    title: currentPage.title,
    closable: currentPage.key !== defaultPath,
  }
  const pages = (() => {
    const normalizedPages = [
      {
        key: defaultPath,
        path: defaultPath,
        title: resolvedHomeTitle,
        closable: false,
      },
      ...storedPages.filter((item) => item.key !== defaultPath),
    ]

    if (normalizedPages.some((item) => item.key === currentOpenPage.key)) {
      return normalizedPages.map((item) =>
        item.key === currentOpenPage.key ? currentOpenPage : item,
      )
    }
    return [...normalizedPages, currentOpenPage]
  })()

  if (pages !== storedPages) {
    const samePages =
      pages.length === storedPages.length &&
      pages.every((page, index) => {
        const stored = storedPages[index]
        return (
          stored &&
          stored.key === page.key &&
          stored.path === page.path &&
          stored.title === page.title &&
          stored.closable === page.closable
        )
      })
    if (!samePages) {
      setStoredPages(pages)
    }
  }

  const closePage = (key: string, navigate: (path: string) => void) => {
    setStoredPages((prev) => {
      const index = prev.findIndex((item) => item.key === key)
      if (index < 0) return prev
      if (key === defaultPath || prev[index]?.closable === false) return prev

      const nextPages = prev.filter((item) => item.key !== key)
      const currentKey = resolvePage
        ? resolvePage(location.pathname).key
        : resolveOpenPageKey(location.pathname)

      if (currentKey === key) {
        const fallback = nextPages[Math.max(index - 1, 0)] || nextPages[0]
        if (fallback?.path) {
          // Use setTimeout to avoid state update during render
          setTimeout(() => navigate(fallback.path), 0)
        } else {
          setTimeout(() => navigate(defaultPath), 0)
        }
      }

      return nextPages
    })
  }

  const updatePageTitle = (key: string, title: string) => {
    setStoredPages((prev) =>
      prev.map((p) => (p.key === key ? { ...p, title } : p)),
    )
  }

  return { pages, closePage, updatePageTitle }
}
