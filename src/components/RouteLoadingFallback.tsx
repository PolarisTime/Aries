import { Flex, Spin } from 'antd'
import type { ReactNode } from 'react'

type RouteLoadingFallbackProps = {
  /**
   * skeleton：渲染骨架占位（登录、看板、业务列表、浮层等）；
   * blank：轻量静默占位，用于加载极快或不应出现骨架的场景。
   */
  variant?: 'skeleton' | 'blank'
  /**
   * skeleton 变体的骨架内容。未提供时使用通用 Spin 占位，
   * 与浮层懒加载 fallback 的视觉保持一致。
   */
  skeleton?: ReactNode
  /** blank 变体的占位元素 className，用于维持原布局尺寸 */
  className?: string
}

/**
 * 路由/懒加载统一的 Suspense fallback 入口。
 *
 * 该组件只统一 fallback 语义，不改变各懒加载点原有的渲染内容、
 * 挂载时机或占位时长；各专属骨架仍由各自组件负责渲染。
 */
export function RouteLoadingFallback({
  variant = 'skeleton',
  skeleton,
  className,
}: RouteLoadingFallbackProps) {
  if (variant === 'blank') {
    // 有意静默：仅保留轻量占位、不渲染可见骨架；无 className 时等价于 null。
    return className ? <div className={className} /> : null
  }

  if (skeleton) {
    return <>{skeleton}</>
  }

  return (
    <div className="module-overlay-lazy-fallback">
      <Flex justify="center" align="center" className="py-64">
        <Spin />
      </Flex>
    </div>
  )
}
