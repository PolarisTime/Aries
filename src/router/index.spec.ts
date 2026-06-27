import { beforeEach, describe, expect, it, vi } from 'vitest'

const rootRouteOptions: { current: Record<string, any> | null } = {
  current: null,
}
const routeOptionsByPath = new Map<string, Record<string, any>>()
const routeOptionsById = new Map<string, Record<string, any>>()

function createMockRoute(): any {
  return {
    addChildren: vi.fn().mockImplementation(() => createMockRoute()),
  }
}

vi.mock('@tanstack/react-router', () => ({
  createBrowserHistory: vi.fn().mockReturnValue({}),
  createRootRoute: vi.fn().mockImplementation((opts: Record<string, any>) => {
    rootRouteOptions.current = opts
    return createMockRoute()
  }),
  createRoute: vi.fn().mockImplementation((opts: Record<string, any>) => {
    if (opts.path) routeOptionsByPath.set(opts.path, opts)
    if (opts.id) routeOptionsById.set(opts.id, opts)
    return createMockRoute()
  }),
  createRouter: vi.fn().mockReturnValue({}),
  Outlet: () => null,
  redirect: vi.fn().mockImplementation((opts: { to: string }) => {
    const error = new Error('redirect')
    Object.assign(error, opts)
    return error
  }),
}))

vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    lazy: vi.fn().mockImplementation((fn: () => unknown) => fn),
  }
})

vi.mock('@/api/business-listing', () => ({
  listBusinessModule: vi.fn(),
}))

const mockGetInitialSetupStatus = vi.fn()
vi.mock('@/api/setup', () => ({
  getInitialSetupStatus: (...args: unknown[]) =>
    mockGetInitialSetupStatus(...args),
}))

vi.mock('@/config/business-page-loader', () => ({
  loadBusinessPageConfig: vi.fn(),
}))

vi.mock('@/views/auth/InitialSetupView', () => ({
  InitialSetupView: () => null,
}))
vi.mock('@/views/auth/SetupTwoFactorView', () => ({
  SetupTwoFactorView: () => null,
}))
vi.mock('@/layouts/AppLayout', () => ({
  AppLayout: () => null,
}))
vi.mock('@/views/modules/BusinessGridView', () => ({
  BusinessGridView: () => null,
}))
vi.mock('@/views/system/NumberRulesView', () => ({
  NumberRulesView: () => null,
}))
vi.mock('@/views/system/GeneralSettingsView', () => ({
  GeneralSettingsView: () => null,
}))
vi.mock('@/views/system/SystemParametersView', () => ({
  SystemParametersView: () => null,
}))
vi.mock('@/views/system/CompanySettingsView', () => ({
  CompanySettingsView: () => null,
}))
vi.mock('@/views/system/PrintTemplateView', () => ({
  PrintTemplateView: () => null,
}))
vi.mock('@/views/system/SessionManagementView', () => ({
  SessionManagementView: () => null,
}))
vi.mock('@/views/system/ApiKeyManagementView', () => ({
  ApiKeyManagementView: () => null,
}))
vi.mock('@/views/system/SecurityCenterView', () => ({
  SecurityCenterView: () => null,
}))
vi.mock('@/views/system/AccessControlView', () => ({
  AccessControlView: () => null,
}))
vi.mock('@/views/system/SecurityKeyManagementView', () => ({
  SecurityKeyManagementView: () => null,
}))
vi.mock('@/views/system/DatabaseBackupView', () => ({
  DatabaseBackupView: () => null,
}))
vi.mock('@/views/system/ApiKeyDetailView', () => ({
  ApiKeyDetailView: () => null,
}))
vi.mock('@/views/error/NotFoundView', () => ({
  NotFoundView: () => null,
}))
vi.mock('@/views/error/ErrorView', () => ({
  ErrorView: () => null,
}))
vi.mock('@/views/modules/components/BusinessGridPageSkeleton', () => ({
  BusinessGridPageSkeleton: () => null,
}))

