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
}

export function StatusTag({ status, statusMap, fallback }: Props) {
  const meta = statusMap[status]
  if (!meta) {
    return <Tag>{fallback || status}</Tag>
  }
  return (
    <Tag color={meta.color} icon={meta.icon}>
      {meta.label || meta.text || status}
    </Tag>
  )
}
