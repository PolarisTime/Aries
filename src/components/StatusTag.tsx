import { Tag } from 'antd'
import type { ReactNode } from 'react'

const SUCCESS_STATUSES = new Set([
  '正常',
  '有效',
  '启用',
  '已启用',
  '成功',
  '已审核',
  '已核准',
  '已确认',
  '已签署',
  'ACTIVE',
  'UP',
])

const COMPLETED_STATUSES = new Set([
  '已完成',
  '完成采购',
  '完成入库',
  '完成销售',
  '已收款',
  '已付款',
  '已收票',
  '已开票',
  '已归档',
  '已结清',
  '已对账',
])

const WARNING_STATUSES = new Set([
  '草稿',
  '待审核',
  '未审核',
  '待核准',
  '待确认',
  '未签署',
  '未收票',
  '未结清',
  '未对账',
  '未知',
  '未启用',
])

const PROCESSING_STATUSES = new Set([
  '执行中',
  '处理中',
  '部分入库',
  '部分出库',
  '部分结清',
  '进行中',
  '在线',
  'processing',
])

const ERROR_STATUSES = new Set([
  '禁用',
  '已禁用',
  '停用',
  '失败',
  '异常',
  '错误',
  '离线',
  '已过期',
  '已删除',
  'DOWN',
  'DEGRADED',
])

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

function resolveFallbackColor(status: string): string | undefined {
  if (ERROR_STATUSES.has(status)) {
    return 'red'
  }
  if (COMPLETED_STATUSES.has(status) || status.startsWith('完成')) {
    return 'green'
  }
  if (SUCCESS_STATUSES.has(status)) {
    return 'green'
  }
  if (PROCESSING_STATUSES.has(status)) {
    return 'blue'
  }
  if (WARNING_STATUSES.has(status)) {
    return 'gold'
  }
  return undefined
}

function resolveTagColor(
  status: string,
  color?: string,
  displayText?: string,
): string | undefined {
  const normalizedColor = color?.trim()
  const normalizedDisplayText = displayText?.trim()
  const fallbackColor = normalizedDisplayText
    ? (resolveFallbackColor(normalizedDisplayText) ??
      resolveFallbackColor(status))
    : resolveFallbackColor(status)
  if (!normalizedColor || normalizedColor === 'default') {
    return fallbackColor
  }
  return TAG_COLOR_ALIASES[normalizedColor] ?? fallbackColor
}

export function StatusTag({ status, statusMap, fallback, className }: Props) {
  const normalizedStatus = status.trim()
  const meta = statusMap[normalizedStatus] ?? statusMap[status]
  const fallbackText = fallback || normalizedStatus || '--'
  const displayText = meta?.label || meta?.text || fallbackText
  const color = resolveTagColor(normalizedStatus, meta?.color, displayText)
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
