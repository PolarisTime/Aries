
/**
 * 模块记录安全字段访问器。
 * 内部使用 Record<string, unknown> 作为动态键访问的类型边界（符合规则9），
 * 对外暴露严格类型的方法，消除业务代码中的 `record[key] ?? ''` 模式。
 *
 * 用法：
 *   const f = fieldsOf(record)  // record 来自 Zod parse
 *   f.str('customerName')       // → string
 *   f.num('quantity')           // → number
 *//** @file-dynamic-ref:unreferenced — 安全字段访问器抽象层，暂无消费者，保留供未来 API 迁移使用 */

/** 从任意 Zod-validated 对象创建字段访问器（.passthrough() 类型兼容 Record<string, unknown>） */
