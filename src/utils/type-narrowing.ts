/**
 * 类型收窄工具集 —— 运行时校验 + 容错回退，禁止裸 `as` 断言。
 *
 * 用法：
 *   import { asString, asNumber, asArray } from '@/utils/type-narrowing'
 *
 *   // 旧: const name = record.customerName ?? ''  // no-base-to-string
 *   // 新: const name = asString(record.customerName)
 *
 *   // 旧: const qty = Number(record.quantity || 0)
 *   // 新: const qty = asNumber(record.quantity)
 */
// ── 基础类型收窄 ──────────────────────────────────────

/** 安全转为 string。非字符串/数字/布尔/大整数原语 → '' */
/** 空值判定：null/undefined 或 trim 后为空的字符串。 */
export function isBlankValue(value: unknown): boolean {
  return asString(value).trim() === ''
}

export function asString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number')
    return Number.isFinite(value) ? String(value) : ''
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

/** 安全转为数组。非数组 → [] */
export function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

// ── Record 安全访问器 ──────────────────────────────────

/**
 * 从 Record<string, unknown> 安全读取字段。
 * 用法：safe(record).str('name')
 */
export function safe(record: Record<string, unknown> | null | undefined) {
  const src = record ?? {}
  return {
    str(key: string, fallback = '') {
      return key in src ? asString(src[key]) : fallback
    },
  }
}

// ── ID 规范化 ──────────────────────────────────────────

/** 安全转为正整数字符串 ID。无效 → '' */
export function asId(value: unknown): string {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0)
    return String(value)
  if (typeof value === 'bigint' && value > 0n) return String(value)
  if (
    typeof value === 'string' &&
    /^\d+$/.test(value.trim()) &&
    value.trim() !== '0'
  )
    return value.trim()
  return ''
}
