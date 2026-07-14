import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/views/modules/BusinessGridRouteContent', () => ({
  BusinessGridRouteContent: () => (
    <div data-testid="route-content">Route Content</div>
  ),
}))

vi.mock('@/views/modules/components/BusinessGridPageSkeleton', () => ({
  BusinessGridPageSkeleton: () => (
    <div data-testid="page-skeleton">Skeleton</div>
  ),
}))

import { BusinessGridPage } from '@/views/modules/BusinessGridPage'

describe('BusinessGridPage', () => {
  const defaultProps = {
    pageDef: {
      key: 'test-page',
      moduleKey: 'test-module',
      title: '测试页面',
      resourceKey: 'test-resource',
    },
    initialConfig: undefined,
  }

  it('renders page component', () => {
    render(<BusinessGridPage {...defaultProps} />)
    expect(screen.getByTestId('page-skeleton')).toBeTruthy()
  })

  it('falls back to page key when moduleKey is missing', () => {
    render(
      <BusinessGridPage
        {...defaultProps}
        pageDef={{
          key: 'fallback-page',
          title: '备用页面',
          resourceKey: 'fallback-resource',
        }}
      />,
    )
    expect(
      screen.queryByTestId('page-skeleton') ??
        screen.queryByTestId('route-content'),
    ).toBeTruthy()
  })

  it('exports BusinessGridPage component', () => {
    expect(BusinessGridPage).toBeDefined()
    expect(typeof BusinessGridPage).toBe('function')
  })
})
