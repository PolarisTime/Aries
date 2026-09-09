import {
  InboxOutlined,
  LockOutlined,
  SearchOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Button, Empty, theme } from 'antd'
import type { ReactNode } from 'react'

export type EmptyStateType = 'no-data' | 'no-result' | 'no-permission' | 'error'

export interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface Props {
  type: EmptyStateType
  title: string
  description?: ReactNode
  hint?: ReactNode
  primaryAction?: EmptyStateAction
  secondaryAction?: EmptyStateAction
}

const EMPTY_STATE_ICONS: Record<EmptyStateType, typeof InboxOutlined> = {
  'no-data': InboxOutlined,
  'no-result': SearchOutlined,
  'no-permission': LockOutlined,
  error: WarningOutlined,
}

const ICON_WRAPPER_SIZE = 56
const ICON_FONT_SIZE = 24

export function EmptyState({
  type,
  title,
  description,
  hint,
  primaryAction,
  secondaryAction,
}: Props) {
  const { token } = theme.useToken()
  const Icon = EMPTY_STATE_ICONS[type]

  const descriptionNode = (
    <div data-testid={`empty-state-${type}`}>
      <div
        style={{
          color: token.colorText,
          fontSize: token.fontSizeLG,
          fontWeight: 600,
          lineHeight: token.lineHeightLG,
        }}
      >
        {title}
      </div>
      {description ? (
        <div
          style={{
            color: token.colorTextSecondary,
            fontSize: token.fontSize,
            marginTop: token.marginXXS,
          }}
        >
          {description}
        </div>
      ) : null}
      {hint ? (
        <div
          style={{
            color: token.colorTextTertiary,
            fontSize: token.fontSizeSM,
            marginTop: token.marginXXS,
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  )

  return (
    <Empty
      image={
        <span
          aria-hidden="true"
          style={{
            alignItems: 'center',
            backgroundColor: token.colorFillQuaternary,
            borderRadius: '50%',
            color: token.colorIcon,
            display: 'inline-flex',
            fontSize: ICON_FONT_SIZE,
            height: ICON_WRAPPER_SIZE,
            justifyContent: 'center',
            width: ICON_WRAPPER_SIZE,
          }}
        >
          <Icon />
        </span>
      }
      description={descriptionNode}
    >
      {primaryAction || secondaryAction ? (
        <div
          style={{
            display: 'flex',
            gap: token.marginSM,
            justifyContent: 'center',
          }}
        >
          {primaryAction ? (
            <Button
              type="primary"
              onClick={primaryAction.onClick}
              data-testid="empty-state-primary-action"
            >
              {primaryAction.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button
              onClick={secondaryAction.onClick}
              data-testid="empty-state-secondary-action"
            >
              {secondaryAction.label}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Empty>
  )
}