const mockPageDefinitions = [
  {
    key: 'dashboard',
    view: 'dashboard' as const,
    path: 'dashboard',
    title: 'Dashboard',
    menuKey: '/dashboard',
    icon: 'dashboard',
  },
  {
    key: 'customer',
    view: 'business-grid' as const,
    moduleKey: 'customer',
    resourceKey: 'customer',
    path: 'customer',
    title: 'Customer',
    menuKey: '/customer',
    icon: 'customer',
  },
  {
    key: 'general-setting',
    view: 'general-setting' as const,
    resourceKey: 'general-setting',
    path: 'general-setting',
    title: 'General Setting',
    menuKey: '/general-setting',
    icon: 'setting',
  },
  {
    key: 'system-parameters',
    view: 'system-parameters' as const,
    accessResources: ['general-setting'],
    path: 'system-parameters',
    title: 'System Parameters',
    menuKey: '/system-parameters',
    icon: 'setting',
  },
  {
    key: 'access-control',
    view: 'access-control' as const,
    accessResources: ['permission:read', 'role:read'],
    path: 'access-control',
    title: 'Access Control',
    menuKey: '/access-control',
    icon: 'lock',
  },
  {
    key: 'security-center',
    view: 'security-center' as const,
    accessResources: ['session', 'api-key', 'security-key'],
    path: 'security-center',
    title: 'Security Center',
    menuKey: '/security-center',
    icon: 'safety',
  },
]

vi.mock('@/config/page-registry', () => ({
  appPageDefinitions: mockPageDefinitions,
  getPageRoutePath: vi.fn().mockImplementation((def: any) => def.path),
  type: {},
}))

vi.mock('@/constants/query-keys', () => ({
  QUERY_KEYS: {
    businessGridPage: vi.fn().mockReturnValue(['business-grid', 'customer']),
  },
}))

vi.mock('@/lib/query-client', () => ({
  queryClient: {
    ensureQueryData: vi.fn(),
  },
}))

const mockAuthGetState = vi.fn()
vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => mockAuthGetState(),
  },
}))

const mockPermissionCan = vi.fn()
const mockPermissionGetState = vi.fn()
vi.mock('@/stores/permissionStore', () => ({
  usePermissionStore: {
    getState: () => mockPermissionGetState(),
  },
  checkAccessResources: vi
    .fn()
    .mockImplementation(
      (resources: string[], can: (r: string, a: string) => boolean) =>
        resources.some((entry) => {
          const [resource, action = 'read'] = entry.split(':')
          return can(resource, action)
        }),
    ),
}))

vi.mock('@/utils/type-narrowing', () => ({
  asString: vi.fn().mockImplementation((val: unknown) => String(val)),
}))

vi.mock('@/views/auth/LazyLoginView', () => ({
  LazyLoginView: () => null,
}))

vi.mock('@/views/dashboard/LazyDashboardView', () => ({
  LazyDashboardView: () => null,
}))

beforeEach(() => {
  vi.resetModules()
  rootRouteOptions.current = null
  routeOptionsByPath.clear()
  routeOptionsById.clear()

  mockGetInitialSetupStatus.mockReset()
  mockGetInitialSetupStatus.mockResolvedValue({
    data: { setupRequired: false },
  })

  mockAuthGetState.mockReset()
  mockAuthGetState.mockReturnValue({ isAuthenticated: true })

  mockPermissionCan.mockReset()
  mockPermissionCan.mockReturnValue(true)

  mockPermissionGetState.mockReset()
  mockPermissionGetState.mockReturnValue({
    can: (...args: unknown[]) => mockPermissionCan(...args),
  })
})

async function importRouter() {
  return await import('@/router/index')
}

