import type { ReactNode } from 'react'

export interface FormSkeletonProps {
  /** 表单字段占位组数，默认 6 组。 */
  fields?: number
  /** 是否渲染标题占位，默认渲染。 */
  title?: boolean
  /** 是否渲染底部操作按钮占位，默认渲染。 */
  actions?: boolean
  className?: string
}

function createFieldKeys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `field-${index + 1}`)
}

/**
 * 统一表单加载骨架屏：标题 / 标签+输入框字段组 / 底部操作区。
 */
export function FormSkeleton({
  fields = 6,
  title = true,
  actions = true,
  className,
}: FormSkeletonProps): ReactNode {
  const fieldKeys = createFieldKeys(fields)
  return (
    <div
      className={['aries-skeleton', className].filter(Boolean).join(' ')}
      aria-busy="true"
      role="status"
    >
      {title ? (
        <span className="aries-skeleton-block aries-skeleton-heading" />
      ) : null}
      {fieldKeys.map((key) => (
        <div key={key} className="aries-skeleton-field">
          <span className="aries-skeleton-block aries-skeleton-field-label" />
          <span className="aries-skeleton-block aries-skeleton-field-input" />
        </div>
      ))}
      {actions ? (
        <div className="aries-skeleton-row aries-skeleton-row--end">
          <span className="aries-skeleton-block aries-skeleton-pill--sm" />
          <span className="aries-skeleton-block aries-skeleton-pill--sm" />
        </div>
      ) : null}
    </div>
  )
}
