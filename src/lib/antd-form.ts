/**
 * Ant Design Form 类型安全包装器。
 *
 * 规范：
 * - 每个表单必须定义 Zod Schema 和对应的 TS 类型
 * - Form.useForm<FormType>() 显式提供泛型
 * - Form.Item name 禁止字符串硬编码，使用 typedName() 辅助
 */

import type { FormInstance } from 'antd/es/form'

/**
 * antd 的 `FormInstance<T>` 把 `validateFields` 的返回类型绑定到 T, 但入参 `NamePath`
 * 与包装器收窄后的 `(keyof T & string)[]` 不能直接匹配(antd 6 的类型为 `NamePath[]`,
 * 且重载解析会退化成 any)。这里通过一个只含两个方法的最小结构做适配 —— 属于第三方库
 * 边界, 是 `as unknown as` 在本仓库的**合理保留项**: 断言集中在本函数内, 对外签名仍返回 T。
 */
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
