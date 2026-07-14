import type { Page } from '@playwright/test'
import { isRealBackendMode, primeApiKeySession } from './support/api-key'
import { expect, test } from './support/test'

type ApiPayload<T> = {
  code?: number
  data?: T
  message?: string
}

const startupApiPaths = [
  '/dashboard/summary',
  '/suppliers/options',
  '/customers/options',
  '/carriers/options',
  '/warehouses/options',
  '/material-categories/options',
  '/company-settings/options',
] as const

function waitForApiResponse(page: Page, path: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      new URL(response.url()).pathname === `/api${path}`,
  )
}

test.describe('dashboard backend contract', () => {
  test.skip(!isRealBackendMode(), '仅真实后端模式验证前后端契约')

  test('loads dashboard with startup option endpoints from the backend', async ({
    page,
    assertNoFatalUiErrors,
  }) => {
    const responsePromises = startupApiPaths.map((path) =>
      waitForApiResponse(page, path),
    )

    await primeApiKeySession(page)

    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
    const responses = await Promise.all(responsePromises)
    const payloads = await Promise.all(
      responses.map(async (response) => {
        expect(
          response.ok(),
          `${response.url()} returned ${response.status()}`,
        ).toBe(true)
        return (await response.json()) as ApiPayload<unknown>
      }),
    )

    for (const [index, payload] of payloads.entries()) {
      expect(payload.code, `${startupApiPaths[index]} code`).toBe(0)
    }

    const dashboardPayload = payloads[0] as ApiPayload<{
      loginName?: string
      serverTime?: string | number
    }>
    expect(dashboardPayload.data?.loginName).toEqual(expect.any(String))
    const serverTime = dashboardPayload.data?.serverTime
    expect(
      typeof serverTime === 'string' ||
        (typeof serverTime === 'number' && Number.isFinite(serverTime)),
    ).toBe(true)

    for (const [index, payload] of payloads.slice(1).entries()) {
      const path = startupApiPaths[index + 1]
      const data = payload.data as unknown[]
      expect(Array.isArray(data), `${path} data`).toBe(true)
      if (data.length > 0) {
        const first = data[0] as Record<string, unknown>
        if (path === '/company-settings/options') {
          expect(first.id, `${path} id`).toBeDefined()
          expect(first.companyName, `${path} companyName`).toEqual(
            expect.any(String),
          )
        } else {
          expect(first.label, `${path} label`).toEqual(expect.any(String))
          expect(first.value, `${path} value`).toEqual(expect.any(String))
        }
      }
    }

    await assertNoFatalUiErrors()
  })
})
