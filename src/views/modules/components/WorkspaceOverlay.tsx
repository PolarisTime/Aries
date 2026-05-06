import { useEffect, useCallback } from 'react'
import { CloseOutlined } from '@ant-design/icons'
import '@/styles/workspace-overlay.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number | string
  footer?: React.ReactNode
}

export function WorkspaceOverlay({ open, title, onClose, children, width, footer }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div className="workspace-overlay">
      <div className="workspace-overlay-mask" onClick={onClose} />
      <section
        className="workspace-overlay-panel"
        style={width ? { maxWidth: width } : undefined}
      >
        <header className="workspace-overlay-header">
          <span className="workspace-overlay-title">{title}</span>
          <button className="workspace-overlay-close" onClick={onClose}>
            <CloseOutlined />
          </button>
        </header>
        <div className="workspace-overlay-body">
          {children}
        </div>
        {footer && (
          <div className="workspace-overlay-footer">
            {footer}
          </div>
        )}
      </section>
    </div>
  )
}
