import type { AxiosResponse } from 'axios'
import type { output, ZodType } from 'zod'
import { ERROR_CODE } from '@/constants/error-codes'
import { getApiMessage } from '@/utils/api-messages'
import { parseApiContract } from './api-contract'
import { setupAuthInterceptors } from './auth/auth-interceptor'
import { type ApiRequestConfig, http } from './http'

let authInterceptorsInitialized = false

export function ensureApiClientSetup() {
  if (authInterceptorsInitialized) {
    return
  }

  setupAuthInterceptors(http.instance)
  authInterceptorsInitialized = true
}

function isSuccessCode(code: unknown) {
  return Number(code) === ERROR_CODE.SUCCESS
}

export function assertApiSuccess<
  T extends { code?: number; message?: string; traceId?: string },
>(response: T, fallbackMessage?: string) {
  if (!isSuccessCode(response?.code)) {
    const err = new Error(
      response?.message || fallbackMessage || getApiMessage('requestFailed'),
    )
    if (response?.traceId) {
      ;(err as Error & { traceId: string }).traceId = response.traceId
    }
    throw err
  }

  return response
}

async function parseRequest<Schema extends ZodType>(
  request: Promise<unknown>,
  schema: Schema,
  context: string,
): Promise<output<Schema>> {
  return parseApiContract(schema, await request, context)
}

export function apiGet<Schema extends ZodType>(
  url: string,
  schema: Schema,
  config?: ApiRequestConfig,
): Promise<output<Schema>> {
  return parseRequest(http.get<unknown>(url, config), schema, `GET ${url}`)
}

export function apiPost<Schema extends ZodType>(
  url: string,
  schema: Schema,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<output<Schema>> {
  return parseRequest(
    http.post<unknown>(url, data, config),
    schema,
    `POST ${url}`,
  )
}

export function apiPut<Schema extends ZodType>(
  url: string,
  schema: Schema,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<output<Schema>> {
  return parseRequest(
    http.put<unknown>(url, data, config),
    schema,
    `PUT ${url}`,
  )
}

export function apiPatch<Schema extends ZodType>(
  url: string,
  schema: Schema,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<output<Schema>> {
  return parseRequest(
    http.patch<unknown>(url, data, config),
    schema,
    `PATCH ${url}`,
  )
}

export function apiDelete<Schema extends ZodType>(
  url: string,
  schema: Schema,
  config?: ApiRequestConfig,
): Promise<output<Schema>> {
  return parseRequest(
    http.delete<unknown>(url, config),
    schema,
    `DELETE ${url}`,
  )
}

export function downloadGet(
  url: string,
  config?: ApiRequestConfig,
): Promise<Blob> {
  return http.get<Blob>(url, { ...config, responseType: 'blob' })
}

export function downloadPost(
  url: string,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<Blob> {
  return http.post<Blob>(url, data, { ...config, responseType: 'blob' })
}

export function downloadPostResponse(
  url: string,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<AxiosResponse<Blob>> {
  return http.postResponse<Blob>(url, data, {
    ...config,
    responseType: 'blob',
  })
}
