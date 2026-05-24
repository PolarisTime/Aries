import Button from 'antd/es/button'
import Divider from 'antd/es/divider'
import Popconfirm from 'antd/es/popconfirm'
import type { ReactNode } from 'react'
import { resolveModuleActionIcon } from '@/module-system/module-action-icons'

export interface ActionItem {
  key: string
  label: string
  icon?: ReactNode
  danger?: boolean
  confirm?: string
  visible?: boolean
  disabled?: boolean
  onClick: () => void
}

interface Props {
  items: ActionItem[]
  maxVisible?: number
}

export function TableActions({ items, maxVisible }: Props) {
  const visible = items.filter((item) => item.visible !== false)
  if (visible.length === 0) {
    return <span className="table-action-empty">--</span>
  }

  const displayItems = maxVisible ? visible.slice(0, maxVisible) : visible

  return (
    <div className="table-action-group">
      {displayItems.map((item, index) => (
        <span key={item.key}>
          {index > 0 && <Divider vertical />}
          {item.confirm ? (
            <Popconfirm
              title={item.confirm}
              onConfirm={item.onClick}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="link"
                danger={item.danger}
                disabled={item.disabled}
                icon={item.icon ?? resolveModuleActionIcon(item.label)}
                className="table-action-btn"
                size="small"
              >
                {item.label}
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              danger={item.danger}
              disabled={item.disabled}
              icon={item.icon ?? resolveModuleActionIcon(item.label)}
              onClick={item.onClick}
              className={`table-action-btn ${item.danger ? 'table-action-danger' : ''} ${item.disabled ? 'table-action-disabled' : ''}`}
              size="small"
            >
              {item.label}
            </Button>
          )}
        </span>
      ))}
    </div>
  )
}
