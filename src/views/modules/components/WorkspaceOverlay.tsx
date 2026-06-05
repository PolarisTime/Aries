import { CloseOutlined } from '@ant-design/icons'
import { useEffect, useEffectEvent } from 'react'
import { useTranslation } from 'react-i18next'
import '@/styles/workspace-overlay.css'

interface Props {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  children: React.ReactNode
  width?: number | string
  height?: number | string
  footer?: React.ReactNode
  variant?: 'workspace'
  zIndex?: number
  className?: string
}

export function WorkspaceOverlay({
  open,
  title,
  onClose,
  children,
  width,
  height,
  footer,
  variant = 'workspace',
  zIndex,
  className,
}: Props) {
  const { t } = useTranslation()
  const handleClose = useEffectEvent(onClose)

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose()
      }
      document.addEventListener('keydown', handler)
      return () => {
        document.removeEventListener('keydown', handler)
      }
    }
  }, [open])

  if (!open) return null

  const panelStyle = {
    ...(width ? { maxWidth: width } : {}),
    ...(height ? { height } : {}),
  }

  return (
    <div
      className={`workspace-overlay workspace-overlay--${variant}`}
      style={zIndex ? { zIndex } : undefined}
    >
      <button
        type="button"
        className="workspace-overlay-mask"
        aria-label={t('modules.workspace.closeAria')}
        onClick={onClose}
      />
      <section
        className={`workspace-overlay-panel workspace-overlay-panel--${variant}${className ? ` ${className}` : ''}`}
        style={panelStyle}
      >
        <header className="workspace-overlay-header">
          <span className="workspace-overlay-title">{title}</span>
          <button
            className="workspace-overlay-close"
            type="button"
            onClick={onClose}
          >
            <CloseOutlined />
          </button>
        </header>
        <div className="workspace-overlay-body">{children}</div>
        {footer && <div className="workspace-overlay-footer">{footer}</div>}
      </section>
    </div>
  )
}
