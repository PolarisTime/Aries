import { CloseOutlined } from '@ant-design/icons'
import { useEffect, useRef } from 'react'
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
  const handleKeyDownRef = useRef<((e: KeyboardEvent) => void) | null>(null)
  handleKeyDownRef.current = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => handleKeyDownRef.current?.(e)
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
      <div
        className="workspace-overlay-mask"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose() }}
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
