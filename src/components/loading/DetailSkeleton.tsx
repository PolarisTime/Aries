import type { ReactNode } from 'react'

export interface DetailSkeletonProps {
  /** 详情区块数量，默认 2 个。 */
  sections?: number
  /** 每个区块内的文本行数，默认 3 行。 */
  linesPerSection?: number
  className?: string
}

function createSectionKeys(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `section-${index + 1}`)
}

function createLineKeys(sectionKey: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `${sectionKey}-line-${index + 1}`,
  )
}

/**
 * 统一详情页加载骨架屏：标题 / 描述区 / 多个内容区块。
 */
export function DetailSkeleton({
  sections = 2,
  linesPerSection = 3,
  className,
}: DetailSkeletonProps): ReactNode {
  const sectionKeys = createSectionKeys(sections)
  return (
    <div
      className={['aries-skeleton', className].filter(Boolean).join(' ')}
      aria-busy="true"
      role="status"
    >
      <span className="aries-skeleton-block aries-skeleton-heading" />
      <div className="aries-skeleton-row">
        {sectionKeys.map((sectionKey) => (
          <div
            key={sectionKey}
            className="aries-skeleton-detail-section aries-skeleton-field"
          >
            {createLineKeys(sectionKey, linesPerSection).map((lineKey) => (
              <span
                key={lineKey}
                className="aries-skeleton-block aries-skeleton-line"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
