import { Tag } from 'antd'
import type { ReactNode } from 'react'

interface StatusMeta {
  text?: string
  label?: string
  color?: string
  icon?: ReactNode
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

function resolveTagColor(color?: string): string | undefined {
  const normalizedColor = color?.trim()
  if (!normalizedColor || normalizedColor === 'default') {
    return undefined
  }
  return TAG_COLOR_ALIASES[normalizedColor] ?? normalizedColor
}

export function StatusTag({ status, statusMap, fallback, className }: Props) {
  const normalizedStatus = status.trim()
  const meta = statusMap[normalizedStatus] ?? statusMap[status]
  const fallbackText = fallback || normalizedStatus || '--'
  const displayText = meta?.label || meta?.text || fallbackText
  const color = resolveTagColor(meta?.color)
  if (!meta) {
    return (
      <Tag color={color} variant="filled" className={className}>
        {fallbackText}
      </Tag>
    )
  }
  return (
    <Tag color={color} icon={meta.icon} variant="filled" className={className}>
      {displayText}
    </Tag>
  )
}
