import { nextTick, reactive } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { useOpenPages } from '@/layouts/use-open-pages'

interface RouteStub {
  path: string
  fullPath: string
  meta: Record<string, unknown>
}

function createRoute() {
  return reactive<RouteStub>({
    path: '/dashboard',
    fullPath: '/dashboard',
    meta: {
      title: '工作台',
      menuKey: '/dashboard',
      menuParent: '',
    },
  })
}

describe('useOpenPages', () => {
  it('syncs menu expansion and opened pages from route changes', async () => {
    const route = createRoute()
    const router = {
      push: vi.fn(),
    }

    const support = useOpenPages({
      route,
      router,
      defaultPath: '/dashboard',
      defaultTitle: '未命名页面',
    })

    await nextTick()

    expect(support.activeTabKey.value).toBe('/dashboard')
    expect(support.openKeys.value).toEqual([])
    expect(support.openPages.value).toEqual([
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '工作台',
        closable: false,
      },
    ])

    route.path = '/print-templates'
    route.fullPath = '/print-templates'
    route.meta = {
      title: '打印模板',
      menuKey: '/print-templates',
      menuParent: 'system',
    }

    await nextTick()

    expect(support.activeTabKey.value).toBe('/print-templates')
    expect(support.openKeys.value).toEqual(['system'])
    expect(support.openPages.value).toEqual([
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '工作台',
        closable: false,
      },
      {
        key: '/print-templates',
        path: '/print-templates',
        title: '打印模板',
        closable: true,
      },
    ])
  })

  it('routes to the previous tab when closing the active page', async () => {
    const route = createRoute()
    const router = {
      push: vi.fn(),
    }

    const support = useOpenPages({
      route,
      router,
      defaultPath: '/dashboard',
      defaultTitle: '未命名页面',
    })

    await nextTick()

    route.path = '/print-templates'
    route.fullPath = '/print-templates'
    route.meta = {
      title: '打印模板',
      menuKey: '/print-templates',
      menuParent: 'system',
    }

    await nextTick()
    support.closeTab('/print-templates')

    expect(support.openPages.value).toEqual([
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '工作台',
        closable: false,
      },
    ])
    expect(router.push).toHaveBeenCalledWith('/dashboard')
  })

  it('reuses the canonical tab key for hidden alias routes', async () => {
    const route = createRoute()
    const router = {
      push: vi.fn(),
    }

    const support = useOpenPages({
      route,
      router,
      defaultPath: '/dashboard',
      defaultTitle: '未命名页面',
    })

    await nextTick()

    route.path = '/role-settings'
    route.fullPath = '/role-settings?keyword=管理员'
    route.meta = {
      title: '角色权限配置',
      menuKey: '/role-settings',
      menuParent: 'system',
      activeMenuKey: '/role-action-editor',
      openPageKey: '/role-action-editor',
    }

    await nextTick()

    expect(support.activeTabKey.value).toBe('/role-action-editor')
    expect(support.openPages.value).toEqual([
      {
        key: '/dashboard',
        path: '/dashboard',
        title: '工作台',
        closable: false,
      },
      {
        key: '/role-action-editor',
        path: '/role-settings?keyword=管理员',
        title: '角色权限配置',
        closable: true,
      },
    ])
  })
})
