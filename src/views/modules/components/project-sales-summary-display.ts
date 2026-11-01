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

/** 是否超过 100%（唯一判定处）。 */
export function isQuotaExceeded(rate: number | null): boolean {
  return rate !== null && Number.isFinite(rate) && rate > 1
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
