import { useState, useCallback, useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

export interface OpenPage {
  key: string
  path: string
  title: string
  closable: boolean
}

function resolveOpenPageKey(path: string, meta?: Record<string, unknown>): string {
  return String(meta?.openPageKey || meta?.menuKey || path)
}

export function useOpenPages(defaultPath = '/dashboard', defaultTitle = '未命名页面') {
  const location = useLocation()
  const [pages, setPages] = useState<OpenPage[]>([
    { key: '/dashboard', path: '/dashboard', title: '工作台', closable: false },
  ])

  useEffect(() => {
    const key = resolveOpenPageKey(location.pathname)
    const nextPage: OpenPage = {
      key,
      path: location.pathname,
      title: defaultTitle,
      closable: key !== '/dashboard',
    }

    setPages((prev) => {
      if (prev.some((item) => item.key === key)) {
        return prev.map((item) => (item.key === key ? nextPage : item))
      }
      return [...prev, nextPage]
    })
  }, [location.pathname, defaultTitle])

  const closePage = useCallback(
    (key: string, navigate: (path: string) => void) => {
      setPages((prev) => {
        const index = prev.findIndex((item) => item.key === key)
        if (index < 0) return prev

        const nextPages = prev.filter((item) => item.key !== key)
        const currentKey = resolveOpenPageKey(location.pathname)

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
    [location.pathname, defaultPath],
  )

  const updatePageTitle = useCallback((key: string, title: string) => {
    setPages((prev) => prev.map((p) => (p.key === key ? { ...p, title } : p)))
  }, [])

  return { pages, closePage, updatePageTitle }
}
