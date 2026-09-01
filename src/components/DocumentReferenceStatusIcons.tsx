import { DisconnectOutlined, LinkOutlined } from '@ant-design/icons'
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

/** 在单号旁以固定宽度图标展示下游引用状态。 */
export function DocumentReferenceStatusIcons({ statuses }: Props): ReactNode {
  return (
    <span
      aria-label="引用状态"
      style={{
        display: 'inline-flex',
        flex: '0 0 auto',
        alignItems: 'center',
        gap: 4,
        marginLeft: 6,
      }}
    >
      {statuses.map((status) => {
        const Icon = status.referenced ? LinkOutlined : DisconnectOutlined
        return (
          <Tooltip key={status.key} title={status.label}>
            <span
              style={{
                display: 'inline-flex',
                width: 14,
                height: 18,
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: status.referenced
                  ? 'var(--ant-color-success, #389e0d)'
                  : 'var(--theme-text-muted-light)',
              }}
              role="img"
              aria-label={status.label}
            >
              <Icon aria-hidden="true" />
            </span>
          </Tooltip>
        )
      })}
    </span>
  )
}
