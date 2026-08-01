import type { AxiosResponse } from 'axios'
import type { output, ZodType } from 'zod'
import { setupAuthInterceptors } from '@/api/auth/auth-interceptor'
import { parseApiContract } from '@/api/core/api-contract'
import { type ApiRequestConfig, http } from '@/api/core/http'

let authInterceptorsInitialized = false

export function ensureApiClientSetup() {
  if (authInterceptorsInitialized) {
    return
  }

  setupAuthInterceptors(http.instance)
  authInterceptorsInitialized = true
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

export async function apiPostNoContent(
  url: string,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<void> {
  await http.post<unknown>(url, data, config)
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

export async function apiPutNoContent(
  url: string,
  data?: unknown,
  config?: ApiRequestConfig,
): Promise<void> {
  await http.put<unknown>(url, data, config)
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

export async function apiDeleteNoContent(
  url: string,
  config?: ApiRequestConfig,
): Promise<void> {
  await http.delete<unknown>(url, config)
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
