import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { type ReactNode, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface GlobalLoadingIndicatorProps {
  /** 开始请求后延迟显示的毫秒数，避免快速请求闪烁，默认 150。 */
  showDelayMs?: number
  /** 全部请求结束后延迟隐藏的毫秒数，保证进度条可见，默认 250。 */
  hideDelayMs?: number
  /** 屏幕阅读器通知文案，缺省使用 i18n。 */
  announcement?: string
}

/**
 * 全局顶部加载进度条：基于 react-query 的 useIsFetching/useIsMutating，
 * 任一请求进行中时显示不确定进度条，并通过 role=status 通知屏幕阅读器。
 * 必须渲染在 QueryClientProvider 内部。
 */
export function GlobalLoadingIndicator({
  showDelayMs = 150,
  hideDelayMs = 250,
  announcement,
}: GlobalLoadingIndicatorProps): ReactNode {
  const { t } = useTranslation()
  const resolvedAnnouncement =
    announcement ?? t('common.loadingIndicatorAnnouncing')
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const active = isFetching + isMutating > 0
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      if (showDelayMs <= 0) {
        setVisible(true)
        return undefined
      }
      const timer = window.setTimeout(() => {
        setVisible(true)
      }, showDelayMs)
      return () => {
        window.clearTimeout(timer)
      }
    }
    if (hideDelayMs <= 0) {
      setVisible(false)
      return undefined
    }
    const timer = window.setTimeout(() => {
      setVisible(false)
    }, hideDelayMs)
    return () => {
      window.clearTimeout(timer)
    }
  }, [active, showDelayMs, hideDelayMs])

  return (
    <>
      <div
        className="aries-global-loading-bar"
        data-state={visible ? 'visible' : 'hidden'}
        aria-hidden="true"
      />
      <span className="aries-sr-only" role="status" aria-live="polite">
        {visible ? resolvedAnnouncement : ''}
      </span>
    </>
  )
}
