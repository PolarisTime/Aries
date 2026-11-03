/**
 * 报价行的价格统计：本行最低价 + 「异常价」判定（**唯一口径**）。
 *
 * <p>界面上有两处用到「本行最低价」：最低价格子高亮、异常价标黄。两处必须取同一个 `min`，
 * 否则同一行会出现"标了最低价、又被判成异常"的自相矛盾。因此它们都读 {@link rowPriceStats}
 * 的结果，不在渲染里各算一遍。</p>
 */

/** 高于本行最低价多少比例就标黄。5% 是业务给的口径（含税运费波动一般不超 5%）。 */
export const ABNORMAL_PRICE_RATIO = 0.05

export type RowPriceStats = {
  /** 本行参与比较的最低价；没有任何有效价格时为 null。 */
  min: number | null
}

/**
 * 本行最低价：只统计正数价格。
 *
 * <p>0 是「真实报价 0」还是不填？报价表里 0 允许录入（免费/赠送），但它作为**最低价**会把整行
 * 其它价格都判成异常；这不是用户想要的比较基准，所以 0 与空值都不参与最低价。</p>
 */
export function rowPriceStats(
  prices: readonly (number | null | undefined)[],
): RowPriceStats {
  let min: number | null = null
  for (const price of prices) {
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      continue
    }
    if (min === null || price < min) min = price
  }
  return { min }
}

/**
 * 该格是否异常价：**严格高于**最低价 5%（恰好 5% 不算，避免边界抖动）。
 *
 * @param ratio 可覆盖，默认 {@link ABNORMAL_PRICE_RATIO}；测试与后续调参共用这一处。
 */
export function isAbnormalPrice(
  price: number | null,
  min: number | null,
  ratio: number = ABNORMAL_PRICE_RATIO,
): boolean {
  if (price === null || min === null) return false
  if (!(price > 0) || !(min > 0)) return false
  return price > min * (1 + ratio)
}

/**
 * 异常幅度（百分比，保留一位小数）：`(price / min - 1) * 100`。
 *
 * <p>文案里要写「高出 12.3%」，这个数字只能由这里算：另写一份四舍五入会出现
 * 悬停提示与标黄判定口径不一致（例如 5.04% 判为异常，却显示"高出 5.0%"）。</p>
 */
export function abnormalRatioPercent(price: number, min: number): number {
  if (!(min > 0) || !Number.isFinite(price)) return 0
  return Math.round((price / min - 1) * 1000) / 10
}
