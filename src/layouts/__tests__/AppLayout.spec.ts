import { mount } from '@vue/test-utils'
import Antd from 'ant-design-vue'
import { createPinia, setActivePinia } from 'pinia'
import type { VueWrapper } from '@vue/test-utils'
import AppLayout from '@/layouts/AppLayout.vue'
import { resolveResourceKey } from '@/constants/resource-permissions'
import { useAuthStore } from '@/stores/auth'

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  route: {
    path: '/dashboard',
    fullPath: '/dashboard',
    meta: {
      title: '工作台',
      menuKey: '/dashboard',
      menuParent: '',
    },
  },
}))

const businessMocks = vi.hoisted(() => ({
  listBusinessModule: vi.fn(),
}))

const menuMocks = vi.hoisted(() => ({
  listSystemMenus: vi.fn(),
}))

const accountSecurityMocks = vi.hoisted(() => ({
  changeOwnPassword: vi.fn(),
  disableOwn2fa: vi.fn(),
  enableOwn2fa: vi.fn(),
  setupOwn2fa: vi.fn(),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: routerMocks.push,
    replace: routerMocks.replace,
  }),
  useRoute: () => routerMocks.route,
}))

vi.mock('@/api/business', () => ({
  listBusinessModule: businessMocks.listBusinessModule,
}))

vi.mock('@/api/system-menus', () => ({
  listSystemMenus: menuMocks.listSystemMenus,
}))

vi.mock('@/api/account-security', () => ({
  changeOwnPassword: accountSecurityMocks.changeOwnPassword,
  disableOwn2fa: accountSecurityMocks.disableOwn2fa,
  enableOwn2fa: accountSecurityMocks.enableOwn2fa,
  setupOwn2fa: accountSecurityMocks.setupOwn2fa,
}))

vi.mock('@/api/auth', () => ({
  login: vi.fn(),
  login2fa: vi.fn(),
  logout: vi.fn(),
  pingAuth: vi.fn().mockResolvedValue({ code: 0, data: 'pong' }),
}))

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

const mountedWrappers: VueWrapper[] = []

function mountWithUser(
  grantedKeys: string[],
  resourceActions: Record<string, string[]> = {},
) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.user = {
    id: 1,
    loginName: 'leo',
    userName: 'Leo',
    permissions: [
      ...grantedKeys.map((code) => ({
        resource: resolveResourceKey(code),
        actions: resourceActions[code] || ['read'],
      })),
      ...Object.entries(resourceActions)
        .filter(([code]) => !grantedKeys.includes(code))
        .map(([code, actions]) => ({
          resource: resolveResourceKey(code),
          actions,
        })),
    ],
  }

  const wrapper = mount(AppLayout, {
    global: {
      plugins: [Antd, pinia],
      stubs: {
        RouterView: true,
      },
    },
  })

  mountedWrappers.push(wrapper)
  return wrapper
}

