import { dashboardRoute } from './support/route-manifest'
import { expect, test } from './support/test'

const mockAccessToken = 'leo_route_edge_token'
const mockUser = {
  id: 'route-edge-user',
  loginName: 'route-edge-user',
  userName: 'Route Edge User',
  roleName: 'E2E',
  totpEnabled: true,
  forceTotpSetup: false,
  permissions: [
    {
      resource: 'dashboard',
      actions: ['read'],
    },
    {
      resource: 'ledger-adjustment',
      actions: ['read', 'create', 'update', 'delete', 'audit'],
    },
  ],
  dataScopes: {
    dashboard: 'all',
    'ledger-adjustment': 'all',
  },
} as const
const storageKeys = {
  token: 'aries-token',
  tokenExpiresAt: 'aries-token-expires-at',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
} as const

function jsonResponse(data: unknown) {
  return {
    contentType: 'application/json',
    body: JSON.stringify(data),
  }
}

async function mockRouteEdgeApis(page: import('@playwright/test').Page) {
  await page.route('**://*/api/**', (route) => {
    const requestUrl = new URL(route.request().url())
    const apiPath = requestUrl.pathname.replace(/^\/api/, '')

    if (apiPath === '/setup/status') {
      return route.fulfill(
        jsonResponse({
          code: 0,
          data: { setupRequired: false },
        }),
      )
    }

    if (apiPath === '/auth/refresh') {
      return route.fulfill(
        jsonResponse({
          code: 0,
          data: {
            accessToken: mockAccessToken,
            tokenType: 'Bearer',
            expiresIn: 1_800,
            refreshExpiresIn: 3_600,
            user: mockUser,
          },
        }),
      )
    }

    if (apiPath === '/health') {
      return route.fulfill(
        jsonResponse({
          code: 0,
          data: {
            status: 'UP',
            app: 'aries-e2e',
            version: 'test',
            traceId: 'route-edge',
            timestamp: new Date().toISOString(),
          },
        }),
      )
    }

    if (apiPath === '/ledger-adjustments') {
      return route.fulfill(
        jsonResponse({
          code: 0,
          data: {
            content: [],
            totalElements: 0,
            totalPages: 0,
            last: true,
          },
        }),
      )
    }

    return route.fulfill(
      jsonResponse({
        code: 0,
        data: [],
      }),
    )
  })
}

async function addMockAuthSession(page: import('@playwright/test').Page) {
  await page.addInitScript(
    ({ keys, token, user }) => {
      localStorage.setItem(keys.token, token)
      localStorage.setItem(keys.tokenExpiresAt, String(Date.now() + 1_800_000))
      localStorage.setItem(keys.user, JSON.stringify(user))
      localStorage.setItem(keys.authPersistence, 'local')
    },
    { keys: storageKeys, token: mockAccessToken, user: mockUser },
  )
}

async function primeMockAuthenticatedRoute(
  page: import('@playwright/test').Page,
) {
  await mockRouteEdgeApis(page)
  await addMockAuthSession(page)
}

test.describe('route edge coverage', () => {
  test('loads ledger adjustment page from registered route', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await primeMockAuthenticatedRoute(page)

    await page.goto('/ledger-adjustment')

    await expect(page).toHaveURL(/\/ledger-adjustment(?:\?|$)/)
    await expect(page.getByRole('main').first()).toContainText(
      /adjustmentNo|台账调整单/,
    )
    await expect(page.getByRole('main').first()).toContainText(
      /搜索关键词|Keyword/,
    )
    await assertNoFatalUiErrors()
  })

  test('redirects authenticated setup route back to login when setup is complete', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await mockRouteEdgeApis(page)

    await page.goto('/setup')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    await expect(
      page.getByRole('heading', { name: /登录系统|Sign In/i }),
    ).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('requires authentication before 2fa setup route', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await mockRouteEdgeApis(page)

    await page.goto('/setup-2fa')

    await expect(page).toHaveURL(/\/login(?:\?|$)/)
    await expect(
      page.getByRole('heading', { name: /登录系统|Sign In/i }),
    ).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('renders not found page for unknown routes', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await primeMockAuthenticatedRoute(page)

    await page.goto('/missing-e2e-route')

    await expect(page).toHaveURL(/\/missing-e2e-route(?:\?|$)/)
    await expect(page.locator('body')).toContainText('404')
    await assertNoFatalUiErrors()
  })

  test('renders server error route directly', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await page.goto('/server-error?from=%2Fdashboard')

    await expect(page).toHaveURL(/\/server-error\?from=%2Fdashboard$/)
    await expect(page.locator('body')).toContainText(
      /无法连接到服务器|Cannot Connect to Server/,
    )
    await expect(
      page.getByRole('button', { name: /重试|Retry/i }),
    ).toBeVisible()
    await assertNoFatalUiErrors()
  })

  test('dashboard route is represented in the e2e route manifest', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    await primeMockAuthenticatedRoute(page)

    await page.goto(dashboardRoute.path)

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    await expect(page.getByRole('main').first()).toContainText(
      /Steel Trading Business Platform|工作台/,
    )
    await assertNoFatalUiErrors()
  })
})
