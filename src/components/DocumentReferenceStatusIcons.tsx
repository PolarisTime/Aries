import { LinkOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'
import type { ReactNode } from 'react'

export interface DocumentReferenceStatus {
  key: string
  label: string
  referenced: boolean
}

interface Props {
  statuses: readonly DocumentReferenceStatus[]
}

/**
 * 在单号旁展示下游引用状态，仅显示已被引用的图标。
 * 图标使用中性文本色，表示「存在下游引用」这一事实，而非「成功」语义。
 */
export function DocumentReferenceStatusIcons({ statuses }: Props): ReactNode {
  const referencedStatuses = statuses.filter((status) => status.referenced)
  if (referencedStatuses.length === 0) {
    return null
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        flex: '0 0 auto',
        alignItems: 'center',
        gap: 4,
        marginLeft: 6,
      }}
    >
      {referencedStatuses.map((status) => (
        <Tooltip key={status.key} title={status.label}>
          <span
            style={{
              display: 'inline-flex',
              width: 14,
              height: 18,
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45))',
            }}
            role="img"
            aria-label={status.label}
          >
            <LinkOutlined aria-hidden="true" />
          </span>
        </Tooltip>
      ))}
    </span>
  )
}
