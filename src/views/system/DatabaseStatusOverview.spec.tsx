import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

import { DatabaseStatusOverview } from '@/views/system/DatabaseStatusOverview'

const mockDbStatus = {
  postgres: {
    version: '15.0',
    status: '正常',
    databaseSize: '100 MB',
    tableCount: 50,
    activeConnections: 10,
    maxConnections: 100,
    host: 'localhost',
    port: 5432,
    database: 'testdb',
    serverStartTime: '2024-01-01T00:00:00',
  },
  redis: {
    version: '7.0',
    status: '正常',
    usedMemory: 1048576,
    totalKeys: 1000,
    hitRate: 99.5,
    host: 'localhost',
    port: 6379,
    uptime: '30 days',
    connectedClients: 5,
  },
} as never

describe('DatabaseStatusOverview', () => {
  it('renders without crashing', () => {
    expect(DatabaseStatusOverview).toBeDefined()
    expect(typeof DatabaseStatusOverview).toBe('function')
  })

  it('renders skeleton when loading and no data', () => {
    const { container } = render(
      <DatabaseStatusOverview dbStatus={undefined} loading={true} />,
    )
    expect(container.querySelector('.ant-skeleton')).toBeInTheDocument()
  })

  it('renders service cards when data is provided', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={false} />)
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    expect(screen.getByText('Redis')).toBeInTheDocument()
  })

  it('displays postgres version', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={false} />)
    expect(screen.getByText('15.0')).toBeInTheDocument()
  })

  it('displays redis version', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={false} />)
    expect(screen.getByText('7.0')).toBeInTheDocument()
  })

  it('displays database size', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={false} />)
    expect(screen.getByText('100 MB')).toBeInTheDocument()
  })

  it('displays host and port info', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={false} />)
    expect(screen.getByText('localhost:5432')).toBeInTheDocument()
    expect(screen.getByText('localhost:6379')).toBeInTheDocument()
  })

  it('renders service cards when loading but data exists', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={true} />)
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument()
    expect(screen.getByText('Redis')).toBeInTheDocument()
  })

  it('renders section heading', () => {
    render(<DatabaseStatusOverview dbStatus={mockDbStatus} loading={false} />)
    expect(
      screen.getByText('system.databaseStatus.serviceOverview'),
    ).toBeInTheDocument()
  })
})
