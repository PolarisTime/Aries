import { Progress, theme } from 'antd'
import type { CSSProperties, ReactNode } from 'react'
import type {
  ModuleDetailMetric,
  ModuleDetailMetricStat,
  ModuleDetailMetricStats,
} from '@/types/module-page'
import '@/styles/module-detail.css'

export interface ModuleDetailMetricBarProps {
  /** 指标卡。数值由调用方算好传入，本组件不做字段识别与单位换算。 */
  metrics: ModuleDetailMetric[]
}

/**
 * 指标卡的颜色/底色口径（**唯一出口**）。
 *
 * <p>四个 tone 对应参考稿的四张卡：`primary` 浅蓝（合同金额使用率）、`success` 浅绿
 * （合同吨位使用率）、`default` 白底（本单送货）、`warning` 琥珀（未对账汇总）。
 * 全部取 `theme.useToken()`，不写死色值，暗色主题下跟着 token 一起变。</p>
 *
 * <p>为什么主值/标签色都走 `<X>Text` 而不是 `color<X>`：antd 6 把 `*Text` 退化成了基础色，
 * 而基础色在自带的浅底上对比度只有 1.8~3.3:1，达不到 WCAG AA 的 4.5:1；
 * 本仓库 `styles/antd-theme.ts` 已把 `colorWarningText / colorSuccessText / colorInfoText
 * 覆写成"对同色系浅底 ≥4.5:1"的实际取值，因此这里直接复用。</p>
 */
function resolveToneStyle(
  tone: ModuleDetailMetric['tone'],
  tokens: ReturnType<typeof theme.useToken>['token'],
): {
  card: CSSProperties
  label: string
  value: string
  secondary: string
  bar: string
  track: string
} {
  const base = {
    label: tokens.colorTextSecondary,
    value: tokens.colorText,
    secondary: tokens.colorTextSecondary,
    bar: tokens.colorPrimary,
    track: tokens.colorFillSecondary,
  }
  if (tone === 'warning') {
    return {
      card: {
        background: tokens.colorWarningBg,
        borderColor: tokens.colorWarningBorder,
      },
      ...base,
      label: tokens.colorWarningText,
      value: tokens.colorWarningText,
      bar: tokens.colorWarning,
    }
  }
  if (tone === 'primary') {
    return {
      card: {
        background: tokens.colorPrimaryBg,
        borderColor: tokens.colorPrimaryBgHover,
      },
      ...base,
    }
  }
  if (tone === 'success') {
    return {
      card: {
        background: tokens.colorSuccessBg,
        borderColor: tokens.colorSuccessBgHover,
      },
      ...base,
      bar: tokens.colorSuccess,
    }
  }
  return { card: {}, ...base }
}

/** 状态胶囊的颜色口径（与 tone 同源，不另写一套色值）。 */
function resolveCapsuleStyle(
  capsuleTone: NonNullable<ModuleDetailMetric['capsule']>['tone'],
  tokens: ReturnType<typeof theme.useToken>['token'],
): CSSProperties {
  /*
   * 胶囊比卡片底色深**一档**（`*BgHover` 而不是 `*Bg`）：卡片本身就已经是同色系浅底，
   * 同色胶囊会糊进背景里看不出边界。文字一律取 `<X>Text`（本仓库覆写成"对浅底 ≥4.5:1"）。
   */
  if (capsuleTone === 'success') {
    return {
      color: tokens.colorSuccessText,
      background: tokens.colorSuccessBgHover,
      borderColor: tokens.colorSuccessBorder,
    }
  }
  if (capsuleTone === 'warning') {
    return {
      color: tokens.colorWarningText,
      background: tokens.colorWarningBgHover,
      borderColor: tokens.colorWarningBorder,
    }
  }
  /*
   * `processing`（参考稿里的「健康」）：主色系深一档浅底 + 主色系描边。
   * 文字取 `colorPrimaryActive`(#0958d9) 而不是 `colorPrimary`(#1677ff)：
   * 后者对浅底约 3.3:1，12px 文字不达 AA。
   */
  return {
    color: tokens.colorPrimaryActive,
    background: tokens.colorPrimaryBgHover,
    borderColor: tokens.colorPrimaryBorder,
  }
}

/**
 * 底行的一组「标签 + 值」。
 *
 * <p>标签与值都可缺省：参考稿里「交货差异率」那组只有标签（值在右侧蓝色），
 * 「待对账吨位」那组只有值。任一侧为空时不渲染空 span。</p>
 */
function renderStat(
  stat: ModuleDetailMetricStat | undefined,
  side: 'start' | 'end',
) {
  if (!stat || (stat.label == null && stat.value == null)) return null
  return (
    <span
      className={`module-detail-metric__stat module-detail-metric__stat--${side}`}
    >
      {stat.label == null ? null : (
        <span className="module-detail-metric__stat-label">
          {/* 冒号与信息区字段标签同一写法（`{label}：`），不新造 i18n key */}
          {stat.label}：
        </span>
      )}
      {stat.value == null ? null : (
        <span className="module-detail-metric__stat-value">{stat.value}</span>
      )}
    </span>
  )
}

