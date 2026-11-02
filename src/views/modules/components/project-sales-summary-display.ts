/**
 * 「项目数据」面板的展示口径：使用率百分比、超限判定、进度条刻度。
 *
 * <p>这三个值必须**只有一个出口**：进度条的 `status`（danger 态）、`percent` 与旁边的
 * 百分比文案如果各写一份判断，就会出现「文案说超限、进度条还是蓝色」这类自相矛盾。
 * 判定基准来自后端契约 `amountUsageRate = 已用 / 合同`（0.8532 = 85.32%），前端不做二次换算。</p>
 */

/** 无合同 / 无使用率时的占位文本。 */
export const USAGE_RATE_PLACEHOLDER = '—'

/** 使用率 → 百分比文本：0.8532 → `85.32%`。 */
export function formatUsagePercent(rate: number | null): string {
  if (rate === null || !Number.isFinite(rate)) return USAGE_RATE_PLACEHOLDER
  return `${(rate * 100).toFixed(2)}%`
}

/**
 * 是否超过合同限额（唯一判定处）。
 *
 * <p>判定基准是后端返回的「超出额」{@code max(已用 − 合同, 0)}，<b>不是</b>使用率
 * {@code rate > 1}。使用率按 4 位小数展示，拿它判定会与金额口径打架：</p>
 *
 * <ul>
 *   <li>已用比合同多 0.01 元 → rate 展示为 {@code 100.00%}，{@code rate > 1} 为假 →
 *       进度条蓝色，但「已超出合同金额 0.01 元」的提示会出现；</li>
 *   <li>已用超出额小到被金额精度归零 → rate 可能仍 {@code > 1} → 进度条红色，
 *       但超限提示不出现。</li>
 * </ul>
 *
 * <p>进度条与超限提示都调用本函数，两者因此永远一致；使用率只负责展示百分比与刻度。</p>
 */
export function isQuotaExceeded(exceeded: number | null | undefined): boolean {
  return typeof exceeded === 'number' && Number.isFinite(exceeded) && exceeded > 0
}

/**
 * 进度条刻度：clamp 到 0~100。
 *
 * <p>超限时 bar 已经填满，真实比例由旁边的百分比文本表达 —— 这样 `aria-valuenow`
 * 始终落在 `aria-valuemin/max` 区间内（超限语义改由 `status="exception"` + 文本承担）。</p>
 */
export function toBarPercent(rate: number | null): number {
  if (rate === null || !Number.isFinite(rate)) return 0
  return Math.min(Math.max(rate * 100, 0), 100)
}
