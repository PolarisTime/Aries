/**
 * Ant Design Form 类型安全包装器。
 *
 * 规范：
 * - 每个表单必须定义 Zod Schema 和对应的 TS 类型
 * - Form.useForm<FormType>() 显式提供泛型
 * - Form.Item name 禁止字符串硬编码，使用 typedName() 辅助
 */

import type { FormInstance } from 'antd/es/form'

type MutableFormInstance = {
  setFieldsValue: (values: unknown) => void
  validateFields: (fields?: string[]) => Promise<unknown>
}

/** 为指定泛型创建类型安全的 Form.useForm */

/** 类型安全 validateFields */
export async function validateForm<T extends Record<string, unknown>>(
  form: FormInstance<T>,
  fields?: (keyof T & string)[],
): Promise<T> {
  if (fields) {
    return (await (form as unknown as MutableFormInstance).validateFields(
      fields,
    )) as T
  }
  return (await (form as unknown as MutableFormInstance).validateFields()) as T
}

export type { FormInstance }
