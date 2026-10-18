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

/**
 * 顶层 antd 对话框选择器：`.ant-modal-wrap` 是每个 Modal 的外层包裹节点，
 * 关闭后残留的节点带 `display: none`（或 `aria-hidden`），需要用「可见」判定过滤。
 *
 * <p>为什么 trap 要知道它：按一次 Esc 时，本 hook 的 document 监听与 antd Modal 自己的
 * 面板栈监听（`@rc-component/portal` 的 `useEscKeyDown`）会同时收到同一个事件。此前
 * trap 不感知已存在的 Modal，于是「脏编辑器按 Esc」→ trap 先开确认框 → 同一次事件继续
 * 被刚挂载的 Modal 当成「关自己」→ 确认框约 300ms 后自动消失（实测 297ms），用户来不及
 * 选「放弃修改」。所以：**上层已有 Modal 时，Esc/Tab 一律让给 Modal**。</p>
 */
const OPEN_MODAL_SELECTOR = '.ant-modal-wrap'

function isVisibleDialogNode(element: HTMLElement) {
  if (element.hidden) return false
  if (element.getAttribute('aria-hidden') === 'true') return false
  const style = window.getComputedStyle(element)
  return style.display !== 'none' && style.visibility !== 'hidden'
}

/**
 * 文档里是否存在「打开中的」antd Modal（含 modal.confirm/info 这类静态方法弹出的框）。
 *
 * <p>不用 `getBoundingClientRect()` 判可见：jsdom 下所有元素尺寸都是 0，会让本判断在
 * 单测里永远为假、修不掉的回归测不出来；`display/visibility/aria-hidden` 在真实 DOM
 * 与 jsdom 上语义一致，足以区分「在栈里」与「已关闭但节点残留」。</p>
 */
export function hasOpenAntdModal(): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>(OPEN_MODAL_SELECTOR),
  ).some(isVisibleDialogNode)
}

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
      /*
       * 上层已有 antd Modal（典型是「存在未保存的修改」确认框）时，把 Esc/Tab 全部让给它：
       * - Esc 若继续走 onEscape，会再开一个确认框，而同一次事件同时被 Modal 消费掉；
       * - Tab 若继续按本 trap 的元素环走，用户无法 Tab 到确认框的按钮。
       * 上限：Modal 关闭后本 hook 自动恢复接管，不需要额外状态。
       */
      if (hasOpenAntdModal()) return
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
