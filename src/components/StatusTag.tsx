import { Tag } from 'antd'
import type { CSSProperties, ReactNode } from 'react'

const STANDARD_BLUE_STATUSES = new Set([
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

const DEEP_BLUE_STATUSES = new Set([
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

const LIGHT_BLUE_STATUSES = new Set([
  '草稿',
  '待审核',
  '未审核',
  '待核准',
  '待确认',
  '未签署',
  '未收票',
  '未结清',
  '未对账',
  '已过期',
  '未知',
  '未启用',
  '禁用',
  '已禁用',
  '停用',
  '失败',
  '异常',
  '错误',
  '离线',
  'DOWN',
  'DEGRADED',
])

const FLOW_BLUE_STATUSES = new Set([
  '执行中',
  '处理中',
  '部分入库',
  '部分出库',
  '部分结清',
  '进行中',
  '在线',
  'processing',
])

const AUXILIARY_BLUE_STATUSES = new Set(['关注', '需 VACUUM', '需 ANALYZE'])

const LIGHT_BLUE_TAG_STYLE: CSSProperties = {
  backgroundColor: 'transparent',
  borderColor: '#91caff',
  color: '#0958d9',
  fontWeight: 400,
}

const STANDARD_BLUE_TAG_STYLE: CSSProperties = {
  backgroundColor: 'transparent',
  borderColor: '#1677ff',
  color: '#003eb3',
  fontWeight: 500,
}

const DEEP_BLUE_TAG_STYLE: CSSProperties = {
  backgroundColor: 'transparent',
  borderColor: '#2f54eb',
  color: '#10239e',
  fontWeight: 600,
}

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

interface BlueTagTone {
  color?: string
  style: CSSProperties
}

const BLUE_TONE_BY_COLOR: Record<string, BlueTagTone> = {
  default: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  warning: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  error: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  red: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  orange: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  gold: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  yellow: { color: 'blue', style: LIGHT_BLUE_TAG_STYLE },
  success: { color: 'processing', style: STANDARD_BLUE_TAG_STYLE },
  green: { color: 'processing', style: STANDARD_BLUE_TAG_STYLE },
  processing: { color: 'processing', style: STANDARD_BLUE_TAG_STYLE },
  blue: { color: 'processing', style: STANDARD_BLUE_TAG_STYLE },
  geekblue: { color: 'geekblue', style: DEEP_BLUE_TAG_STYLE },
}

function isDeepBlueStatus(status: string): boolean {
  return DEEP_BLUE_STATUSES.has(status) || status.startsWith('完成')
}

function resolveFallbackTone(status: string): BlueTagTone {
  if (isDeepBlueStatus(status)) {
    return BLUE_TONE_BY_COLOR.geekblue
  }
  if (STANDARD_BLUE_STATUSES.has(status) || FLOW_BLUE_STATUSES.has(status)) {
    return BLUE_TONE_BY_COLOR.processing
  }
  if (LIGHT_BLUE_STATUSES.has(status) || AUXILIARY_BLUE_STATUSES.has(status)) {
    return BLUE_TONE_BY_COLOR.default
  }
  return BLUE_TONE_BY_COLOR.default
}

function resolveBlueTagTone(
  status: string,
  color?: string,
  displayText?: string,
): BlueTagTone {
  const normalizedColor = color?.trim()
  const normalizedDisplayText = displayText?.trim()
  const statusTone = resolveFallbackTone(status)
  const displayTone = normalizedDisplayText
    ? resolveFallbackTone(normalizedDisplayText)
    : statusTone
  const fallbackTone = displayTone.color ? displayTone : statusTone
  if (
    isDeepBlueStatus(status) ||
    (normalizedDisplayText ? isDeepBlueStatus(normalizedDisplayText) : false)
  ) {
    return BLUE_TONE_BY_COLOR.geekblue
  }
  if (!normalizedColor || normalizedColor === 'default') {
    return fallbackTone
  }
  return BLUE_TONE_BY_COLOR[normalizedColor] ?? fallbackTone
}

export function StatusTag({ status, statusMap, fallback, className }: Props) {
  const normalizedStatus = status.trim()
  const meta = statusMap[normalizedStatus] ?? statusMap[status]
  const fallbackText = fallback || normalizedStatus || '--'
  const displayText = meta?.label || meta?.text || fallbackText
  const tone = resolveBlueTagTone(normalizedStatus, meta?.color, displayText)
  if (!meta) {
    return (
      <Tag
        color={tone.color}
        variant="outlined"
        className={className}
        style={tone.style}
      >
        {fallbackText}
      </Tag>
    )
  }
  return (
    <Tag
      color={tone.color}
      icon={meta.icon}
      variant="outlined"
      className={className}
      style={tone.style}
    >
      {displayText}
    </Tag>
  )
}
