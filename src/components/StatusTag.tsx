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

const ACCESSIBLE_TAG_TEXT_COLORS: Record<string, string | undefined> = {
  gold: 'var(--ant-color-warning-text, #874d00)',
  green: 'var(--ant-color-success-text, #135200)',
  red: 'var(--ant-color-error-text, #a8071a)',
  blue: 'var(--ant-color-primary-text, #002c8c)',
  cyan: 'var(--ant-cyan-9, #00474f)',
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
