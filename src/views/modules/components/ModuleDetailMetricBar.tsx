import { Progress, theme } from 'antd'
import type { ModuleDetailMetric } from '@/types/module-page'
import '@/styles/module-detail.css'

export interface ModuleDetailMetricBarProps {
  /** 指标格。数值由调用方算好传入，本组件不做字段识别与单位换算。 */
  metrics: ModuleDetailMetric[]
}

/**
 * 把外部传入的百分比收敛到 0~100。
 *
 * <p>指标多来自派生计算（已开吨位 / 订货吨位一类），除零、负数、超 100 都会出现；
 * 直接交给 Progress 会画出越界或 NaN 宽的轨道，看起来像渲染故障。</p>
 */
function normalizePercent(percent: number): number | null {
  if (!Number.isFinite(percent)) return null
  return Math.min(100, Math.max(0, percent))
}

/**
 * 详情指标条：4 列等宽的只读指标区。
 *
 * <p>结构与视觉按 Modern ERP Clean UI：12px 次要色 label → 18px 600 主值 →
 * 可选 4px 细进度条 → 12px hint。颜色全部取 `theme.useToken()`，不写死色值，
 * 保证明暗主题一致。</p>
 *
 * <p>**主值色用 Text 变体**（colorWarningText / colorSuccessText）而不是
 * colorWarning / colorSuccess：后者在浅色底上对比度约 1.9:1，18px/600 达不到
 * WCAG AA 的 4.5:1；进度条轨道仍用原色，满足非文本对比即可。</p>
 */
export function ModuleDetailMetricBar({ metrics }: ModuleDetailMetricBarProps) {
  const { token } = theme.useToken()

  if (metrics.length === 0) return null

  return (
    <div className="module-detail-metrics">
      {metrics.map((metric) => {
        const percent =
          typeof metric.percent === 'number'
            ? normalizePercent(metric.percent)
            : null
        const valueColor =
          metric.tone === 'warning'
            ? token.colorWarningText
            : metric.tone === 'success'
              ? token.colorSuccessText
              : token.colorText
        const trackColor =
          metric.tone === 'warning'
            ? token.colorWarning
            : metric.tone === 'success'
              ? token.colorSuccess
              : token.colorPrimary

        return (
          <div key={metric.key} className="module-detail-metric">
            <span
              className="module-detail-metric__label"
              style={{ color: token.colorTextSecondary }}
            >
              {metric.label}
            </span>
            <span
              className="module-detail-metric__value"
              style={{ color: valueColor }}
            >
              {metric.value}
            </span>
            {percent === null ? null : (
              <Progress
                aria-label={metric.label}
                className="module-detail-metric__progress"
                percent={percent}
                showInfo={false}
                size={['100%', 4]}
                strokeColor={trackColor}
              />
            )}
            {metric.hint === undefined || metric.hint === null ? null : (
              <span
                className="module-detail-metric__hint"
                style={{ color: token.colorTextSecondary }}
              >
                {metric.hint}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