function renderStats(stats: ModuleDetailMetricStats | undefined): ReactNode {
  if (!stats) return null
  const left = renderStat(stats.left, 'start')
  const right = renderStat(stats.right, 'end')
  if (left === null && right === null) return null
  return (
    <div className="module-detail-metric__stats">
      {left}
      {right}
    </div>
  )
}

/**
 * 详情指标卡：四张并排的圆角卡（参考稿「顶栏卡」下方的指标区）。
 *
 * <p>每张卡自上而下固定为四段：</p>
 * <ol>
 *   <li>**标题行**：label（次要色）+ 状态胶囊 / 右上角圆形图标，二选一或都不给；</li>
 *   <li>**主值行**：大号数字（26px / 700）+ 同行次级说明（`subValue` / `hint`）；</li>
 *   <li>**进度条**（只在传了 `percent` 时渲染，6px 圆角条）或 1px 分隔线（无进度条时）；</li>
 *   <li>**底行**：左右两组「标签 + 值」（`stats`），左靠左、右靠右。</li>
 * </ol>
 *
 * <p>四个 tone 的底色与文字色由 {@link resolveToneStyle} 一处产出，卡片本身只负责排版；
 * 需要「只有部分指标带进度条」时基线依然对齐，因为分隔线那一段与进度条占同一行高
 * （见 `styles/module-detail.css` 的 `.module-detail-metric__rule`）。</p>
 *
 * <p>空数组返回 `null`：指标是增强信息，没有数据时不留空容器占位。</p>
 */
export function ModuleDetailMetricBar({ metrics }: ModuleDetailMetricBarProps) {
  const { token } = theme.useToken()

  if (metrics.length === 0) return null

  return (
    <div className="module-detail-metrics">
      {metrics.map((metric) => {
        const tone = resolveToneStyle(metric.tone, token)
        const capsuleStyle = metric.capsule
          ? resolveCapsuleStyle(metric.capsule.tone, token)
          : null
        const hasIcon = metric.icon !== undefined && metric.icon !== null
        const hasHeadExtra = capsuleStyle !== null || hasIcon

        return (
          <article
            key={metric.key}
            /*
             * 每张卡是可被读屏"按块"跳读的一段内容，给它一个可访问名（就是卡片标题），
             * 否则四张卡在无障碍树里都是无名的 article，用户只能一行行听过去。
             */
            aria-label={metric.label}
            className={`module-detail-metric${metric.tone && metric.tone !== 'default' ? ` module-detail-metric--${metric.tone}` : ''}`}
            /* 卡片底色与描边按 tone 内联下发：暗色主题下跟着 token 一起变 */
            style={tone.card}
          >
            <div className="module-detail-metric__head">
              <span
                className="module-detail-metric__label"
                style={{ color: tone.label }}
                title={metric.label}
              >
                {metric.label}
              </span>
              {hasHeadExtra ? (
                <span className="module-detail-metric__head-extra">
                  {capsuleStyle && metric.capsule ? (
                    <span
                      className="module-detail-metric__capsule"
                      style={capsuleStyle}
                    >
                      {metric.capsule.text}
                    </span>
                  ) : null}
                  {hasIcon ? (
                    <span
                      aria-hidden
                      className="module-detail-metric__icon"
                      style={{
                        color: tone.label,
                        background: token.colorBgContainer,
                      }}
                    >
                      {metric.icon}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>

            {/* 值 + 次级说明同一行：分成两个 span，值本身仍是纯文本节点 */}
            <span className="module-detail-metric__value-row">
              <span
                className="module-detail-metric__value"
                style={{ color: tone.value }}
              >
                {metric.value}
              </span>
              {metric.subValue === undefined ||
              metric.subValue === null ? null : (
                <span
                  className="module-detail-metric__sub"
                  style={{ color: tone.secondary }}
                >
                  {metric.subValue}
                </span>
              )}
              {metric.hint === undefined || metric.hint === null ? null : (
                <span
                  className="module-detail-metric__hint"
                  /* 卡片只有 1/4 宽，长括号说明会被省略号裁掉；title 兜住完整文案 */
                  title={
                    typeof metric.hint === 'string' ? metric.hint : undefined
                  }
                  style={{ color: tone.secondary }}
                >
                  {metric.hint}
                </span>
              )}
            </span>

            {typeof metric.percent === 'number' ? (
              <Progress
                className="module-detail-metric__progress"
                percent={metric.percent}
                size={['100%', 6]}
                showInfo={false}
                strokeColor={tone.bar}
                railColor={tone.track}
                aria-label={metric.label}
              />
            ) : (
              /* 没有进度条的卡片（参考稿的卡 3/卡 4）：同高的一条分隔线，四张卡基线因此一致 */
              <span className="module-detail-metric__rule" aria-hidden />
            )}

            {renderStats(metric.stats)}
          </article>
        )
      })}
    </div>
  )
}
