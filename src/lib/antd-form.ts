/**
 * Ant Design Form 类型安全包装器。
 *
 * 规范：
 * - 每个表单必须定义 Zod Schema 和对应的 TS 类型
 * - Form.useForm<FormType>() 显式提供泛型
 * - Form.Item name 禁止字符串硬编码，使用 typedName() 辅助
 */
import Form from 'antd/es/form'
import type { FormInstance } from 'antd/es/form'

/** 为指定泛型创建类型安全的 Form.useForm */
export function useTypedForm<T extends Record<string, unknown>>(): [FormInstance<T>, (values: Partial<T>) => void] {
  return Form.useForm<T>()
}

/** 类型安全取值 — 消除 form.getFieldValue 的 any 返回 */
export function getFormValue<T extends Record<string, unknown>, K extends keyof T & string>(
  form: FormInstance<T>,
  field: K,
): T[K] {
  return form.getFieldValue(field)
}

/** 类型安全取字符串字段 */
export function getFormString<T extends Record<string, unknown>>(
  form: FormInstance<T>,
  field: string,
): string {
  const v: unknown = form.getFieldValue(field)
  return typeof v === 'string' ? v : ''
}

/** 类型安全 validateFields */
export async function validateForm<T extends Record<string, unknown>>(
  form: FormInstance<T>,
  fields?: (keyof T & string)[],
): Promise<T> {
  if (fields) {
    return form.validateFields(fields as string[])
  }
  return form.validateFields()
}

export type { FormInstance }
