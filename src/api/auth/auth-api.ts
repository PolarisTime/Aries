import { z } from 'zod'
import { refreshAccessToken } from '@/api/auth/auth-state'
import { parseApiContract } from '@/api/core/api-contract'
import { apiGet, apiPost, apiPostNoContent } from '@/api/core/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { LoginPayload, LoginResponseData } from '@/shared/schemas'
import {
  loginPayloadSchema,
  loginResponseDataSchema,
} from '@/shared/schemas/auth'

const healthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
})
const backendInfoResponseSchema = z.object({
  app: z.string(),
  version: z.string(),
  gitCommit: z.string(),
  buildTime: z.string().nullable(),
})

export type HealthResponse = {
  status: string
  timestamp: string
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
  return apiPost(ENDPOINTS.AUTH_LOGIN, loginResponseDataSchema, {
    loginName: validatedPayload.loginName,
    password: validatedPayload.password,
  })
}

export function logout() {
  return apiPostNoContent(ENDPOINTS.AUTH_LOGOUT, {})
}

export async function refreshSession(): Promise<LoginResponseData> {
  return refreshAccessToken()
}

export async function fetchBackendHealth(): Promise<HealthResponse> {
  return apiGet(ENDPOINTS.HEALTH, healthResponseSchema)
}

export async function fetchBackendInfo(): Promise<BackendInfo> {
  return apiGet(ENDPOINTS.VERSION, backendInfoResponseSchema)
}
