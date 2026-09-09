import { CloseOutlined } from '@ant-design/icons'
import { useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { getTrapFocusableElements, useFocusTrap } from '@/hooks/useFocusTrap'
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

function getInitialFocusTarget(panel: HTMLElement) {
  const body = panel.querySelector<HTMLElement>('.workspace-overlay-body')
  const bodyFocusable = body ? getTrapFocusableElements(body)[0] : undefined
  return (
    bodyFocusable ||
    panel.querySelector<HTMLElement>('.workspace-overlay-close') ||
    getTrapFocusableElements(panel)[0] ||
    panel
  )
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
  const titleId = useId()
  const panelRef = useRef<HTMLElement | null>(null)

  useFocusTrap({
    containerRef: panelRef,
    active: open,
    getInitialFocusTarget: getInitialFocusTarget,
    onEscape: onClose,
  })

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
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        ref={panelRef}
        // react-doctor-disable-next-line react-doctor/prefer-html-dialog -- 面板通过 useFocusTrap 实现 Tab 焦点圈定、Escape 关闭与焦点还原，整体迁移原生 dialog 会改变 DOM/CSS 结构与多层层级管理。
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`workspace-overlay-panel workspace-overlay-panel--${variant}${className ? ` ${className}` : ''}`}
        style={panelStyle}
      >
        <header className="workspace-overlay-header">
          <span id={titleId} className="workspace-overlay-title">
            {title}
          </span>
          <button
            className="workspace-overlay-close"
            type="button"
            aria-label={t('modules.workspace.closeAria')}
            aria-keyshortcuts="Escape"
            onClick={onClose}
          >
            <CloseOutlined />
            <kbd className="keyboard-shortcut-hint">Esc</kbd>
          </button>
        </header>
        <div className="workspace-overlay-body">{children}</div>
        {footer && <div className="workspace-overlay-footer">{footer}</div>}
      </section>
    </div>
  )
}
