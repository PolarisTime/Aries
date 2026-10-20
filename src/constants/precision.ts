/**
 * 金额显示精度：**金额位数只有一个来源**。
 *
 * <p>此前 `formatAmount` 把 2 位硬编码在 `toLocaleString` 的
 * `minimumFractionDigits/maximumFractionDigits` 里，想改位数得全仓找数字。
 * 现在改为引用本常量：要调整以元还是以角分展示，只改这一处。</p>
 */
export const DISPLAY_AMOUNT_PRECISION = 2

export const INTERNAL_WEIGHT_PRECISION = 8
export const DISPLAY_WEIGHT_PRECISION = 3
