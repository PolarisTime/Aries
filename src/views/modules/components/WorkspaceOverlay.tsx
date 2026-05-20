import { CloseOutlined } from '@ant-design/icons'
import { useCallback, useEffect } from 'react'
import '@/styles/workspace-overlay.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number | string
  height?: number | string
  footer?: React.ReactNode
  variant?: 'drawer' | 'workspace' | 'inline'
  zIndex?: number
  className?: string
  showHeader?: boolean
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
  showHeader = true,
}: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  const isInline = variant === 'inline'

  if (isInline) {
    return (
      <div
        className={`workspace-overlay workspace-overlay--inline${className ? ` ${className}` : ''}`}
      >
        {showHeader ? (
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
        ) : null}
        <div className="workspace-overlay-body">{children}</div>
        {footer ? <div className="workspace-overlay-footer">{footer}</div> : null}
      </div>
    )
  }

  const panelStyle = {
    ...(width ? { maxWidth: width } : {}),
    ...(height ? { height } : {}),
  }

  return (
    <div
      className={`workspace-overlay workspace-overlay--${variant}`}
      style={zIndex ? { zIndex } : undefined}
    >
      <div className="workspace-overlay-mask" onClick={onClose} />
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
