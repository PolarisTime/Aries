import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BusinessGridPageSkeleton } from '@/views/modules/components/BusinessGridPageSkeleton'

describe('BusinessGridPageSkeleton', () => {
  it('renders skeleton structure', () => {
    const { container } = render(<BusinessGridPageSkeleton />)
    expect(container.querySelector('.module-page-skeleton')).toBeTruthy()
  })

  it('renders skeleton rows', () => {
    const { container } = render(<BusinessGridPageSkeleton />)
    expect(container.querySelectorAll('.module-page-skeleton-row').length).toBeGreaterThan(0)
  })

  it('renders skeleton blocks', () => {
    const { container } = render(<BusinessGridPageSkeleton />)
    expect(container.querySelectorAll('.module-page-skeleton-block').length).toBeGreaterThan(0)
  })

  it('renders skeleton buttons', () => {
    const { container } = render(<BusinessGridPageSkeleton />)
    expect(container.querySelectorAll('.module-page-skeleton-button').length).toBeGreaterThan(0)
  })

  it('renders skeleton table area', () => {
    const { container } = render(<BusinessGridPageSkeleton />)
    expect(container.querySelector('.module-page-skeleton-table')).toBeTruthy()
  })
})