describe('router', () => {
  it('exports router instance', async () => {
    const { router } = await importRouter()
    expect(router).toBeDefined()
  })

  it('creates browser history', async () => {
    const { createBrowserHistory } = await import('@tanstack/react-router')
    await importRouter()
    expect(createBrowserHistory).toHaveBeenCalled()
  })

  it('creates root route', async () => {
    const { createRootRoute } = await import('@tanstack/react-router')
    await importRouter()
    expect(createRootRoute).toHaveBeenCalled()
  })

  it('creates router with correct options', async () => {
    const { createRouter } = await import('@tanstack/react-router')
    await importRouter()
    expect(createRouter).toHaveBeenCalledWith(
      expect.objectContaining({
        routeTree: expect.anything(),
        history: expect.anything(),
        defaultPreload: 'intent',
        defaultPendingMs: 100,
      }),
    )
  })

  it('creates all expected routes', async () => {
    await importRouter()
    expect(routeOptionsByPath.has('/login')).toBe(true)
    expect(routeOptionsByPath.has('/setup')).toBe(true)
    expect(routeOptionsByPath.has('/setup-2fa')).toBe(true)
    expect(routeOptionsByPath.has('/')).toBe(true)
    expect(routeOptionsByPath.has('*')).toBe(true)
    expect(routeOptionsById.has('authenticated-layout')).toBe(true)
  })

  it('creates module routes from page definitions', async () => {
    await importRouter()
    expect(routeOptionsByPath.has('/dashboard')).toBe(true)
    expect(routeOptionsByPath.has('/customer')).toBe(true)
    expect(routeOptionsByPath.has('/general-setting')).toBe(true)
    expect(routeOptionsByPath.has('/system-parameters')).toBe(true)
    expect(routeOptionsByPath.has('/access-control')).toBe(true)
    expect(routeOptionsByPath.has('/security-center')).toBe(true)
  })

  it('creates api-key detail route', async () => {
    await importRouter()
    expect(routeOptionsByPath.has('/api-key/$id')).toBe(true)
  })

  describe('root route beforeLoad', () => {
    it('redirects to /setup when setup required and not on setup page', async () => {
      mockGetInitialSetupStatus.mockResolvedValue({
        data: { setupRequired: true },
      })
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/dashboard' },
        }),
      ).rejects.toMatchObject({ to: '/setup' })
    })

    it('redirects to /login when setup not required and on setup page', async () => {
      mockGetInitialSetupStatus.mockResolvedValue({
        data: { setupRequired: false },
      })
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/setup' },
        }),
      ).rejects.toMatchObject({ to: '/login' })
    })

    it('does not redirect when setup required and on setup page', async () => {
      mockGetInitialSetupStatus.mockResolvedValue({
        data: { setupRequired: true },
      })
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/setup' },
        }),
      ).resolves.toBeUndefined()
    })

    it('does not redirect when setup not required and not on setup page', async () => {
      mockGetInitialSetupStatus.mockResolvedValue({
        data: { setupRequired: false },
      })
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/dashboard' },
        }),
      ).resolves.toBeUndefined()
    })

    it('rethrows redirect errors from setup status API', async () => {
      const redirectError = Object.assign(new Error('redirect'), {
        to: '/somewhere',
      })
      mockGetInitialSetupStatus.mockRejectedValue(redirectError)
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/dashboard' },
        }),
      ).rejects.toMatchObject({ to: '/somewhere' })
    })

    it('redirects to /server-error on API error when not on setup page', async () => {
      mockGetInitialSetupStatus.mockRejectedValue(new Error('network error'))
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/dashboard' },
        }),
      ).rejects.toMatchObject({ to: '/server-error' })
    })

    it('keeps source path when redirecting to /server-error', async () => {
      mockGetInitialSetupStatus.mockRejectedValue(new Error('network error'))
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: {
            pathname: '/access-control',
            searchStr: 'tab=roles',
            hash: 'section',
          },
        }),
      ).rejects.toMatchObject({
        to: '/server-error',
        search: { from: '/access-control?tab=roles#section' },
      })
    })

    it('redirects to /server-error on API error when on setup page', async () => {
      mockGetInitialSetupStatus.mockRejectedValue(new Error('network error'))
      await importRouter()

      await expect(
        rootRouteOptions.current!.beforeLoad({
          location: { pathname: '/setup' },
        }),
      ).rejects.toMatchObject({ to: '/server-error' })
    })
  })

  describe('setup2fa route beforeLoad', () => {
    it('redirects to /login when not authenticated', async () => {
      mockAuthGetState.mockReturnValue({ isAuthenticated: false })
      await importRouter()
      const opts = routeOptionsByPath.get('/setup-2fa')!

      try {
        opts.beforeLoad()
        expect.fail('should have thrown')
      } catch (e: any) {
        expect(e).toMatchObject({ to: '/login' })
      }
    })

    it('does not redirect when authenticated', async () => {
      mockAuthGetState.mockReturnValue({ isAuthenticated: true })
      await importRouter()
      const opts = routeOptionsByPath.get('/setup-2fa')!

      expect(() => opts.beforeLoad()).not.toThrow()
    })
  })

  describe('authenticated layout route beforeLoad', () => {
    it('redirects to /login when not authenticated', async () => {
      mockAuthGetState.mockReturnValue({ isAuthenticated: false })
      await importRouter()
      const opts = routeOptionsById.get('authenticated-layout')!

      try {
        opts.beforeLoad()
        expect.fail('should have thrown')
      } catch (e: any) {
        expect(e).toMatchObject({ to: '/login' })
      }
    })

    it('does not redirect when authenticated', async () => {
      mockAuthGetState.mockReturnValue({ isAuthenticated: true })
      await importRouter()
      const opts = routeOptionsById.get('authenticated-layout')!

      expect(() => opts.beforeLoad()).not.toThrow()
    })
  })

  describe('index route beforeLoad', () => {
    it('always redirects to /dashboard', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/')!
      expect(() => opts.beforeLoad()).toThrow()
    })
  })

  describe('module routes beforeLoad', () => {
    it('skips permission check for dashboard', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/dashboard')!

      expect(() => opts.beforeLoad()).not.toThrow()
      expect(mockPermissionCan).not.toHaveBeenCalled()
    })

    it('redirects to / when permission denied', async () => {
      mockPermissionCan.mockReturnValue(false)
      await importRouter()
      const opts = routeOptionsByPath.get('/general-setting')!

      try {
        opts.beforeLoad()
        expect.fail('should have thrown')
      } catch (e: any) {
        expect(e).toMatchObject({ to: '/' })
      }
    })

    it('does not redirect when permission granted', async () => {
      mockPermissionCan.mockReturnValue(true)
      await importRouter()
      const opts = routeOptionsByPath.get('/general-setting')!

      expect(() => opts.beforeLoad()).not.toThrow()
      expect(mockPermissionCan).toHaveBeenCalledWith('general-setting', 'read')
    })

    it('checks accessResources when defined', async () => {
      mockPermissionCan.mockReturnValue(true)
      await importRouter()
      const opts = routeOptionsByPath.get('/access-control')!

      expect(() => opts.beforeLoad()).not.toThrow()
      expect(mockPermissionCan).toHaveBeenCalledWith('permission', 'read')
    })

    it('redirects when accessResources check fails', async () => {
      mockPermissionCan.mockReturnValue(false)
      await importRouter()
      const opts = routeOptionsByPath.get('/access-control')!

      try {
        opts.beforeLoad()
        expect.fail('should have thrown')
      } catch (e: any) {
        expect(e).toMatchObject({ to: '/' })
      }
    })

    it('falls back to def.key when resourceKey is undefined', async () => {
      const customerDef = mockPageDefinitions.find((d) => d.key === 'customer')!
      const orig = customerDef.resourceKey
      delete (customerDef as any).resourceKey

      mockPermissionCan.mockReturnValue(true)
      await importRouter()
      const opts = routeOptionsByPath.get('/customer')!

      expect(() => opts.beforeLoad()).not.toThrow()
      expect(mockPermissionCan).toHaveBeenCalledWith('customer', 'read')

      customerDef.resourceKey = orig
    })
  })

  describe('api-key detail route beforeLoad', () => {
    it('redirects to / when cannot read api-key', async () => {
      mockPermissionCan.mockReturnValue(false)
      await importRouter()
      const opts = routeOptionsByPath.get('/api-key/$id')!

      try {
        opts.beforeLoad()
        expect.fail('should have thrown')
      } catch (e: any) {
        expect(e).toMatchObject({ to: '/' })
      }
    })

    it('does not redirect when can read api-key', async () => {
      mockPermissionCan.mockReturnValue(true)
      await importRouter()
      const opts = routeOptionsByPath.get('/api-key/$id')!

      expect(() => opts.beforeLoad()).not.toThrow()
      expect(mockPermissionCan).toHaveBeenCalledWith('api-key', 'read')
    })
  })

  describe('business-grid loader', () => {
    it('loads config and returns it', async () => {
      const { loadBusinessPageConfig } = await import(
        '@/config/business-page-loader'
      )
      vi.mocked(loadBusinessPageConfig).mockResolvedValue({
        key: 'customer',
      } as any)
      const { queryClient } = await import('@/lib/query-client')
      vi.mocked(queryClient.ensureQueryData).mockResolvedValue({} as any)

      await importRouter()
      const opts = routeOptionsByPath.get('/customer')!
      const result = await opts.loader!()

      expect(loadBusinessPageConfig).toHaveBeenCalledWith('customer')
      expect(result).toEqual({ key: 'customer' })
    })

    it('prefetches data when user has read permission', async () => {
      mockPermissionCan.mockReturnValue(true)
      const { loadBusinessPageConfig } = await import(
        '@/config/business-page-loader'
      )
      vi.mocked(loadBusinessPageConfig).mockResolvedValue({
        key: 'customer',
      } as any)
      const { queryClient } = await import('@/lib/query-client')
      vi.mocked(queryClient.ensureQueryData).mockResolvedValue({} as any)

      await importRouter()
      const opts = routeOptionsByPath.get('/customer')!
      await opts.loader!()

      expect(queryClient.ensureQueryData).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['business-grid', 'customer'],
          staleTime: 60_000,
        }),
      )
    })

    it('skips prefetch when user lacks permission', async () => {
      mockPermissionCan.mockReturnValue(false)
      const { loadBusinessPageConfig } = await import(
        '@/config/business-page-loader'
      )
      vi.mocked(loadBusinessPageConfig).mockResolvedValue({
        key: 'customer',
      } as any)

      await importRouter()
      const { queryClient } = await import('@/lib/query-client')
      vi.mocked(queryClient.ensureQueryData).mockClear()

      const opts = routeOptionsByPath.get('/customer')!
      await opts.loader!()

      expect(queryClient.ensureQueryData).not.toHaveBeenCalled()
    })

    it('swallows prefetch errors gracefully', async () => {
      mockPermissionCan.mockReturnValue(true)
      const { loadBusinessPageConfig } = await import(
        '@/config/business-page-loader'
      )
      vi.mocked(loadBusinessPageConfig).mockResolvedValue({
        key: 'customer',
      } as any)
      const { queryClient } = await import('@/lib/query-client')
      vi.mocked(queryClient.ensureQueryData).mockRejectedValue(
        new Error('fail'),
      )

      await importRouter()
      const opts = routeOptionsByPath.get('/customer')!

      await expect(opts.loader!()).resolves.toEqual({ key: 'customer' })
    })

    it('does not have loader for non-business-grid views', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/general-setting')!
      expect(opts.loader).toBeUndefined()
    })

    it('does not have loader for dashboard view', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/dashboard')!
      expect(opts.loader).toBeUndefined()
    })
  })

  describe('lazy loading', () => {
    it('lazy loads setup component', async () => {
      await importRouter()
      const component = routeOptionsByPath.get('/setup')!.component
      expect(component).toBeDefined()
      expect(typeof component).toBe('function')
      const mod = await component()
      expect(mod).toHaveProperty('default')
    })

    it('lazy loads setup-2fa component', async () => {
      await importRouter()
      const component = routeOptionsByPath.get('/setup-2fa')!.component
      expect(component).toBeDefined()
      const mod = await component()
      expect(mod).toHaveProperty('default')
    })

    it('lazy loads authenticated layout component', async () => {
      await importRouter()
      const component = routeOptionsById.get('authenticated-layout')!.component
      expect(component).toBeDefined()
      const mod = await component()
      expect(mod).toHaveProperty('default')
    })

    it('lazy loads not found component', async () => {
      await importRouter()
      const component = routeOptionsByPath.get('*')!.component
      expect(component).toBeDefined()
      const mod = await component()
      expect(mod).toHaveProperty('default')
    })

    it('lazy loads api-key detail component', async () => {
      await importRouter()
      const component = routeOptionsByPath.get('/api-key/$id')!.component
      expect(component).toBeDefined()
      const mod = await component()
      expect(mod).toHaveProperty('default')
    })

    it('lazy loads module view components', async () => {
      await importRouter()
      const customerComponent = routeOptionsByPath.get('/customer')!.component
      expect(customerComponent).toBeDefined()
      const customerMod = await customerComponent()
      expect(customerMod).toHaveProperty('default')

      const generalComponent =
        routeOptionsByPath.get('/general-setting')!.component
      expect(generalComponent).toBeDefined()
      const generalMod = await generalComponent()
      expect(generalMod).toHaveProperty('default')

      const accessComponent =
        routeOptionsByPath.get('/access-control')!.component
      expect(accessComponent).toBeDefined()
      const accessMod = await accessComponent()
      expect(accessMod).toHaveProperty('default')

      const systemParametersComponent =
        routeOptionsByPath.get('/system-parameters')!.component
      expect(systemParametersComponent).toBeDefined()
      const systemParametersMod = await systemParametersComponent()
      expect(systemParametersMod).toHaveProperty('default')

      const securityCenterComponent =
        routeOptionsByPath.get('/security-center')!.component
      expect(securityCenterComponent).toBeDefined()
      const securityCenterMod = await securityCenterComponent()
      expect(securityCenterMod).toHaveProperty('default')
    })
  })

  describe('route tree', () => {
    it('root route uses Outlet component', async () => {
      await importRouter()
      expect(rootRouteOptions.current!.component).toBeDefined()
    })

    it('assembles route tree with addChildren', async () => {
      const { createRootRoute } = await import('@tanstack/react-router')
      await importRouter()
      const rootInstance = vi.mocked(createRootRoute).mock.results[0].value
      expect(rootInstance.addChildren).toHaveBeenCalled()
    })

    it('login route has correct path and parent', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/login')!
      expect(opts.path).toBe('/login')
      expect(opts.getParentRoute()).toBeDefined()
    })

    it('index route has correct path and parent', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/')!
      expect(opts.path).toBe('/')
      expect(opts.getParentRoute()).toBeDefined()
    })

    it('not found route has correct path and parent', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('*')!
      expect(opts.path).toBe('*')
      expect(opts.getParentRoute()).toBeDefined()
    })

    it('setup route has correct path and parent', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/setup')!
      expect(opts.path).toBe('/setup')
      expect(opts.getParentRoute()).toBeDefined()
    })

    it('setup-2fa route has correct path and parent', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/setup-2fa')!
      expect(opts.path).toBe('/setup-2fa')
      expect(opts.getParentRoute()).toBeDefined()
    })

    it('authenticated layout route has id and parent', async () => {
      await importRouter()
      const opts = routeOptionsById.get('authenticated-layout')!
      expect(opts.id).toBe('authenticated-layout')
      expect(opts.getParentRoute()).toBeDefined()
    })

    it('module routes have authenticated layout as parent', async () => {
      await importRouter()
      const dashboardOpts = routeOptionsByPath.get('/dashboard')!
      expect(dashboardOpts.getParentRoute).toBeInstanceOf(Function)

      const customerOpts = routeOptionsByPath.get('/customer')!
      expect(customerOpts.getParentRoute).toBeInstanceOf(Function)
    })

    it('api-key detail route has authenticated layout as parent', async () => {
      await importRouter()
      const opts = routeOptionsByPath.get('/api-key/$id')!
      expect(opts.getParentRoute).toBeInstanceOf(Function)
    })

    it('creates router with lazy default components', async () => {
      const { createRouter } = await import('@tanstack/react-router')
      await importRouter()
      const routerOpts = vi.mocked(createRouter).mock.calls[0][0]

      expect(routerOpts.defaultPendingComponent).toBeDefined()
      expect(routerOpts.defaultErrorComponent).toBeDefined()
      expect(routerOpts.defaultNotFoundComponent).toBeDefined()

      const pendingMod = await routerOpts.defaultPendingComponent()
      expect(pendingMod).toHaveProperty('default')

      const errorMod = await routerOpts.defaultErrorComponent()
      expect(errorMod).toHaveProperty('default')

      const notFoundMod = await routerOpts.defaultNotFoundComponent()
      expect(notFoundMod).toHaveProperty('default')
    })
  })
})
