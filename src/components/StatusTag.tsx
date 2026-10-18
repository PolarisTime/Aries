import { Tag } from 'antd'
import type { ReactNode } from 'react'

interface StatusMeta {
  text?: string
  label?: string
  color?: string
  icon?: ReactNode
  hint?: string
}

interface Props {
  status: string
  statusMap: Record<string, StatusMeta>
  fallback?: string
  className?: string
}

const TAG_COLOR_ALIASES: Record<string, string | undefined> = {
  default: undefined,
  warning: 'gold',
  orange: 'gold',
  gold: 'gold',
  yellow: 'gold',
  error: 'red',
  red: 'red',
  success: 'green',
  green: 'green',
  processing: 'blue',
  blue: 'blue',
  geekblue: 'blue',
}

/**
 * 状态标签文字色（对各自 filled 底色实测 ≥4.5:1，满足 WCAG 1.4.3 AA）。
 *
 * <p><b>为什么不再引用 `var(--ant-color-warning-text)` 一类 token</b>：antd 6 的
 * `genColorMapToken` 把 `colorWarningText` 映射到 `warningColors[9]`，而默认主题的
 * `generateColorPalettes` 把 `9` 映射回 `colors[5]` —— 即**基础色本身**
 * （`8/9/10` 分别取自 `colors[4]/[5]/[6]`）。v5 里 `*Text` 表示"同色系更深一档、
 * 可作正文"，v6 已退化为基础色。</p>
 *
 * <p>实测：`getComputedStyle(tag).getPropertyValue('--ant-color-warning-text')`
 * 返回 `#faad14`（不是历史兜底 `#874d00`）。所以原先那句
 * `color: var(--ant-color-warning-text, #874d00)` 实际写入的是 `#faad14`，
 * 金标签对 `#fffbe6` 仅 **1.82:1** —— 对比度修复被静默废掉。</p>
 *
 * <p>改为写死安全值；同一套取值已同步到 `styles/antd-theme.ts` 的
 * `TAG_TEXT_COLOR_OVERRIDES`，让预设色 Tag 的 filled 文字色也一并达标。</p>
 */
const ACCESSIBLE_TAG_TEXT_COLORS: Record<string, string | undefined> = {
  gold: 'var(--status-tag-gold-text, #874d00)',
  green: 'var(--status-tag-green-text, #237804)',
  red: 'var(--status-tag-red-text, #b32430)',
  blue: 'var(--status-tag-blue-text, #0958d9)',
  cyan: 'var(--status-tag-cyan-text, #006d75)',
}

function resolveTagColor(color?: string): string | undefined {
  const normalizedColor = color?.trim()
  if (!normalizedColor || normalizedColor === 'default') {
    return undefined
  }
  return TAG_COLOR_ALIASES[normalizedColor] ?? normalizedColor
}

function resolveAccessibleTextColor(color?: string): string | undefined {
  const normalizedColor = color?.trim()
  return normalizedColor
    ? ACCESSIBLE_TAG_TEXT_COLORS[normalizedColor]
    : undefined
}

export function StatusTag({ status, statusMap, fallback, className }: Props) {
  const normalizedStatus = status.trim()
  const meta = statusMap[normalizedStatus] ?? statusMap[status]
  const fallbackText = fallback || normalizedStatus || '--'
  const displayText = meta?.label || meta?.text || fallbackText
  const color = resolveTagColor(meta?.color)
  const textColor = resolveAccessibleTextColor(color)
  const tagStyle = textColor ? { color: textColor } : undefined
  const hint = meta?.hint
  if (!meta) {
    return (
      <Tag
        color={color}
        variant="filled"
        className={className}
        style={tagStyle}
        title={hint}
      >
        {fallbackText}
      </Tag>
    )
  }
  return (
    <Tag
      color={color}
      icon={meta.icon}
      variant="filled"
      className={className}
      style={tagStyle}
      title={hint}
    >
      {displayText}
    </Tag>
  )
}
