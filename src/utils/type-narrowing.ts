/**
 * 类型收窄工具 — 运行时校验 + 容错，禁止裸 as 断言。
 * 所有 Record<string, unknown> 和 any 边界值必须经过这些函数收窄。
 */
import { z } from 'zod'

/** 安全转为 string，非字符串原语转为空串 */
export function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  return ''
}

/** 安全转为 number，无法解析返回 0 */
export function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof value === 'bigint') return Number(value)
  return 0
}

/** 安全转为 boolean */
export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === '1'
  if (typeof value === 'number') return value !== 0
  return false
}

/** 安全转为数组，非数组返回空数组 */
export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** 安全转为日期字符串 (YYYY-MM-DD) */
export function asDateString(value: unknown): string {
  const s = asString(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** 带 Schema 校验的安全解析，失败返回 undefined */
export function parseOrUndefined<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const result = schema.safeParse(value)
  return result.success ? result.data : undefined
}

/** 带 Schema 校验的安全解析，失败返回默认值 */
export function parseOrDefault<T>(schema: z.ZodType<T>, value: unknown, defaultValue: T): T {
  const result = schema.safeParse(value)
  return result.success ? result.data : defaultValue
}
