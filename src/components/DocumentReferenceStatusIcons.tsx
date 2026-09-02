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

/** 在单号旁展示下游引用状态，仅显示已被引用的图标。 */
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
              color: 'var(--ant-color-success, #389e0d)',
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
