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

import { DashboardSkeleton } from '@/views/dashboard/DashboardSkeleton'

describe('DashboardSkeleton', () => {
  it('renders skeleton with correct structure', () => {
    render(<DashboardSkeleton />)
    const skeleton = document.querySelector('.dashboard-skeleton')
    expect(skeleton).toBeTruthy()
  })

  it('renders workplace skeleton section', () => {
    render(<DashboardSkeleton />)
    const workplace = document.querySelector('.dashboard-workplace-skeleton')
    expect(workplace).toBeTruthy()
  })

  it('renders status title skeleton block', () => {
    render(<DashboardSkeleton />)
    const block = document.querySelector('.dashboard-skeleton-status-title')
    expect(block).toBeTruthy()
  })

  it('renders status meta skeleton block', () => {
    render(<DashboardSkeleton />)
    const block = document.querySelector('.dashboard-skeleton-status-meta')
    expect(block).toBeTruthy()
  })

  it('renders avatar skeleton', () => {
    render(<DashboardSkeleton />)
    const avatar = document.querySelector('.dashboard-skeleton-avatar')
    expect(avatar).toBeTruthy()
  })

  it('renders workplace time skeleton block', () => {
    render(<DashboardSkeleton />)
    const time = document.querySelector('.dashboard-skeleton-time')
    expect(time).toBeTruthy()
  })

  it('renders workplace stats', () => {
    render(<DashboardSkeleton />)
    const stats = document.querySelectorAll('.dashboard-workplace-stat')
    expect(stats.length).toBe(3)
  })

  it('renders workplace layout', () => {
    render(<DashboardSkeleton />)
    const layout = document.querySelector('.dashboard-workplace-layout')
    expect(layout).toBeTruthy()
  })

  it('renders sidebar panels', () => {
    render(<DashboardSkeleton />)
    const panels = document.querySelector('.dashboard-sidebar-panels')
    expect(panels).toBeTruthy()
  })

  it('renders skeleton panels', () => {
    render(<DashboardSkeleton />)
    const panels = document.querySelectorAll('.dashboard-skeleton-panel')
    expect(panels.length).toBeGreaterThanOrEqual(2)
  })

  it('renders card title skeleton blocks', () => {
    render(<DashboardSkeleton />)
    const titles = document.querySelectorAll('.dashboard-skeleton-card-title')
    expect(titles.length).toBeGreaterThanOrEqual(2)
  })

  it('renders skeleton lines in first panel', () => {
    render(<DashboardSkeleton />)
    const lines = document.querySelectorAll('.dashboard-skeleton-line')
    expect(lines.length).toBe(6)
  })

  it('renders skeleton stats in second panel', () => {
    render(<DashboardSkeleton />)
    const stats = document.querySelectorAll('.dashboard-skeleton-stat')
    expect(stats.length).toBe(6)
  })

  it('renders flow card skeleton section', () => {
    render(<DashboardSkeleton />)
    const flowCard = document.querySelector('.dashboard-flow-card')
    expect(flowCard).toBeTruthy()
  })

  it('renders flow lanes', () => {
    render(<DashboardSkeleton />)
    const lanes = document.querySelector('.dashboard-flow-lanes')
    expect(lanes).toBeTruthy()
  })

  it('renders 4 flow lanes', () => {
    render(<DashboardSkeleton />)
    const sections = document.querySelectorAll('.dashboard-flow-lane')
    expect(sections.length).toBe(4)
  })

  it('renders flow title skeleton blocks', () => {
    render(<DashboardSkeleton />)
    const titles = document.querySelectorAll('.dashboard-skeleton-flow-title')
    expect(titles.length).toBe(4)
  })

  it('renders skeleton chips', () => {
    render(<DashboardSkeleton />)
    const chips = document.querySelectorAll('.dashboard-skeleton-chip')
    expect(chips.length).toBe(12)
  })

  it('renders first section description', () => {
    render(<DashboardSkeleton />)
    expect(screen.getByText('管理基础数据')).toBeTruthy()
  })

  it('renders loading description for other sections', () => {
    render(<DashboardSkeleton />)
    const descriptions = screen.getAllByText('加载中...')
    expect(descriptions.length).toBe(3)
  })
})
