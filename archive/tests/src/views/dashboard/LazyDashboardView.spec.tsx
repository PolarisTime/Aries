import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'common.masterDataDesc': '管理基础数据',
        'dashboard.flow.loadingDescription': '加载中...',
      }
      return map[key] ?? key
    },
  }),
}))

vi.mock('@/views/dashboard/DashboardSkeleton', () => ({
  DashboardSkeleton: () => <div data-testid="dashboard-skeleton">Skeleton</div>,
}))

vi.mock('@/views/dashboard/DashboardView', () => ({
  DashboardView: () => <div data-testid="dashboard-view">Dashboard View</div>,
}))

import { LazyDashboardView } from '@/views/dashboard/LazyDashboardView'

describe('LazyDashboardView', () => {
  it('renders lazy dashboard view component', () => {
    render(<LazyDashboardView />)
    expect(screen.getByTestId('dashboard-skeleton')).toBeTruthy()
  })

  it('exports a component', () => {
    expect(LazyDashboardView).toBeDefined()
    expect(typeof LazyDashboardView).toBe('function')
  })
})
