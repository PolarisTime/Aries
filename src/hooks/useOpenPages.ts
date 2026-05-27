import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
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
  const [pages, setPages] = useState<OpenPage[]>([
    { key: defaultPath, path: defaultPath, title: resolvedHomeTitle, closable: false },
  ])

  useEffect(() => {
    // react-doctor: intentional callback, not event handler
    const currentPage = resolvePage
      ? resolvePage(location.pathname)
      : {
          key: resolveOpenPageKey(location.pathname),
          // react-doctor: intentional callback, not event handler
          path: location.pathname,
          title: resolvedDefaultTitle,
        }
    const nextPage: OpenPage = {
      key: currentPage.key,
      path: currentPage.path,
      title: currentPage.title,
      closable: currentPage.key !== defaultPath,
    }

    setPages((prev) => {
      const normalizedPages = [
        {
          // react-doctor: intentional callback, not event handler
          key: defaultPath,
          // react-doctor: intentional callback, not event handler
          path: defaultPath,
          title: resolvedHomeTitle,
          closable: false,
        },
        ...prev.filter((item) => item.key !== defaultPath),
      ]

      if (normalizedPages.some((item) => item.key === currentPage.key)) {
        return normalizedPages.map((item) =>
          item.key === currentPage.key ? nextPage : item,
        )
      }
      return [...normalizedPages, nextPage]
    })
  }, [defaultPath, resolvedDefaultTitle, resolvedHomeTitle, location.pathname, resolvePage])

  const closePage = useCallback(
    (key: string, navigate: (path: string) => void) => {
      setPages((prev) => {
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
    },
    [defaultPath, location.pathname, resolvePage],
  )

  const updatePageTitle = useCallback((key: string, title: string) => {
    setPages((prev) => prev.map((p) => (p.key === key ? { ...p, title } : p)))
  }, [])

  return { pages, closePage, updatePageTitle }
}
