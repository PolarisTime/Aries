import { theme } from 'antd'
import type { ModuleDetailMetric } from '@/types/module-page'
import '@/styles/module-detail.css'

export interface ModuleDetailMetricBarProps {
  /** 指标格。数值由调用方算好传入，本组件不做字段识别与单位换算。 */
  metrics: ModuleDetailMetric[]
}

/**
 * 详情指标条：4 列等宽的只读指标区（设计稿「方案 B」的紧凑横条）。
 *
 * <p>每格结构固定为「32px 圆形图标底 + 右侧两行」：第一行 label（11-12px 次要色），
 * 第二行「值（12-13px / 700）+ 括号次级说明（10-11px 次要色）」**同行**。指标条的
 * 底色、上下 1px 分隔线、以及「出血到卡片左右边缘」的横向负边距都在
 * `styles/module-detail.css` 里，组件只负责结构与语义色。</p>
 *
 * <p>颜色全部取 `theme.useToken()`，不写死色值；**主值色用 Text 变体**
 * （colorWarningText / colorSuccessText）而不是 colorWarning / colorSuccess：后者在
 * 浅色底上对比度约 1.9:1，12-13px 的字达不到 WCAG AA 的 4.5:1。图标圆底是纯装饰
 * （`aria-hidden`），才允许用同色系浅底。</p>
 *
 * <p>`tone === 'warning'` 时**整格**加一层 `colorWarningBg`：未对账是待办性质，
 * 需要在 4 格里被第一时间看到；该格的 label 与值都用 `colorWarningText`，值另用等宽
 * 数字（金额逐位对齐，见 module-detail.css）。</p>
 *
 * <p>这里**不渲染进度条**：方案 B 的指标条只有两行，4px 细进度条会变成第三行，把 4 格
 * 高度撑开，并让「只有部分指标带进度」时基线错位；使用率本身已经以百分比呈现，
 * 进度条属于重复编码。`ModuleDetailMetric` 因此也不再声明 `percent` 字段。</p>
 */
export function ModuleDetailMetricBar({ metrics }: ModuleDetailMetricBarProps) {
  const { token } = theme.useToken()

  if (metrics.length === 0) return null

  return (
    <div className="module-detail-metrics">
      {metrics.map((metric) => {
        const warning = metric.tone === 'warning'
        const success = metric.tone === 'success'
        // 主值色：Text 变体（对比度达标），缺省用正文色
        const valueColor = warning
          ? token.colorWarningText
          : success
            ? token.colorSuccessText
            : token.colorText
        const labelColor = warning
          ? token.colorWarningText
          : token.colorTextSecondary
        // 图标圆底：同色系浅底（装饰），图标本身仍用可读的深色
        const iconBackground = warning
          ? token.colorWarningBg
          : success
            ? token.colorSuccessBg
            : token.colorPrimaryBg
        const iconColor = warning
          ? token.colorWarningText
          : success
            ? token.colorSuccessText
            : token.colorPrimary

        return (
          <div
            key={metric.key}
            className={`module-detail-metric${warning ? ' module-detail-metric--warning' : ''}`}
            /* 「整格 amber」：底色取 token，暗色主题下自动跟随，不写死 hex */
            style={warning ? { background: token.colorWarningBg } : undefined}
          >
            {/*
             * 图标可选：没传就不渲染空圆底（不占位），纯文字指标照旧从格子左缘开始。
             */}
            {metric.icon === undefined || metric.icon === null ? null : (
              <span
                aria-hidden
                className="module-detail-metric__icon"
                style={{ color: iconColor, background: iconBackground }}
              >
                {metric.icon}
              </span>
            )}
            <div className="module-detail-metric__body">
              <span
                className="module-detail-metric__label"
                style={{ color: labelColor }}
              >
                {metric.label}
              </span>
              {/* 值 + 括号次级说明同一行：分成两个 span，值本身仍是纯文本节点 */}
              <span className="module-detail-metric__value-row">
                <span
                  className="module-detail-metric__value"
                  style={{ color: valueColor }}
                >
                  {metric.value}
                </span>
                {metric.hint === undefined || metric.hint === null ? null : (
                  <span
                    className="module-detail-metric__hint"
                    /* 格子只有 1/4 宽，长括号说明会被省略号裁掉；title 兜住完整文案 */
                    title={
                      typeof metric.hint === 'string' ? metric.hint : undefined
                    }
                    style={{
                      color: warning
                        ? token.colorWarningText
                        : token.colorTextSecondary,
                    }}
                  >
                    {metric.hint}
                  </span>
                )}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
