import { z } from 'zod'

/**
 * 后端 `BigDecimal` 响应数值的**唯一归一化口径**。
 *
 * <p>后端把金额/重量/使用率序列化为 JSON number，历史版本也可能是十进制字符串；
 * 两者都必须归一化为有限 number 之后再进入业务层。此前这段逻辑在
 * `shared/schemas/sales-contract.ts` 里有一份私有副本，新增「项目数据」汇总契约时
 * 不再复制第三份，统一收敛到这里。</p>
 *
 * <p>注意：`shared/schemas/module-record.ts` 仍保留自己的实现（它对非有限 number 更宽容，
 * 改动会影响全部单据契约），未在本次范围内合并。</p>
 */
const DECIMAL_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)$/

export const responseDecimalSchema = z
  .union([z.number(), z.string().trim().regex(DECIMAL_PATTERN)])
  .transform((value) => (typeof value === 'number' ? value : Number(value)))
  .pipe(z.number().finite())

export const responseNonNegativeDecimalSchema = responseDecimalSchema.pipe(
  z.number().nonnegative(),
)

export type ResponseDecimal = z.output<typeof responseDecimalSchema>
