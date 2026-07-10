import { CloseOutlined } from '@ant-design/icons'
import { useEffect, useEffectEvent, useId, useRef } from 'react'
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

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hidden,
  )
}

function getInitialFocusTarget(panel: HTMLElement) {
  const body = panel.querySelector<HTMLElement>('.workspace-overlay-body')
  const bodyFocusable = body ? getFocusableElements(body)[0] : undefined
  return (
    bodyFocusable ||
    panel.querySelector<HTMLElement>('.workspace-overlay-close') ||
    getFocusableElements(panel)[0] ||
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
  const handleClose = useEffectEvent(onClose)
  const titleId = useId()
  const panelRef = useRef<HTMLElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const focusFrameId = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      getInitialFocusTarget(panel).focus()
    })

    return () => {
      cancelAnimationFrame(focusFrameId)
      const previousActiveElement = previousActiveElementRef.current
      if (previousActiveElement?.isConnected) {
        previousActiveElement.focus()
      }
      previousActiveElementRef.current = null
    }
  }, [open])

  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' && e.key !== 'Tab') return

        const panel = panelRef.current
        if (!panel) return
        const topOverlay = Array.from(
          document.querySelectorAll('.workspace-overlay'),
        ).at(-1)
        if (!topOverlay?.contains(panel)) return

        if (e.key === 'Escape') {
          handleClose()
          return
        }

        const focusableElements = getFocusableElements(panel)
        if (!focusableElements.length) {
          e.preventDefault()
          panel.focus()
          return
        }

        const currentIndex = focusableElements.indexOf(
          document.activeElement as HTMLElement,
        )
        const nextIndex = e.shiftKey
          ? currentIndex <= 0
            ? focusableElements.length - 1
            : currentIndex - 1
          : currentIndex === -1 || currentIndex === focusableElements.length - 1
            ? 0
            : currentIndex + 1
        e.preventDefault()
        focusableElements[nextIndex].focus()
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
        tabIndex={-1}
        onClick={onClose}
      />
      <section
        ref={panelRef}
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
