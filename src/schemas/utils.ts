import { z } from 'zod'
import type { Rule } from 'antd/es/form'

/**
 * Convert Zod schemas to Ant Design form validation rules.
 * Supports: string, number, enum, optional, nullable, min, max, email, url.
 */

interface ZodFieldDef {
  type?: string
  checks?: Array<{
    kind: string
    value?: unknown
    message?: string
  }>
  values?: unknown[]
  isOptional?: boolean
  isNullable?: boolean
  minLength?: number | null
  maxLength?: number | null
}

export function zodToAntdRules(schema: z.ZodType): Rule[] {
  const rules: Rule[] = []

  // Unwrap optional/nullable
  let current: z.ZodType = schema
  let isOptional = false
  while (current instanceof z.ZodOptional || current instanceof z.ZodNullable) {
    isOptional = true
    current = (current as z.ZodOptional<z.ZodType>).unwrap()
  }

  // Extract inner definition
  const def = current._def as ZodFieldDef

  if (isOptional) {
    rules.push({ required: false })
  } else {
    rules.push({ required: true, message: '此项为必填' })
  }

  // Type-specific rules
  const typeName = def.type || (current instanceof z.ZodString ? 'ZodString' : current instanceof z.ZodNumber ? 'ZodNumber' : '')

  if (typeName === 'ZodString') {
    rules.push({ type: 'string', message: '请输入有效的字符串' })
    if (current instanceof z.ZodString) {
      const stringDef = current._def as ZodFieldDef
      if (stringDef.minLength !== null && stringDef.minLength !== undefined) {
        rules.push({ min: stringDef.minLength, message: `最少 ${stringDef.minLength} 个字符` })
      }
      if (stringDef.maxLength !== null && stringDef.maxLength !== undefined) {
        rules.push({ max: stringDef.maxLength, message: `最多 ${stringDef.maxLength} 个字符` })
      }
      // Check for email/url patterns in checks
      const checks = stringDef.checks || []
      for (const check of checks) {
        if (check.kind === 'email') {
          rules.push({ type: 'email', message: check.message || '请输入有效的邮箱地址' })
        }
        if (check.kind === 'url') {
          rules.push({ type: 'url', message: check.message || '请输入有效的链接' })
        }
      }
    }
  }

  if (typeName === 'ZodNumber') {
    rules.push({ type: 'number', message: '请输入有效的数字' })
    if (current instanceof z.ZodNumber) {
      const numberDef = current._def as ZodFieldDef
      const checks = numberDef.checks || []
      for (const check of checks) {
        if (check.kind === 'min') {
          rules.push({ min: check.value as number, message: check.message || `最小值为 ${check.value}` })
        }
        if (check.kind === 'max') {
          rules.push({ max: check.value as number, message: check.message || `最大值为 ${check.value}` })
        }
      }
    }
  }

  if (typeName === 'ZodEnum') {
    rules.push({ type: 'enum', message: '请选择有效选项' })
  }

  return rules
}
