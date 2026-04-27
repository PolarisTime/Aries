import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { loginWithBackend, primeRealAuthSession } from './real-session'
import { generateTotpCode } from './totp'

type LoginData = Awaited<ReturnType<typeof loginWithBackend>>

type SessionUserOverrides = Partial<LoginData['user']>

interface LeoListResponse<T extends Record<string, unknown>> {
  code: number
  message?: string
  data: {
    records: T[]
  }
}

interface LeoDetailResponse<T extends Record<string, unknown>> {
  code: number
  message?: string
  data: T
}

interface TotpSetupEnvelope {
  code: number
  message?: string
  data?: {
    qrCodeBase64: string
    secret: string
  }
}

const apiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:11211/api'

export function spacedLabelPattern(label: string) {
  return new RegExp(label.split('').join('\\s*'))
}

export function getButton(page: Page, label: string) {
  return page.getByRole('button', { name: spacedLabelPattern(label) })
}

export async function primeRealSessionWithUserOverrides(
  page: Page,
  userOverrides: SessionUserOverrides,
  loginData?: LoginData,
) {
  const session = loginData || await loginWithBackend(page.request)
  const mergedSession = {
    ...session,
    user: {
      ...session.user,
      ...userOverrides,
    },
  }

  await primeRealAuthSession(page, mergedSession)
  return mergedSession
}

export async function listModuleRecords(
  request: APIRequestContext,
  accessToken: string,
  apiPath: string,
  options?: {
    page?: number
    size?: number
    query?: Record<string, string | number | undefined>
  },
) {
  const params = new URLSearchParams()
  params.set('page', String(options?.page ?? 0))
  params.set('size', String(options?.size ?? 5))
  Object.entries(options?.query || {}).forEach(([key, value]) => {
    if (value != null && String(value).trim()) {
      params.set(key, String(value))
    }
  })

  const response = await request.get(`${apiBaseUrl}/${apiPath}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as LeoListResponse<Record<string, unknown>>
  expect(payload.code, payload.message || `${apiPath} 列表加载失败`).toBe(0)
  return Array.isArray(payload.data?.records) ? payload.data.records : []
}

export async function getModuleDetail(
  request: APIRequestContext,
  accessToken: string,
  apiPath: string,
  id: string,
) {
  const response = await request.get(`${apiBaseUrl}/${apiPath}/${encodeURIComponent(id)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as LeoDetailResponse<Record<string, unknown>>
  expect(payload.code, payload.message || `${apiPath} 详情加载失败`).toBe(0)
  return payload.data || null
}

export function getSelectField(page: Page, fieldId: string) {
  return page
    .locator(`#${fieldId}`)
    .locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " ant-select ")][1]')
    .first()
}

export async function chooseModalSelect(page: Page, optionText: string) {
  const modal = page.locator('.ant-modal:visible').last()
  const select = modal.locator('.ant-select').first()
  await select.click()
  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible()
  await dropdown.locator('.ant-select-item-option', { hasText: optionText }).first().click()
}

export async function openSelectAndChoose(page: Page, fieldId: string, optionText: string) {
  const select = getSelectField(page, fieldId)
  await select.click({ force: true })

  const dropdown = page.locator('.ant-select-dropdown:visible').last()
  await expect(dropdown).toBeVisible()
  await dropdown.locator('.ant-select-item-option', { hasText: optionText }).first().click()
  await expect(select).toContainText(optionText)
}

export async function expectSelectValue(page: Page, fieldId: string, optionText: string) {
  await expect(getSelectField(page, fieldId)).toContainText(optionText)
}

export async function fillDateInput(page: Page, fieldId: string, value: string) {
  const input = page.locator(`#${fieldId}`)
  await input.click()
  await input.fill(value)
  await input.blur()
}

export async function setupAndEnable2fa(
  request: APIRequestContext,
  accessToken: string,
  userId: string | number,
) {
  const setupResponse = await request.post(`${apiBaseUrl}/user-accounts/${userId}/2fa/setup`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(setupResponse.ok()).toBeTruthy()

  const setupPayload = (await setupResponse.json()) as TotpSetupEnvelope
  expect(setupPayload.code, setupPayload.message || '生成 2FA 密钥失败').toBe(0)
  const secret = String(setupPayload.data?.secret || '')
  expect(secret).toBeTruthy()

  const totpCode = generateTotpCode(secret)
  const enableResponse = await request.post(`${apiBaseUrl}/user-accounts/${userId}/2fa/enable`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    data: {
      totpCode,
    },
  })
  expect(enableResponse.ok()).toBeTruthy()

  return secret
}

export async function disable2fa(
  request: APIRequestContext,
  accessToken: string,
  userId: string | number,
) {
  const response = await request.post(`${apiBaseUrl}/user-accounts/${userId}/2fa/disable`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  expect(response.ok()).toBeTruthy()
}

export type { LoginData, SessionUserOverrides }
