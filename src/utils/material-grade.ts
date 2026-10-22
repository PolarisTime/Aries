/**
 * 抗震牌号替代规则 —— **唯一出口**。
 *
 * <p>业务背景: 项目报的是 HRB400, 但现货市场只有 HRB400E(抗震), 实际按 400E 供货、按 400E
 * 网价结算。库里实测 HRB400 报单行 124 条, 而商品资料里 HRB400E 有 239 个、HRB400 仅 63 个,
 * 现货以 400E 为主 —— 报 400 的行取不到价是常态。</p>
 *
 * <p>只认"补 E"这一种关系(不做 400→500、400→300 之类的跨强度替换): 跨强度是改设计强度,
 * 属另一件事, 不能由取价逻辑替用户决定。返回 null 表示该材质没有可替代的抗震牌号。</p>
 *
 * <p><b>为什么放在 utils 而不是某个 view</b>: 这条规则同时被「销售订单网价取价」
 * (`views/modules/net-price-fill`) 与「报单比价现货同步」(`views/price-compare/spot-sync`)
 * 使用。两处各写一份"补 E"的正则就会分叉 —— 一边认 HRBF、另一边不认, 或者大小写处理不同,
 * 结果同一行在"取价"里能补到、在"同步"里补不到, 正是实测反馈的现象。</p>
 */
export function substituteMaterialOf(material: unknown): string | null {
  const text = String(material ?? '')
    .trim()
    .toUpperCase()
  if (!text) return null
  // 已经是抗震牌号(以 E 结尾)就没有替代候选, 避免 400E → 400EE
  if (text.endsWith('E')) return null
  // 仅匹配 HRB/HRBF 系列的普通牌号, 其余材质(盘螺 HPB300 等)不做替代
  if (!/^HRB[F]?\d{3}$/.test(text)) return null
  return `${text}E`
}
