import { computed, ref, watch } from 'vue'

export interface OpenPage {
  key: string
  path: string
  title: string
  closable: boolean
}

interface RouteLike {
  path: string
  fullPath: string
  meta: Record<string, unknown>
}

interface RouterLike {
  push: (path: string) => unknown
}

interface UseOpenPagesOptions {
  route: RouteLike
  router: RouterLike
  defaultPath?: string
  defaultTitle?: string
}

export function resolveOpenPageKey(route: RouteLike) {
  return String(route.meta.openPageKey || route.meta.menuKey || route.fullPath)
}

export function resolveMenuOpenKeys(menuParent: unknown) {
  return menuParent ? [String(menuParent)] : []
}

export function syncOpenPagesWithRoute(
  pages: OpenPage[],
  route: RouteLike,
  defaultTitle = '未命名页面',
) {
  const key = resolveOpenPageKey(route)
  const nextPage: OpenPage = {
    key,
    path: route.fullPath,
    title: String(route.meta.title || defaultTitle),
    closable: key !== '/dashboard',
  }

  if (!pages.some((item) => item.key === key)) {
    return [...pages, nextPage]
  }

  return pages.map((item) => (item.key === key ? nextPage : item))
}

export function closeOpenPageState(
  pages: OpenPage[],
  key: string,
  currentKey: string,
  defaultPath = '/dashboard',
) {
  const index = pages.findIndex((item) => item.key === key)
  if (index < 0) {
    return {
      nextPages: pages,
      fallbackPath: null,
    }
  }

  const nextPages = pages.filter((item) => item.key !== key)
  if (currentKey !== key) {
    return {
      nextPages,
      fallbackPath: null,
    }
  }

  const fallback = nextPages[Math.max(index - 1, 0)] || nextPages[0]
  return {
    nextPages,
    fallbackPath: fallback?.path || defaultPath,
  }
}

export function useOpenPages(options: UseOpenPagesOptions) {
  const openKeys = ref<string[]>([])
  const openPages = ref<OpenPage[]>([])
  const activeTabKey = computed(() => resolveOpenPageKey(options.route))

  watch(
    () => options.route.meta.menuParent,
    (menuParent) => {
      openKeys.value = resolveMenuOpenKeys(menuParent)
    },
    { immediate: true },
  )

  watch(
    () => options.route.fullPath,
    () => {
      openPages.value = syncOpenPagesWithRoute(
        openPages.value,
        options.route,
        options.defaultTitle,
      )
    },
    { immediate: true },
  )

  function handleTabChange(key: string | number) {
    const target = openPages.value.find((item) => item.key === String(key))
    if (target) {
      void options.router.push(target.path)
    }
  }

  function closeTab(key: string) {
    const { nextPages, fallbackPath } = closeOpenPageState(
      openPages.value,
      key,
      activeTabKey.value,
      options.defaultPath,
    )

    openPages.value = nextPages
    if (fallbackPath) {
      void options.router.push(fallbackPath)
    }
  }

  function handleTabEdit(
    key: string | number | MouseEvent | KeyboardEvent,
    action: 'add' | 'remove',
  ) {
    if (action === 'remove' && (typeof key === 'string' || typeof key === 'number')) {
      closeTab(String(key))
    }
  }

  return {
    activeTabKey,
    openKeys,
    openPages,
    closeTab,
    handleTabChange,
    handleTabEdit,
  }
}
