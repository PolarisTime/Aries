import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())
const assertApiSuccessMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  assertApiSuccess: assertApiSuccessMock,
  http: { get: httpGetMock },
}))

vi.mock('@/utils/api-messages', () => ({
  getApiMessage: (key: string) => key,
}))

import { getDatabaseMonitoring, getDatabaseStatus } from './database-admin'

describe('database-admin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assertApiSuccessMock.mockImplementation(<T>(response: T) => response)
  })

  describe('getDatabaseStatus', () => {
    it('fetches postgres and redis status', async () => {
      const mockData = {
        code: 0,
        data: {
          postgres: {
            host: 'localhost',
            port: 5432,
            database: 'aries',
            version: '15.0',
            totalConnections: 100,
            activeConnections: 5,
            maxConnections: 200,
            databaseSize: '1.2 GB',
            tableCount: 50,
            serverStartTime: '2024-01-01',
            status: 'UP',
          },
          redis: {
            host: 'localhost',
            port: 6379,
            database: 0,
            version: '7.0',
            usedMemory: 1024,
            usedMemoryPeak: 2048,
            totalKeys: 100,
            connectedClients: 3,
            uptime: '10d',
            hitCount: 500,
            missCount: 50,
            hitRate: 0.91,
            status: 'UP',
          },
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getDatabaseStatus()

      expect(httpGetMock).toHaveBeenCalledWith('/system/databases/status')
      expect(result.postgres.host).toBe('localhost')
      expect(result.redis.status).toBe('UP')
    })

    it('throws on failure', async () => {
      assertApiSuccessMock.mockImplementation(() => {
        throw new Error('loadDatabaseStatusFailed')
      })
      httpGetMock.mockResolvedValue({ code: -1 })

      await expect(getDatabaseStatus()).rejects.toThrow(
        'loadDatabaseStatusFailed',
      )
    })
  })

  describe('getDatabaseMonitoring', () => {
    it('fetches monitoring data', async () => {
      const mockData = {
        code: 0,
        data: {
          available: true,
          status: 'ok',
          overview: {
            totalConnections: 100,
            activeConnections: 5,
            cacheHitRate: 0.95,
            databaseSize: '1 GB',
            uptimeSeconds: 86400,
          },
          activity: { activeSessions: 3 },
          tuning: { maxConnections: 200 },
          tableHealth: [],
          indexHealth: [],
          queryStats: { available: true, status: 'ok', items: [] },
          redis: {
            status: 'ok',
            memory: {},
            clients: {},
            throughput: {},
            keyspace: {},
            persistence: {},
          },
        },
      }
      httpGetMock.mockResolvedValue(mockData)

      const result = await getDatabaseMonitoring()

      expect(httpGetMock).toHaveBeenCalledWith('/system/databases/monitoring')
      expect(result.available).toBe(true)
    })
  })
})
