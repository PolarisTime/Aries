import { Button, type ButtonProps } from 'antd'
import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

export interface LoadingButtonProps
  extends Omit<ButtonProps, 'loading' | 'onClick'> {
  /** 点击回调；返回 Promise 时按钮自动进入 loading 并阻止重复点击。 */
  onClick?: (event: MouseEvent<HTMLElement>) => unknown
  /** 异步等待超过该毫秒数后触发超时提示；不设置则无超时提示。 */
  timeoutMs?: number
  /** 超时回调，可用于展示 message 提示等。 */
  onTimeout?: () => void
  /** 超时提示文案，渲染为屏幕阅读器可见的 role=status 通知。 */
  timeoutHint?: string
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Promise<unknown>).then === 'function'
  )
}

/**
 * 异步按钮：点击回调返回 Promise 时自动 loading + disabled，
 * loading 期间忽略后续点击（防重复提交），支持可选超时提示。
 */
export function LoadingButton({
  onClick,
  timeoutMs,
  onTimeout,
  timeoutHint,
  disabled,
  children,
  ...rest
}: LoadingButtonProps): ReactNode {
  const [pending, setPending] = useState(false)
  const [timedOut, setTimedOut] = useState(false)
  const pendingRef = useRef(false)
  const onTimeoutRef = useRef(onTimeout)

  useEffect(() => {
    onTimeoutRef.current = onTimeout
  }, [onTimeout])

  useEffect(() => {
    if (!pending || !timeoutMs) {
      return undefined
    }
    const timer = window.setTimeout(() => {
      setTimedOut(true)
      onTimeoutRef.current?.()
    }, timeoutMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [pending, timeoutMs])

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      if (pendingRef.current) {
        return
      }
      const result = onClick?.(event)
      if (!isPromiseLike(result)) {
        return
      }
      pendingRef.current = true
      setPending(true)
      setTimedOut(false)
      // 错误交由调用方在 onClick 内部捕获并提示，这里仅负责退出 loading
      const settle = () => {
        pendingRef.current = false
        setPending(false)
      }
      result.then(settle, settle)
    },
    [onClick],
  )

  return (
    <>
      <Button
        {...rest}
        disabled={disabled || pending}
        loading={pending}
        aria-busy={pending || undefined}
        data-loading-timeout={timedOut ? 'true' : undefined}
        onClick={handleClick}
      >
        {children}
      </Button>
      {timedOut && timeoutHint ? (
        <span className="aries-sr-only" role="status" aria-live="polite">
          {timeoutHint}
        </span>
      ) : null}
    </>
  )
}
