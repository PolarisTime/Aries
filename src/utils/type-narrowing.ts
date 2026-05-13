/**
 * 类型收窄工具集 —— 运行时校验 + 容错回退，禁止裸 `as` 断言。
 *
 * 用法：
 *   import { asString, asNumber, asArray, parseOr } from '@/utils/type-narrowing'
 *
 *   // 旧: const name = record.customerName ?? ''  // no-base-to-string
 *   // 新: const name = asString(record.customerName)
 *
 *   // 旧: const qty = Number(record.quantity || 0)
 *   // 新: const qty = asNumber(record.quantity)
 */
import { z } from 'zod'

// ── 基础类型收窄 ──────────────────────────────────────

/** 安全转为 string。非字符串/数字/布尔/大整数原语 → '' */
export function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'bigint') return String(value)
  return ''
}

/** 安全转为 number。无法解析 → 0 */
export function asNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  if (typeof value === 'bigint') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** 安全转为 boolean */
export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === '1'
  if (typeof value === 'number') return value !== 0
  return false
}

/** 安全转为数组。非数组 → [] */
export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/** 安全转为日期字符串 (YYYY-MM-DD)。无效日期 → '' */
export function asDateString(value: unknown): string {
  const s = asString(value)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

// ── Schema 辅助 ───────────────────────────────────────

/** Zod Schema 安全解析，失败返回 undefined */
export function parseOr<T>(schema: z.ZodType<T>, value: unknown): T | undefined {
  const r = schema.safeParse(value)
  return r.success ? r.data : undefined
}

/** Zod Schema 安全解析，失败返回默认值 */
export function parseOrDefault<T>(schema: z.ZodType<T>, value: unknown, fallback: T): T {
  const r = schema.safeParse(value)
  return r.success ? r.data : fallback
}

// ── Record 安全访问器 ──────────────────────────────────

/**
 * 从 Record<string, unknown> 安全读取字段。
 * 用法：safe(record).str('name') / safe(record).num('qty')
 */
export function safe(record: Record<string, unknown> | null | undefined) {
  const src = record ?? {}
  return {
    str(key: string, fallback = '') {
      return key in src ? asString(src[key]) : fallback
    },
    num(key: string, fallback = 0) {
      return key in src ? asNumber(src[key]) : fallback
    },
    bool(key: string, fallback = false) {
      return key in src ? asBoolean(src[key]) : fallback
    },
    arr<T = unknown>(key: string, fallback: T[] = []) {
      return key in src ? asArray<T>(src[key]) : fallback
    },
    get<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
      if (!(key in src)) return fallback
      return parseOrDefault(schema, src[key], fallback)
    },
    raw(key: string): unknown {
      return src[key]
    },
  }
}

// ── ID 规范化 ──────────────────────────────────────────

/** 安全转为正整数字符串 ID。无效 → '' */
export function asId(value: unknown): string {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return String(value)
  if (typeof value === 'bigint' && value > 0n) return String(value)
  if (typeof value === 'string' && /^\d+$/.test(value.trim()) && value.trim() !== '0')
    return value.trim()
  return ''
}
