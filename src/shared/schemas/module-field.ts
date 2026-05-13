import { z } from 'zod'
import { asString, asNumber, asBoolean, asArray } from '@/utils/type-narrowing'

/**
 * 模块记录安全字段访问器。
 * 内部使用 Record<string, unknown> 作为动态键访问的类型边界（符合规则9），
 * 对外暴露严格类型的方法，消除业务代码中的 `record[key] ?? ''` 模式。
 *
 * 用法：
 *   const f = fieldsOf(record)  // record 来自 Zod parse
 *   f.str('customerName')       // → string
 *   f.num('quantity')           // → number
 */
export class ModuleFieldAccessor {
  /** 内部存储为 Record<string, unknown> — 仅在此边界层使用 */
  private readonly src: Record<string, unknown>

  constructor(record: Record<string, unknown>) {
    this.src = record
  }

  str(key: string, fallback = ''): string {
    if (!(key in this.src)) return fallback
    return asString(this.src[key])
  }

  num(key: string, fallback = 0): number {
    if (!(key in this.src)) return fallback
    return asNumber(this.src[key])
  }

  bool(key: string, fallback = false): boolean {
    if (!(key in this.src)) return fallback
    return asBoolean(this.src[key])
  }

  arr<T = unknown>(key: string, fallback: T[] = []): T[] {
    if (!(key in this.src)) return fallback
    return asArray<T>(this.src[key])
  }

  get<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
    if (!(key in this.src)) return fallback
    const r = schema.safeParse(this.src[key])
    return r.success ? r.data : fallback
  }
}

/** 从任意 Zod-validated 对象创建字段访问器（.passthrough() 类型兼容 Record<string, unknown>） */
export function fieldsOf(record: Record<string, unknown>): ModuleFieldAccessor {
  return new ModuleFieldAccessor(record)
}
