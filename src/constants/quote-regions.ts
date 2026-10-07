/**
 * 取价地区(西本城市中文名)选项。
 *
 * 权威来源是后端配置 `leo.market.steelx-quote.regions`，经 `GET /api/v2/runtime-config`
 * 的 `business.quoteRegions` 动态下发，前端不得再写死城市清单。
 * 这里的默认值仅用于「后端尚未下发 / 下发为空 / 请求失败」时兜底，避免下拉空白。
 */
export const DEFAULT_QUOTE_REGIONS: readonly string[] = [
  '杭州',
  '上海',
  '宁波',
  '嘉兴',
  '绍兴',
]

/**
 * 归一化取价地区选项：优先使用后端下发值，去空白、去重、剔除空串；
 * 后端未下发或全部为空时回退 {@link DEFAULT_QUOTE_REGIONS}。
 */
export function resolveQuoteRegions(
  regions?: readonly string[] | null,
): string[] {
  const normalized = (regions ?? [])
    .map((region) => region.trim())
    .filter((region) => region.length > 0)

  const unique = Array.from(new Set(normalized))
  return unique.length > 0 ? unique : [...DEFAULT_QUOTE_REGIONS]
}