describe('AppLayout', () => {
  beforeEach(() => {
    localStorage.clear()
    routerMocks.push.mockReset()
    routerMocks.replace.mockReset()
    businessMocks.listBusinessModule.mockReset()
    menuMocks.listSystemMenus.mockReset()
    menuMocks.listSystemMenus.mockResolvedValue([
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        parentCode: null,
        routePath: '/dashboard',
        icon: 'HomeOutlined',
        sortOrder: 1,
        menuType: '菜单',
        actions: ['read'],
        children: [],
      },
      {
        menuCode: 'system',
        menuName: '系统设置',
        parentCode: null,
        routePath: null,
        icon: 'PrinterOutlined',
        sortOrder: 2,
        menuType: '目录',
        actions: [],
        children: [
          {
            menuCode: 'print-templates',
            menuName: '打印模板',
            parentCode: 'system',
            routePath: '/print-templates',
            icon: 'PrinterOutlined',
            sortOrder: 1,
            menuType: '菜单',
            actions: ['read'],
            children: [],
          },
          {
            menuCode: 'api-key-management',
            menuName: 'API Key 管理',
            parentCode: 'system',
            routePath: '/api-key-management',
            icon: 'SafetyCertificateOutlined',
            sortOrder: 2,
            menuType: '菜单',
            actions: ['read'],
            children: [],
          },
        ],
      },
    ])
    routerMocks.route.path = '/dashboard'
    routerMocks.route.fullPath = '/dashboard'
    routerMocks.route.meta = {
      title: '工作台',
      menuKey: '/dashboard',
      menuParent: '',
    }
  })

  afterEach(async () => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount()
    }
    await flushPromises()
  })

  it('only renders system menu entries that the current user can access', async () => {
    const wrapper = mountWithUser(['dashboard', 'print-templates'])
    await flushPromises()

    const pageText = wrapper.text()

    expect(menuMocks.listSystemMenus).toHaveBeenCalledTimes(1)
    expect(pageText).toContain('工作台')
    expect(pageText).toContain('打印模板')
    expect(pageText).not.toContain('API Key 管理')
  })

  it('shows role action editor entry when either merged menu is granted', async () => {
    menuMocks.listSystemMenus.mockResolvedValue([
      {
        menuCode: 'dashboard',
        menuName: '工作台',
        parentCode: null,
        routePath: '/dashboard',
        icon: 'HomeOutlined',
        sortOrder: 1,
        menuType: '菜单',
        actions: ['read'],
        children: [],
      },
      {
        menuCode: 'system',
        menuName: '系统设置',
        parentCode: null,
        routePath: null,
        icon: 'PrinterOutlined',
        sortOrder: 2,
        menuType: '目录',
        actions: [],
        children: [
          {
            menuCode: 'role-action-editor',
            menuName: '角色权限配置',
            parentCode: 'system',
            routePath: '/role-action-editor',
            icon: 'SafetyCertificateOutlined',
            sortOrder: 1,
            menuType: '菜单',
            actions: ['read'],
            children: [],
          },
        ],
      },
    ])

    const wrapper = mountWithUser(['dashboard', 'role-action-editor'])
    await flushPromises()

    expect(wrapper.text()).toContain('角色权限配置')
  })

  it('filters inaccessible modules in global search and routes to the selected result', async () => {
    businessMocks.listBusinessModule.mockImplementation(
      async (moduleKey: string) => {
        if (moduleKey === 'purchase-orders') {
          return {
            data: {
              rows: [
                {
                  id: 'purchase-order-1',
                  orderNo: 'CG20260001',
                  status: '已审核',
                },
              ],
            },
          }
        }

        return {
          data: {
            rows: [
              {
                id: 'sales-order-1',
                orderNo: 'XS20260001',
                status: '已审核',
              },
            ],
          },
        }
      },
    )

    const wrapper = mountWithUser(['dashboard', 'purchase-orders'])
    await flushPromises()

    const autoComplete = wrapper.findComponent({ name: 'AAutoComplete' })
    expect(autoComplete.exists()).toBe(true)

    autoComplete.vm.$emit('search', 'CG20260001')
    await flushPromises()

    expect(businessMocks.listBusinessModule).toHaveBeenCalledTimes(1)
    expect(businessMocks.listBusinessModule).toHaveBeenCalledWith(
      'purchase-orders',
      { keyword: 'CG20260001' },
      { currentPage: 1, pageSize: 6 },
    )

    autoComplete.vm.$emit('select', 'purchase-orders::CG20260001')
    await flushPromises()

    expect(routerMocks.push).toHaveBeenCalledWith({
      path: '/purchase-orders',
      query: {
        docNo: 'CG20260001',
        openDetail: '1',
      },
    })
  })

  it('shows password and 2fa sections in personal settings', async () => {
    const wrapper = mountWithUser(['dashboard'])
    await flushPromises()

    const settingsLink = wrapper.findAll('a').find((link) => link.text().includes('个人设置'))
    expect(settingsLink).toBeDefined()

    await settingsLink!.trigger('click')
    await flushPromises()

    const securityTab = Array.from(document.body.querySelectorAll<HTMLElement>('[role="tab"]'))
      .find((tab) => (tab.textContent || '').includes('账户安全'))
    expect(securityTab).toBeDefined()

    securityTab!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flushPromises()

    const pageText = document.body.textContent || ''
    expect(pageText).toContain('账户安全')
    expect(pageText).toContain('修改密码')
    expect(pageText).toContain('两步验证（2FA）')
  })
})
