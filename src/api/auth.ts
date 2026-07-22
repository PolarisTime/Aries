import { z } from 'zod'
import { parseApiContract } from '@/api/api-contract'
import { apiGet, apiPost, assertApiSuccess } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { LoginPayload, LoginResponseData } from '@/shared/schemas'
import { apiResponseSchema, nullResponseSchema } from '@/shared/schemas/api'
import {
  loginPayloadSchema,
  loginResponseDataSchema,
} from '@/shared/schemas/auth'
import { getApiMessage } from '@/utils/api-messages'
import { refreshAccessToken } from './auth/auth-state'

const loginResponseSchema = apiResponseSchema(loginResponseDataSchema)
const healthResponseSchema = apiResponseSchema(z.object({ status: z.string() }))
const backendInfoResponseSchema = apiResponseSchema(
  z.object({
    app: z.string(),
    version: z.string(),
    gitCommit: z.string(),
    buildTime: z.string().nullable(),
  }),
)

export type HealthResponse = {
  status: string
}

export type BackendInfo = {
  app: string
  version: string
  gitCommit: string
  buildTime: string | null
}

export function login(payload: LoginPayload) {
  const validatedPayload = parseApiContract(
    loginPayloadSchema,
    payload,
    '登录请求',
  )
  return apiPost(ENDPOINTS.AUTH_LOGIN, loginResponseSchema, {
    loginName: validatedPayload.loginName,
    password: validatedPayload.password,
  })
}

export function logout() {
  return apiPost(ENDPOINTS.AUTH_LOGOUT, nullResponseSchema, {})
}

export async function refreshSession(): Promise<LoginResponseData> {
  return refreshAccessToken()
}

export async function fetchBackendHealth(): Promise<HealthResponse> {
  const response = await apiGet(ENDPOINTS.HEALTH, healthResponseSchema)
  return assertApiSuccess(response, getApiMessage('backendServiceUnavailable'))
    .data
}

export async function fetchBackendInfo(): Promise<BackendInfo> {
  const response = await apiGet(ENDPOINTS.VERSION, backendInfoResponseSchema)
  return assertApiSuccess(response, getApiMessage('backendServiceUnavailable'))
    .data
}
