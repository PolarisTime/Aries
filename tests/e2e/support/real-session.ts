import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { generateTotpCode } from './totp'

const STORAGE_KEYS = {
  token: 'aries-token',
  user: 'aries-user',
  authPersistence: 'aries-auth-persistence',
} as const

const apiBaseUrl = process.env.E2E_API_BASE_URL || 'http://127.0.0.1:11211/api'

export const realAdminCredentials = {
  loginName: process.env.E2E_LOGIN_NAME || 'admin',
  password: process.env.E2E_LOGIN_PASSWORD || '123456',
}

interface RealLoginUser {
  id: number | string
  loginName: string
  userName?: string
  roleName?: string
  totpEnabled?: boolean
  menuCodes?: string[]
  actionMap?: Record<string, string[]>
}

interface RealLoginResponseData {
  accessToken: string
  tokenType: string
  expiresIn: number | string
  user: RealLoginUser
}

interface RealLoginEnvelope {
  code: number
  message?: string
  data?: RealLoginResponseData | RealLoginStep1Data
}

interface RealLoginStep1Data {
  requires2fa: boolean
  tempToken: string
}

interface LoginWithBackendOptions {
  totpSecret?: string
}

const realAdminTotpSecret = process.env.E2E_TOTP_SECRET

export async function loginWithBackend(
  request: APIRequestContext,
  credentials = realAdminCredentials,
  options: LoginWithBackendOptions = {},
) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: credentials,
  })
  expect(response.ok()).toBeTruthy()

  const payload = (await response.json()) as RealLoginEnvelope
  expect(payload.code, payload.message || '登录失败').toBe(0)
  const data = payload.data
  expect(data, '登录响应缺少 data').toBeTruthy()

  if (isStep1Response(data)) {
    const totpSecret = options.totpSecret || realAdminTotpSecret
    expect(totpSecret, '联调账号要求 2FA，但未提供 E2E_TOTP_SECRET').toBeTruthy()

    const secondStepResponse = await request.post(`${apiBaseUrl}/auth/login-2fa`, {
      data: {
        tempToken: data.tempToken,
        totpCode: generateTotpCode(String(totpSecret)),
      },
    })
    expect(secondStepResponse.ok()).toBeTruthy()

    const secondStepPayload = (await secondStepResponse.json()) as RealLoginEnvelope
    expect(secondStepPayload.code, secondStepPayload.message || '2FA 登录失败').toBe(0)
    expect(isTokenResponse(secondStepPayload.data), '2FA 登录响应缺少 accessToken').toBeTruthy()
    return secondStepPayload.data as RealLoginResponseData
  }

  expect(isTokenResponse(data), '登录响应缺少 accessToken').toBeTruthy()

  return data
}

export async function primeRealAuthSession(
  page: Page,
  loginData?: RealLoginResponseData,
) {
  const session = loginData || await loginWithBackend(page.request)

  await page.addInitScript(({ storageKeys, token, user }) => {
    localStorage.setItem(storageKeys.token, token)
    localStorage.setItem(storageKeys.user, JSON.stringify(user))
    localStorage.setItem(storageKeys.authPersistence, 'local')
  }, {
    storageKeys: STORAGE_KEYS,
    token: session.accessToken,
    user: session.user,
  })

  return session
}

function isStep1Response(data: RealLoginEnvelope['data']): data is RealLoginStep1Data {
  return Boolean(data && 'requires2fa' in data && data.requires2fa)
}

function isTokenResponse(data: RealLoginEnvelope['data']): data is RealLoginResponseData {
  return Boolean(data && 'accessToken' in data && data.accessToken && 'user' in data && data.user)
}
