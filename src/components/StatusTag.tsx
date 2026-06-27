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

export function StatusTag({ status, statusMap, fallback, className }: Props) {
  const meta = statusMap[status]
  if (!meta) {
    return <Tag className={className}>{fallback || status}</Tag>
  }
  return (
    <Tag color={meta.color} icon={meta.icon} className={className}>
      {meta.label || meta.text || status}
    </Tag>
  )
}
