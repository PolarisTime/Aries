/**
 * 类型安全 API 客户端 —— Zod Schema 运行时校验 + TS 类型自动推导。
 *
 * 用法：
 *   const result = await typedPost('/purchase-order', payload, purchaseOrderItemSchema)
 *   // result 类型为 PurchaseOrderItem（由 z.infer 推导），且已通过运行时 Zod 校验
 */
import { z } from 'zod'
import { http } from './http'
import { assertApiSuccess } from './client'
import { pagedResultSchema, type ApiResponse, type PagedResult } from '@/shared/schemas'

// ── POST ────────────────────────────────────────────────

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
    console.error('[typedPost] Schema mismatch', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data
}

// ── PUT ─────────────────────────────────────────────────

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
    console.error('[typedPut] Schema mismatch', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data
}

// ── GET ─────────────────────────────────────────────────

/** params 允许 Record<string, unknown> — 网络边界原始数据，Schema 校验在响应侧 */
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
    console.error('[typedGet] Schema mismatch', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data
}

// ── DELETE ──────────────────────────────────────────────

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
    console.error('[typedDelete] Schema mismatch', url, parsed.error.issues)
    throw new Error(`响应数据校验失败: ${url}`)
  }
  return parsed.data
}

// ── 分页查询 ────────────────────────────────────────────

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
    console.error('[typedPage] Schema mismatch', url, parsed.error.issues)
    throw new Error(`分页数据校验失败: ${url}`)
  }
  return parsed.data
}
