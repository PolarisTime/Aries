import { type RefObject, useEffect, useRef } from 'react'

export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

export function getTrapFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hidden,
  )
}

export interface UseFocusTrapOptions {
  containerRef: RefObject<HTMLElement | null>
  active: boolean
  getInitialFocusTarget?: (container: HTMLElement) => HTMLElement | null
  onEscape?: () => void
  restoreFocus?: boolean
}

const activeTraps: symbol[] = []

export function useFocusTrap({
  containerRef,
  active,
  getInitialFocusTarget,
  onEscape,
  restoreFocus = true,
}: UseFocusTrapOptions) {
  const getInitialFocusTargetRef = useRef(getInitialFocusTarget)
  const onEscapeRef = useRef(onEscape)

  useEffect(() => {
    getInitialFocusTargetRef.current = getInitialFocusTarget
  }, [getInitialFocusTarget])

  useEffect(() => {
    onEscapeRef.current = onEscape
  }, [onEscape])

  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const trapId = Symbol('focus-trap')
    activeTraps.push(trapId)
    const isTopMostTrap = () => activeTraps[activeTraps.length - 1] === trapId

    const previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    const focusFrameId = requestAnimationFrame(() => {
      const panel = containerRef.current
      if (!panel) return
      const target =
        getInitialFocusTargetRef.current?.(panel) ??
        getTrapFocusableElements(panel)[0] ??
        panel
      target.focus()
    })

    const handleKeydown = (event: KeyboardEvent) => {
      if (!isTopMostTrap()) return
      if (event.key === 'Escape') {
        onEscapeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return

      const panel = containerRef.current
      if (!panel) return
      const focusableElements = getTrapFocusableElements(panel)
      if (!focusableElements.length) {
        event.preventDefault()
        panel.focus()
        return
      }

      const currentIndex = focusableElements.indexOf(
        document.activeElement as HTMLElement,
      )
      const nextIndex = event.shiftKey
        ? currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1
        : currentIndex === -1 || currentIndex === focusableElements.length - 1
          ? 0
          : currentIndex + 1
      event.preventDefault()
      focusableElements[nextIndex].focus()
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      cancelAnimationFrame(focusFrameId)
      document.removeEventListener('keydown', handleKeydown)
      const trapIndex = activeTraps.indexOf(trapId)
      if (trapIndex !== -1) {
        activeTraps.splice(trapIndex, 1)
      }
      if (restoreFocus && previousActiveElement?.isConnected) {
        previousActiveElement.focus({ preventScroll: true })
      }
    }
  }, [active, containerRef, restoreFocus])
}
