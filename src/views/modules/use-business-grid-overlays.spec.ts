import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useBusinessGridOverlays } from '@/views/modules/use-business-grid-overlays'

describe('useBusinessGridOverlays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns initial state', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    expect(result.current.attachOpen).toBe(false)
    expect(result.current.attachRecordId).toBe('')
    expect(result.current.supplierStatementOpen).toBe(false)
    expect(result.current.customerStatementOpen).toBe(false)
    expect(result.current.freightStatementOpen).toBe(false)
    expect(result.current.freightPickupOpen).toBe(false)
    expect(result.current.freightPickupRecords).toEqual([])
  })

  it('opens attachment overlay', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openAttachment({ id: '123', name: 'Test' })
    })
    expect(result.current.attachOpen).toBe(true)
    expect(result.current.attachRecordId).toBe('123')
  })

  it('closes attachment overlay', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openAttachment({ id: '123', name: 'Test' })
    })
    expect(result.current.attachOpen).toBe(true)
    act(() => {
      result.current.closeAttachment()
    })
    expect(result.current.attachOpen).toBe(false)
    expect(result.current.attachRecordId).toBe('')
  })

  it('opens supplier statement', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openSupplierStatement()
    })
    expect(result.current.supplierStatementOpen).toBe(true)
  })

  it('closes supplier statement', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openSupplierStatement()
    })
    act(() => {
      result.current.closeSupplierStatement()
    })
    expect(result.current.supplierStatementOpen).toBe(false)
  })

  it('opens customer statement', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openCustomerStatement()
    })
    expect(result.current.customerStatementOpen).toBe(true)
  })

  it('closes customer statement', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openCustomerStatement()
    })
    act(() => {
      result.current.closeCustomerStatement()
    })
    expect(result.current.customerStatementOpen).toBe(false)
  })

  it('opens freight statement', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openFreightStatement()
    })
    expect(result.current.freightStatementOpen).toBe(true)
  })

  it('closes freight statement', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openFreightStatement()
    })
    act(() => {
      result.current.closeFreightStatement()
    })
    expect(result.current.freightStatementOpen).toBe(false)
  })

  it('opens freight pickup with records', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    const records = [
      { id: '1', name: 'Record 1' },
      { id: '2', name: 'Record 2' },
    ]
    act(() => {
      result.current.openFreightPickup(records)
    })
    expect(result.current.freightPickupOpen).toBe(true)
    expect(result.current.freightPickupRecords).toEqual(records)
  })

  it('closes freight pickup', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openFreightPickup([{ id: '1', name: 'Test' }])
    })
    expect(result.current.freightPickupOpen).toBe(true)
    act(() => {
      result.current.closeFreightPickup()
    })
    expect(result.current.freightPickupOpen).toBe(false)
    expect(result.current.freightPickupRecords).toEqual([])
  })

  it('handles attachment with empty id', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    act(() => {
      result.current.openAttachment({ name: 'Test' })
    })
    expect(result.current.attachOpen).toBe(true)
    expect(result.current.attachRecordId).toBe('')
  })

  it('returns all required functions', () => {
    const { result } = renderHook(() => useBusinessGridOverlays())
    expect(typeof result.current.openAttachment).toBe('function')
    expect(typeof result.current.closeAttachment).toBe('function')
    expect(typeof result.current.openSupplierStatement).toBe('function')
    expect(typeof result.current.closeSupplierStatement).toBe('function')
    expect(typeof result.current.openCustomerStatement).toBe('function')
    expect(typeof result.current.closeCustomerStatement).toBe('function')
    expect(typeof result.current.openFreightStatement).toBe('function')
    expect(typeof result.current.closeFreightStatement).toBe('function')
    expect(typeof result.current.openFreightPickup).toBe('function')
    expect(typeof result.current.closeFreightPickup).toBe('function')
  })
})
