import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { getStoredUserMock, generateBusinessPrimaryNoMock, getModuleRecordPrimaryNoMock,
  generatePrimaryNoMock } = vi.hoisted(() => ({
  getStoredUserMock: vi.fn(),
  generateBusinessPrimaryNoMock: vi.fn(),
  getModuleRecordPrimaryNoMock: vi.fn(),
  generatePrimaryNoMock: vi.fn(),
}))

vi.mock('@/utils/storage', () => ({
  getStoredUser: getStoredUserMock,
}))

vi.mock('@/api/business', () => ({
  generateBusinessPrimaryNo: generateBusinessPrimaryNoMock,
}))

vi.mock('@/module-system/module-adapter-shared', () => ({
  generatePrimaryNo: generatePrimaryNoMock,
  getModuleRecordPrimaryNo: getModuleRecordPrimaryNoMock,
}))

vi.mock('dayjs', () => ({
  default: vi.fn(() => ({
    format: vi.fn((format: string) => {
      if (format === 'YYYY') return '2024'
      if (format === 'YYYYMMDD') return '20240115'
      return '2024-01-15'
    }),
  })),
}))

vi.mock('i18next', () => ({
  default: { t: vi.fn((key: string) => key) },
}))

import { useModuleRecordHelpers } from './useModuleRecordHelpers'

describe('useModuleRecordHelpers', () => {
  const defaultProps = {
    moduleKey: 'sales-order',
    config: {
      primaryNoKey: 'orderNo',
      rowHighlightStatuses: ['pending', 'draft'],
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    getStoredUserMock.mockReturnValue({
      userName: 'Test User',
      loginName: 'testuser',
    })
    generatePrimaryNoMock.mockReturnValue('SO-2024-001')
    getModuleRecordPrimaryNoMock.mockReturnValue('SO-2024-001')
  })

  it('returns all helper functions', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.generatePrimaryNo).toBeDefined()
    expect(result.current.generatePrimaryNoAsync).toBeDefined()
    expect(result.current.getCurrentOperatorName).toBeDefined()
    expect(result.current.getPrimaryNo).toBeDefined()
    expect(result.current.getRowClassName).toBeDefined()
    expect(result.current.sumLineItemsBy).toBeDefined()
  })

  it('gets current operator name from stored user', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.getCurrentOperatorName()).toBe('Test User')
  })

  it('falls back to loginName when userName is missing', () => {
    getStoredUserMock.mockReturnValue({
      loginName: 'testuser',
    })
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.getCurrentOperatorName()).toBe('testuser')
  })

  it('falls back to i18n key when user is missing', () => {
    getStoredUserMock.mockReturnValue(null)
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.getCurrentOperatorName()).toBe('hooks.recordHelpers.currentUser')
  })

  it('generates primary number synchronously', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    const primaryNo = result.current.generatePrimaryNo()
    expect(generatePrimaryNoMock).toHaveBeenCalled()
    expect(primaryNo).toBe('SO-2024-001')
  })

  it('generates primary number asynchronously', async () => {
    generateBusinessPrimaryNoMock.mockResolvedValue('SO-2024-ASYNC')
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    const primaryNo = await result.current.generatePrimaryNoAsync()
    expect(generateBusinessPrimaryNoMock).toHaveBeenCalledWith('sales-order')
    expect(primaryNo).toBe('SO-2024-ASYNC')
  })

  it('falls back to sync generation on async error', async () => {
    generateBusinessPrimaryNoMock.mockRejectedValue(new Error('Network error'))
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    const primaryNo = await result.current.generatePrimaryNoAsync()
    expect(primaryNo).toBe('SO-2024-001')
  })

  it('gets primary number from record', () => {
    const record = { id: '1', orderNo: 'SO-2024-001' }
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    const primaryNo = result.current.getPrimaryNo(record)
    expect(getModuleRecordPrimaryNoMock).toHaveBeenCalledWith(record, 'orderNo')
    expect(primaryNo).toBe('SO-2024-001')
  })

  it('returns emphasis class for highlighted statuses', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.getRowClassName({ status: 'pending' })).toBe('table-row-emphasis')
    expect(result.current.getRowClassName({ status: 'draft' })).toBe('table-row-emphasis')
  })

  it('returns empty string for non-highlighted statuses', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.getRowClassName({ status: 'confirmed' })).toBe('')
  })

  it('returns empty string when status is missing', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.getRowClassName({})).toBe('')
  })

  it('sums line items by key', () => {
    const items = [
      { quantity: 10, price: 100 },
      { quantity: 20, price: 200 },
      { quantity: 30, price: 300 },
    ]
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.sumLineItemsBy(items as any, 'quantity')).toBe(60)
    expect(result.current.sumLineItemsBy(items as any, 'price')).toBe(600)
  })

  it('handles missing values in sumLineItemsBy', () => {
    const items = [
      { quantity: 10 },
      { quantity: null },
      { quantity: undefined },
      { quantity: 20 },
    ]
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.sumLineItemsBy(items as any, 'quantity')).toBe(30)
  })

  it('returns 0 for empty items array', () => {
    const { result } = renderHook(() => useModuleRecordHelpers(defaultProps))
    expect(result.current.sumLineItemsBy([], 'quantity')).toBe(0)
  })
})
