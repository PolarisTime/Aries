/**
 * 类型安全 API 客户端 —— Zod Schema 校验 + 类型收窄
 *
 * 用法：
 *   import { z } from 'zod'
 *   import { typedPost, typedGet } from '@/api/typed-client'
 *   import { moduleRecordSchema } from '@/shared/schemas'
 *
 *   const result = await typedPost('/purchase-order', payload, moduleRecordSchema)
 *   // result 类型为 ModuleRecord，运行时已通过 Zod 校验
 */
import { z } from 'zod'
import { http } from './http'
import { assertApiSuccess } from './client'
import type { ApiResponse } from '@/shared/schemas'

// ── 类型安全的 POST ────────────────────────────────────

export async function typedPost<T extends z.ZodTypeAny>(
  url: string,
  data: unknown,
  responseSchema: T,
): Promise<z.infer<T>> {
  const response = assertApiSuccess(
    await http.post<ApiResponse<unknown>>(url, data),
  )
  const parsed = responseSchema.safeParse(response.data)
  if (!parsed.success) {
    console.error('[typedPost] Schema validation failed for', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data as z.infer<T>
}

export async function typedPut<T extends z.ZodTypeAny>(
  url: string,
  data: unknown,
  responseSchema: T,
): Promise<z.infer<T>> {
  const response = assertApiSuccess(
    await http.put<ApiResponse<unknown>>(url, data),
  )
  const parsed = responseSchema.safeParse(response.data)
  if (!parsed.success) {
    console.error('[typedPut] Schema validation failed for', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data as z.infer<T>
}

// ── 类型安全的 GET ─────────────────────────────────────

export async function typedGet<T extends z.ZodTypeAny>(
  url: string,
  params: Record<string, unknown> | undefined,
  responseSchema: T,
): Promise<z.infer<T>> {
  const response = assertApiSuccess(
    await http.get<ApiResponse<unknown>>(url, { params }),
  )
  const parsed = responseSchema.safeParse(response.data)
  if (!parsed.success) {
    console.error('[typedGet] Schema validation failed for', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data as z.infer<T>
}

// ── 类型安全的 DELETE ──────────────────────────────────

export async function typedDelete<T extends z.ZodTypeAny>(
  url: string,
  params: Record<string, unknown> | undefined,
  responseSchema: T,
): Promise<z.infer<T>> {
  const response = assertApiSuccess(
    await http.delete<ApiResponse<unknown>>(url, { params }),
  )
  const parsed = responseSchema.safeParse(response.data)
  if (!parsed.success) {
    console.error('[typedDelete] Schema validation failed for', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data as z.infer<T>
}

// ── 分页查询 ───────────────────────────────────────────

import { pagedResultSchema } from '@/shared/schemas'
import type { PagedResult } from '@/shared/schemas'

export async function typedPage<T extends z.ZodTypeAny>(
  url: string,
  params: Record<string, unknown> | undefined,
  rowSchema: T,
): Promise<PagedResult<z.infer<T>>> {
  const schema = pagedResultSchema(rowSchema)
  const response = assertApiSuccess(
    await http.get<ApiResponse<unknown>>(url, { params }),
  )
  const parsed = schema.safeParse(response.data)
  if (!parsed.success) {
    console.error('[typedPage] Schema validation failed for', url, parsed.error.issues)
    throw new Error(`分页数据校验失败: ${url}`)
  }
  return parsed.data as PagedResult<z.infer<T>>
}
