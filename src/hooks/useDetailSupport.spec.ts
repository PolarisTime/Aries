import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getBusinessModuleDetailMock, getModuleConfigMock } = vi.hoisted(() => ({
  getBusinessModuleDetailMock: vi.fn(),
  getModuleConfigMock: vi.fn().mockReturnValue({
    readOnly: false,
    supportsDetail: true,
  }),
}))

vi.mock('@/api/business', () => ({
  getBusinessModuleDetail: getBusinessModuleDetailMock,
}))

vi.mock('@/api/module-contracts', () => ({
  getModuleConfig: getModuleConfigMock,
}))

import { useDetailSupport } from './useDetailSupport'

describe('useDetailSupport', () => {
  const defaultProps = {
    moduleKey: 'sales-order',
    config: {
      detailItemColumns: [{ key: 'name', title: 'Name' }],
    },
  }

  beforeEach(() => {
    vi.resetAllMocks()
    getModuleConfigMock.mockReturnValue({
      readOnly: false,
      supportsDetail: true,
    })
  })

  it('initializes with default state', () => {
    const { result } = renderHook(() => useDetailSupport(defaultProps))
    expect(result.current.detailOpen).toBe(false)
    expect(result.current.detailRecord).toBeNull()
    expect(result.current.detailLoading).toBe(false)
  })

  it('opens detail with record object', async () => {
    const record = { id: '1', name: 'Test', items: [] }
    getBusinessModuleDetailMock.mockResolvedValue({ data: record })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(result.current.detailOpen).toBe(true)
    expect(result.current.detailRecord).toEqual(record)
  })

  it('opens detail with record ID', async () => {
    const record = { id: '1', name: 'Test', items: [] }
    getBusinessModuleDetailMock.mockResolvedValue({ data: record })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail('1')
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith('sales-order', '1')
    expect(result.current.detailRecord).toEqual(record)
  })

  it('does not fetch when config is readOnly and does not support detail', async () => {
    getModuleConfigMock.mockReturnValue({
      readOnly: true,
      supportsDetail: false,
    })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail('1')
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(result.current.detailLoading).toBe(false)
  })

  it('does not fetch when record already has items', async () => {
    const record = { id: '1', name: 'Test', items: [{ id: 'item-1' }] }

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(result.current.detailLoading).toBe(false)
  })

  it('falls back to original record on fetch error', async () => {
    const record = { id: '1', name: 'Test', items: [] }
    getBusinessModuleDetailMock.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(result.current.detailRecord).toEqual(record)
    expect(result.current.detailLoading).toBe(false)
  })

  it('closes detail and resets state', async () => {
    const record = { id: '1', name: 'Test', items: [] }
    getBusinessModuleDetailMock.mockResolvedValue({ data: record })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(result.current.detailOpen).toBe(true)

    act(() => {
      result.current.closeDetail()
    })

    expect(result.current.detailOpen).toBe(false)
    expect(result.current.detailRecord).toBeNull()
  })

  it('handles missing record ID', async () => {
    const record = { name: 'Test' }

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record as any)
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(result.current.detailLoading).toBe(false)
  })

  it('does not skip fetch when record has no items and no detailItemColumns', async () => {
    const config = { columns: [] }
    const record = { id: '1', name: 'Test' }
    const { result } = renderHook(() =>
      useDetailSupport({ moduleKey: 'sales-order', config }),
    )
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
  })

  it('fetches detail when record has no items and detailItemColumns exist', async () => {
    const record = { id: '1', name: 'Test' }
    getBusinessModuleDetailMock.mockResolvedValue({
      data: { id: '1', name: 'Test Updated', items: [{ id: 'item-1' }] },
    })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith('sales-order', '1')
    expect(result.current.detailRecord).toEqual({
      id: '1',
      name: 'Test Updated',
      items: [{ id: 'item-1' }],
    })
  })

  it('handles empty string recordId', async () => {
    const record = { id: '', name: 'Test' }

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail(record)
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(result.current.detailLoading).toBe(false)
  })

  it('opens detail with string target that is not an ID', async () => {
    getBusinessModuleDetailMock.mockResolvedValue({
      data: { id: '123', name: 'Fetched' },
    })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail('123')
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith(
      'sales-order',
      '123',
    )
    expect(result.current.detailRecord).toEqual({ id: '123', name: 'Fetched' })
  })

  it('falls back to null when string target fetch fails', async () => {
    getBusinessModuleDetailMock.mockRejectedValue(new Error('Not found'))

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail('999')
    })

    expect(result.current.detailRecord).toBeNull()
    expect(result.current.detailLoading).toBe(false)
  })

  it('handles readOnly module with supportsDetail', async () => {
    getModuleConfigMock.mockReturnValue({
      readOnly: true,
      supportsDetail: true,
    })

    const { result } = renderHook(() => useDetailSupport(defaultProps))
    await act(async () => {
      await result.current.openDetail('1')
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalled()
  })
})
