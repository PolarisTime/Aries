import { z } from 'zod'
import { asString, asNumber, asBoolean } from '@/utils/type-narrowing'
import type { ModuleRecordBase, ModuleLineItemBase } from './module-record'

/**
 * 模块记录字段安全访问器。
 * 替代裸的 record[key] ?? '' / record[key] as string 等不安全访问，
 * 提供运行时类型校验 + 容错回退值。
 */
export class ModuleFieldAccessor {
  constructor(private record: ModuleRecordBase | ModuleLineItemBase) {}

  /** 安全获取字符串字段 */
  str(key: string): string {
    return asString(this.record[key])
  }

  /** 安全获取数字字段 */
  num(key: string): number {
    return asNumber(this.record[key])
  }

  /** 安全获取布尔字段 */
  bool(key: string): boolean {
    return asBoolean(this.record[key])
  }

  /** 获取原始值（不转换类型） */
  raw(key: string): unknown {
    return this.record[key]
  }

  /** Zod schema 校验获取 */
  get<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
    const result = schema.safeParse(this.record[key])
    return result.success ? result.data : fallback
  }
}

/** 为单个记录创建字段访问器 */
export function fieldsOf(record: ModuleRecordBase | ModuleLineItemBase): ModuleFieldAccessor {
  return new ModuleFieldAccessor(record)
}
