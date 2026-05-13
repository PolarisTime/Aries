/**
 * Antd Form 类型安全包装器。
 * 消除 Form.useForm() 的 any 传播，提供类型化的 getFieldValue/validateFields。
 */
import type { FormInstance } from 'antd/es/form'

/** 类型安全的表单字段取值 */
export function getFormString(form: FormInstance, field: string): string {
  const v: unknown = form.getFieldValue(field)
  return typeof v === 'string' ? v : ''
}

/** 类型安全的 validateFields */
export async function validateFormFields<T extends Record<string, unknown>>(
  form: FormInstance,
  fields: string[],
): Promise<T> {
  return (await form.validateFields(fields)) as T
}
